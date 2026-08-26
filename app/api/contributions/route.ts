import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ACTIVE_MEMBERSHIP_STATUSES = ['active', 'pending']
const EMPTY_ID = '00000000-0000-0000-0000-000000000000'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) return NextResponse.json({ authenticated: false }, { status: 401 })

    // Read-only endpoint: contribution lifecycle processing is performed by the
    // authenticated cron worker, never as a side effect of opening this page.
    const userId = authData.user.id
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('id, status, payout_received_at, groups(id, name, status, contribution_amount, cycle, slot_count, start_date, close_date, finalized_member_count)')
      .eq('user_id', userId)
      .in('status', ACTIVE_MEMBERSHIP_STATUSES)
    if (membershipError) throw membershipError

    const memberRows = memberships ?? []
    const membershipIds = memberRows.map((member) => member.id)
    const ids = membershipIds.length ? membershipIds : [EMPTY_ID]
    const [{ data: schedules, error: scheduleError }, { data: defaultCases, error: defaultError }] = await Promise.all([
      supabase.from('contribution_schedules').select('id, group_member_id, period_number, amount, due_date, status, outstanding_amount, total_due, delay_fee_amount, grace_until, paid_at').in('group_member_id', ids).order('due_date', { ascending: false }),
      supabase.from('default_cases').select('id,group_id,group_member_id,contribution_id,status,outstanding_amount,payout_received,grace_until,defaulted_at,deotech_covered_amount,recovered_amount,created_at,resolved_at').in('group_member_id', ids).order('created_at', { ascending: false }),
    ])
    if (scheduleError) throw scheduleError
    if (defaultError) throw defaultError

    const groupByMember = new Map(memberRows.map((member) => {
      const group = Array.isArray(member.groups) ? member.groups[0] : member.groups
      return [member.id, group]
    }))
    const casesByContribution = new Map((defaultCases ?? []).map((c: any) => [c.contribution_id, c]))

    const rows = (schedules ?? []).map((schedule) => {
      const group = groupByMember.get(schedule.group_member_id)
      const recovery = casesByContribution.get(schedule.id)
      return {
        id: schedule.id,
        groupMemberId: schedule.group_member_id,
        periodNumber: schedule.period_number,
        amount: Number(schedule.amount ?? 0),
        dueDate: schedule.due_date,
        status: schedule.status,
        outstandingAmount: Number(schedule.outstanding_amount ?? 0),
        totalDue: Number(schedule.total_due ?? schedule.amount ?? 0),
        delayFeeAmount: Number(schedule.delay_fee_amount ?? 0),
        graceUntil: schedule.grace_until,
        paidAt: schedule.paid_at,
        defaultCase: recovery ? { id: recovery.id, status: recovery.status, payoutReceived: recovery.payout_received, outstandingAmount: Number(recovery.outstanding_amount ?? 0), graceUntil: recovery.grace_until, defaultedAt: recovery.defaulted_at, deotechCoveredAmount: Number(recovery.deotech_covered_amount ?? 0), recoveredAmount: Number(recovery.recovered_amount ?? 0), resolvedAt: recovery.resolved_at } : null,
        group: group ? {
          id: group.id,
          name: group.name,
          status: group.status,
          contributionAmount: Number(group.contribution_amount ?? 0),
          cycle: group.cycle,
          slotCount: Number(group.slot_count ?? 0),
          startDate: group.start_date,
          closeDate: group.close_date,
          finalizedMemberCount: group.finalized_member_count,
        } : null,
      }
    })

    const activeRecovery = (defaultCases ?? []).filter((c: any) => ['open','recovery'].includes(c.status)).map((c: any) => ({ id: c.id, status: c.status, payoutReceived: c.payout_received, outstandingAmount: Number(c.outstanding_amount ?? 0), deotechCoveredAmount: Number(c.deotech_covered_amount ?? 0), recoveredAmount: Number(c.recovered_amount ?? 0), defaultedAt: c.defaulted_at, groupId: c.group_id }))
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const sevenDays = new Date(today); sevenDays.setDate(sevenDays.getDate() + 7); const month = now.getMonth(); const year = now.getFullYear()
    const completedStatuses = ['paid']; const missedStatuses = ['overdue', 'missed', 'late', 'defaulted']; const upcomingStatuses = ['pending', 'processing', 'due', 'grace']
    const completed = rows.filter((row) => completedStatuses.includes(row.status)); const missed = rows.filter((row) => missedStatuses.includes(row.status)); const upcoming = rows.filter((row) => { const due = new Date(row.dueDate); return upcomingStatuses.includes(row.status) && due >= today && due <= sevenDays })
    const sum = (items: typeof rows) => items.reduce((total, row) => total + row.amount, 0)
    const allScheduled = sum(rows); const completedTotal = sum(completed); const upcomingTotal = sum(upcoming); const missedTotal = sum(missed); const thisMonthTotal = sum(rows.filter((row) => { const due = new Date(row.dueDate); return due.getMonth() === month && due.getFullYear() === year })); const progress = allScheduled ? Math.min(100, Math.round((completedTotal / allScheduled) * 100)) : 0

    return NextResponse.json({ authenticated: true, rows, summary: { total: allScheduled, thisMonth: thisMonthTotal, upcoming: upcomingTotal, completed: completedTotal, missed: missedTotal, progress }, recoveryCases: activeRecovery })
  } catch (error) {
    console.error('Contributions data error:', error)
    return NextResponse.json({ authenticated: true, error: 'Unable to load contributions' }, { status: 500 })
  }
}
