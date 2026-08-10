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
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('id, status, joined_at, groups(id, name, status, contribution_amount, cycle, slot_count)')
      .eq('user_id', userId)
      .in('status', activeMembershipStatuses)

    if (membershipError) throw membershipError

    const memberRows = memberships ?? []
    const membershipIds = memberRows.map((m) => m.id)
    const emptyIds = ['00000000-0000-0000-0000-000000000000']
    const ids = membershipIds.length ? membershipIds : emptyIds

    const [walletResult, payoutResult, activityResult, contributionResult] = await Promise.all([
      supabase.from('wallets').select('balance, currency').eq('user_id', userId).maybeSingle(),
      supabase.from('payouts').select('id, group_id, group_member_id, period_number, scheduled_date, expected_amount, status, paid_at, groups(name)').in('group_member_id', ids).in('status', pendingPayoutStatuses).order('scheduled_date', { ascending: true }),
      supabase.from('ledger_transactions').select('id, type, status, amount, currency, description, created_at, group_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(6),
      supabase.from('contribution_schedules').select('id, group_member_id, period_number, amount, due_date, status, outstanding_amount, paid_at').in('group_member_id', ids).order('due_date', { ascending: true }),
    ])

    if (walletResult.error) throw walletResult.error
    if (payoutResult.error) throw payoutResult.error
    if (activityResult.error) throw activityResult.error
    if (contributionResult.error) throw contributionResult.error

    const contributions = contributionResult.data ?? []
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDays = new Date(today)
    sevenDays.setDate(sevenDays.getDate() + 7)
    const month = now.getMonth()
    const year = now.getFullYear()

    const totalContributions = contributions.reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
    const thisMonth = contributions.filter((c) => { const d = new Date(c.due_date); return d.getMonth() === month && d.getFullYear() === year }).reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
    const upcoming = contributions.filter((c) => { const d = new Date(c.due_date); return ['pending', 'processing', 'overdue'].includes(c.status) && d >= today && d <= sevenDays }).reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
    const completed = contributions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount ?? 0), 0)

    const groups = memberRows.map((m) => {
      const g = Array.isArray(m.groups) ? m.groups[0] : m.groups
      const schedules = contributions.filter((c) => c.group_member_id === m.id)
      const paidCount = schedules.filter((c) => c.status === 'paid').length
      const next = schedules.find((c) => ['pending', 'processing', 'overdue'].includes(c.status) && new Date(c.due_date) >= today)
      const cycleLength = Number(g?.slot_count ?? schedules.length ?? 0)
      return {
        id: g?.id ?? m.id,
        memberId: m.id,
        name: g?.name ?? 'Savings Group',
        status: g?.status ?? m.status,
        joinedAt: m.joined_at,
        contributionAmount: Number(g?.contribution_amount ?? schedules[0]?.amount ?? 0),
        cycleLength,
        currentPeriod: next?.period_number ?? (paidCount + 1),
        progress: cycleLength ? Math.min(100, Math.round((paidCount / cycleLength) * 100)) : 0,
        nextDueDate: next?.due_date ?? null,
        nextAmount: Number(next?.amount ?? g?.contribution_amount ?? 0),
      }
    })

    return NextResponse.json({
      authenticated: true,
      wallet: { balance: Number(walletResult.data?.balance ?? 0), currency: walletResult.data?.currency ?? 'NGN' },
      contributions: { total: totalContributions, thisMonth, upcoming, completed },
      activeGroups: memberRows.length,
      groups,
      payouts: (payoutResult.data ?? []).map((p) => { const g = Array.isArray(p.groups) ? p.groups[0] : p.groups; return { id: p.id, groupName: g?.name ?? 'Savings Group', periodNumber: p.period_number, scheduledDate: p.scheduled_date, expectedAmount: Number(p.expected_amount ?? 0), status: p.status, paidAt: p.paid_at } }),
      activity: (activityResult.data ?? []).map((t) => ({ id: t.id, type: t.type, status: t.status, amount: Number(t.amount ?? 0), currency: t.currency ?? 'NGN', description: t.description ?? t.type, createdAt: t.created_at })),
    })
  } catch (error) {
    console.error('Dashboard data error:', error)
    return NextResponse.json({ authenticated: true, error: 'Unable to load dashboard data' }, { status: 500 })
  }
}
