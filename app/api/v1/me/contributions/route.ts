import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ authenticated: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 403 })

    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('id, status, groups(id, name, status, contribution_amount, cycle, slot_count, start_date, close_date, finalized_member_count)')
      .eq('user_id', user.id)
      .in('status', ['active', 'pending'])
    if (membershipError) throw membershipError

    const ids = memberships?.map((m) => m.id) ?? []
    if (!ids.length) return NextResponse.json({ authenticated: true, rows: [], summary: { total: 0, thisMonth: 0, upcoming: 0, completed: 0, missed: 0, progress: 0 } })

    const { data: schedules, error } = await supabase
      .from('contribution_schedules')
      .select('id, group_member_id, period_number, amount, due_date, status, outstanding_amount, total_due, delay_fee_amount, grace_until, paid_at')
      .in('group_member_id', ids)
      .order('due_date', { ascending: false })
    if (error) throw error

    const groupByMember = new Map(memberships.map((m) => [m.id, Array.isArray(m.groups) ? m.groups[0] : m.groups]))
    const rows = (schedules ?? []).map((s) => {
      const g = groupByMember.get(s.group_member_id) as any
      return { id: s.id, groupMemberId: s.group_member_id, periodNumber: s.period_number, amount: Number(s.amount ?? 0), dueDate: s.due_date, status: s.status, outstandingAmount: Number(s.outstanding_amount ?? 0), totalDue: Number(s.total_due ?? s.amount ?? 0), delayFeeAmount: Number(s.delay_fee_amount ?? 0), graceUntil: s.grace_until, paidAt: s.paid_at, group: g ? { id: g.id, name: g.name, status: g.status, contributionAmount: Number(g.contribution_amount ?? 0), cycle: g.cycle, slotCount: Number(g.slot_count ?? 0), startDate: g.start_date, closeDate: g.close_date, finalizedMemberCount: g.finalized_member_count } : null }
    })

    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const sevenDays = new Date(today); sevenDays.setDate(sevenDays.getDate() + 7)
    const sum = (items: typeof rows) => items.reduce((t, r) => t + r.amount, 0)
    const completed = rows.filter((r) => r.status === 'paid')
    const upcoming = rows.filter((r) => ['pending','processing','due','grace'].includes(r.status) && new Date(r.dueDate) >= today && new Date(r.dueDate) <= sevenDays)
    const missed = rows.filter((r) => ['overdue','missed','late','defaulted'].includes(r.status))
    const thisMonth = rows.filter((r) => { const d = new Date(r.dueDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    const total = sum(rows); const completedTotal = sum(completed)
    return NextResponse.json({ authenticated: true, rows, summary: { total, thisMonth: sum(thisMonth), upcoming: sum(upcoming), completed: completedTotal, missed: sum(missed), progress: total ? Math.min(100, Math.round(completedTotal / total * 100)) : 0 } })
  } catch (error) {
    console.error('ZeePay contributions API error:', error)
    return NextResponse.json({ error: 'Unable to load contributions.' }, { status: 500 })
  }
}
