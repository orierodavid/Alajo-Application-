import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const [{ data: payments, error: paymentsError }, { data: payouts, error: payoutsError }, { data: wallet, error: walletError }] = await Promise.all([
      supabase.from('payments').select('id, amount, currency, provider, provider_reference, status, created_at, group_id, contribution_id').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payouts').select('id, group_id, period_number, scheduled_date, expected_amount, funded_amount, shortfall_amount, status, provider, provider_reference, paid_at, created_at, group_member_id').in('group_member_id', (await supabase.from('group_members').select('id').eq('user_id', user.id)).data?.map((m) => m.id) ?? []).order('created_at', { ascending: false }),
      supabase.from('wallets').select('balance, currency').eq('user_id', user.id).maybeSingle(),
    ])

    if (paymentsError) throw paymentsError
    if (payoutsError) throw payoutsError
    if (walletError) throw walletError

    const paymentRows = (payments ?? []).map((p) => ({
      id: p.id, type: 'contribution', amount: Number(p.amount ?? 0), currency: p.currency ?? 'NGN', status: p.status, provider: p.provider, reference: p.provider_reference, date: p.created_at, groupId: p.group_id, contributionId: p.contribution_id,
    }))
    const payoutRows = (payouts ?? []).map((p) => ({
      id: p.id, type: 'payout', amount: Number(p.expected_amount ?? 0), currency: 'NGN', status: p.status, provider: p.provider, reference: p.provider_reference, date: p.paid_at ?? p.created_at, groupId: p.group_id, contributionId: null,
    }))

    const transactions = [...paymentRows, ...payoutRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json({ authenticated: true, wallet: wallet ?? null, transactions })
  } catch (error) {
    console.error('Transactions data error:', error)
    return NextResponse.json({ authenticated: true, error: 'Unable to load transactions' }, { status: 500 })
  }
}
