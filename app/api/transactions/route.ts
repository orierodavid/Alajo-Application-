import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })
    const [{ data: ledger, error: ledgerError }, { data: payments, error: paymentsError }] = await Promise.all([
      supabase.from('ledger_transactions').select('id,type,status,amount,currency,payment_id,payout_id,description,created_at,group_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('payments').select('id,amount,currency,provider,provider_reference,status,created_at,group_id,contribution_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    ])
    if (ledgerError) throw ledgerError
    if (paymentsError) throw paymentsError
    const settledPaymentIds = new Set((ledger ?? []).map(t => t.payment_id).filter(Boolean))
    const ledgerRows = (ledger ?? []).map(t => ({ id: t.id, type: String(t.type), amount: Number(t.amount ?? 0), currency: t.currency ?? 'NGN', status: String(t.status), provider: null, reference: null, date: t.created_at, groupId: t.group_id, contributionId: null, description: t.description ?? String(t.type), source: 'ledger' }))
    const pendingRows = (payments ?? []).filter(p => !settledPaymentIds.has(p.id)).map(p => ({ id: p.id, type: p.contribution_id ? 'contribution' : 'wallet_funding', amount: Number(p.amount ?? 0), currency: p.currency ?? 'NGN', status: String(p.status), provider: p.provider, reference: p.provider_reference, date: p.created_at, groupId: p.group_id, contributionId: p.contribution_id, description: p.contribution_id ? 'Contribution payment' : 'Wallet funding', source: 'payment' }))
    const transactions = [...ledgerRows, ...pendingRows].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
    return NextResponse.json({ authenticated: true, transactions })
  } catch (error) {
    console.error('Transactions data error:', error)
    return NextResponse.json({ authenticated: true, error: 'Unable to load transactions' }, { status: 500 })
  }
}
