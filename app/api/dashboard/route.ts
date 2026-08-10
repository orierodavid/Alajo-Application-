import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const activeMembershipStatuses = ['active', 'pending']
const pendingPayoutStatuses = ['scheduled', 'eligibility_review', 'approved', 'processing', 'held']

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const userId = authData.user.id
    const [walletResult, membershipResult, payoutResult, activityResult, contributionResult] = await Promise.all([
      supabase.from('wallets').select('balance, currency').eq('user_id', userId).maybeSingle(),
      supabase.from('group_members').select('id, status, joined_at, groups(id, name, status)').eq('user_id', userId).in('status', activeMembershipStatuses),
      supabase.from('payouts').select('id, group_id, period_number, scheduled_date, expected_amount, status, paid_at, groups(name)').in('status', pendingPayoutStatuses),
      supabase.from('ledger_transactions').select('id, type, status, amount, currency, description, created_at, group_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(6),
      supabase.from('contribution_schedules').select('id, amount, due_date, status, outstanding_amount').order('due_date', { ascending: false }),
    ])

    if (walletResult.error) throw walletResult.error
    if (membershipResult.error) throw membershipResult.error
    if (payoutResult.error) throw payoutResult.error
    if (activityResult.error) throw activityResult.error
    if (contributionResult.error) throw contributionResult.error

    const memberships = membershipResult.data ?? []
    let resolvedPayouts = payoutResult.data ?? []
    if (!resolvedPayouts.length && memberships.length) {
      const membershipIds = memberships.map((m) => m.id)
      const { data, error } = await supabase.from('payouts').select('id, group_id, period_number, scheduled_date, expected_amount, status, paid_at, groups(name)').in('group_member_id', membershipIds).in('status', pendingPayoutStatuses).order('scheduled_date', { ascending: true })
      if (error) throw error
      resolvedPayouts = data ?? []
    }

    const membershipIds = memberships.map((m) => m.id)
    const { data: paidPayouts, error: paidPayoutError } = await supabase.from('payouts').select('expected_amount').in('group_member_id', membershipIds.length ? membershipIds : ['00000000-0000-0000-0000-000000000000']).eq('status', 'paid')
    if (paidPayoutError) throw paidPayoutError

    const totalPayouts = (paidPayouts ?? []).reduce((sum, p) => sum + Number(p.expected_amount ?? 0), 0)
    const contributions = contributionResult.data ?? []
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const totalContributions = contributions.reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
    const thisMonth = contributions.filter((c) => { const d = new Date(c.due_date); return d.getMonth() === month && d.getFullYear() === year }).reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
    const upcoming = contributions.filter((c) => ['pending', 'processing'].includes(c.status)).reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
    const completed = contributions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount ?? 0), 0)

    return NextResponse.json({
      authenticated: true,
      wallet: { balance: Number(walletResult.data?.balance ?? 0), currency: walletResult.data?.currency ?? 'NGN' },
      contributions: { total: totalContributions, thisMonth, upcoming, completed },
      activeGroups: memberships.length,
      totalPayouts,
      pendingPayouts: resolvedPayouts.reduce((sum, p) => sum + Number(p.expected_amount ?? 0), 0),
      groups: memberships.map((m) => { const g = Array.isArray(m.groups) ? m.groups[0] : m.groups; return { id: g?.id ?? m.id, name: g?.name ?? 'Savings Group', status: g?.status ?? m.status, joinedAt: m.joined_at } }),
      payouts: resolvedPayouts.map((p) => { const g = Array.isArray(p.groups) ? p.groups[0] : p.groups; return { id: p.id, groupName: g?.name ?? 'Savings Group', periodNumber: p.period_number, scheduledDate: p.scheduled_date, expectedAmount: Number(p.expected_amount ?? 0), status: p.status, paidAt: p.paid_at } }),
      activity: (activityResult.data ?? []).map((t) => ({ id: t.id, type: t.type, status: t.status, amount: Number(t.amount ?? 0), currency: t.currency ?? 'NGN', description: t.description ?? t.type, createdAt: t.created_at })),
    })
  } catch (error) {
    console.error('Dashboard data error:', error)
    return NextResponse.json({ authenticated: true, error: 'Unable to load dashboard data' }, { status: 500 })
  }
}
