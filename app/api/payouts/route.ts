import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EMPTY_ID = '00000000-0000-0000-0000-000000000000'

async function getAuthedClient() {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { supabase, user: null }
  return { supabase, user: authData.user }
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedClient()
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('id, group_id, status, slot_id, groups(id, name, cycle, contribution_amount)')
      .eq('user_id', user.id)
    if (membershipError) throw membershipError

    const membershipIds = (memberships ?? []).map((m) => m.id)
    const ids = membershipIds.length ? membershipIds : [EMPTY_ID]
    const { data: payouts, error: payoutError } = await supabase
      .from('payouts')
      .select('id, group_id, group_member_id, period_number, scheduled_date, expected_amount, funded_amount, shortfall_amount, status, provider, provider_reference, paid_at, failure_reason, created_at, updated_at')
      .in('group_member_id', ids)
      .order('scheduled_date', { ascending: true })
    if (payoutError) throw payoutError

    const groupByMember = new Map((memberships ?? []).map((member) => {
      const group = Array.isArray(member.groups) ? member.groups[0] : member.groups
      return [member.id, group]
    }))

    const rows = (payouts ?? []).map((payout) => {
      const group = groupByMember.get(payout.group_member_id)
      return {
        id: payout.id, groupId: payout.group_id, groupMemberId: payout.group_member_id,
        periodNumber: payout.period_number, scheduledDate: payout.scheduled_date,
        expectedAmount: Number(payout.expected_amount ?? 0), fundedAmount: Number(payout.funded_amount ?? 0),
        shortfallAmount: Number(payout.shortfall_amount ?? 0), status: payout.status,
        provider: payout.provider, providerReference: payout.provider_reference, paidAt: payout.paid_at,
        failureReason: payout.failure_reason, createdAt: payout.created_at, updatedAt: payout.updated_at,
        group: group ? { id: group.id, name: group.name, cycle: group.cycle, contributionAmount: Number(group.contribution_amount ?? 0) } : null,
      }
    })

    const paidStatuses = ['paid', 'completed', 'successful']
    const pendingStatuses = ['pending', 'processing', 'scheduled']
    const failedStatuses = ['failed', 'reversed', 'cancelled']
    const paid = rows.filter((r) => paidStatuses.includes(r.status))
    const pending = rows.filter((r) => pendingStatuses.includes(r.status))
    const failed = rows.filter((r) => failedStatuses.includes(r.status))
    const totalExpected = rows.reduce((sum, r) => sum + r.expectedAmount, 0)
    const totalReceived = paid.reduce((sum, r) => sum + r.fundedAmount, 0)
    const next = pending.find((r) => new Date(r.scheduledDate) >= new Date(new Date().setHours(0, 0, 0, 0))) ?? null

    return NextResponse.json({ authenticated: true, rows, summary: {
      totalExpected, totalReceived,
      pendingExpected: pending.reduce((sum, r) => sum + r.expectedAmount, 0),
      failedCount: failed.length, paidCount: paid.length, pendingCount: pending.length,
    }, next })
  } catch (error) {
    console.error('Payouts data error:', error)
    return NextResponse.json({ authenticated: true, error: 'Unable to load payouts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthedClient()
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
    const payoutId = typeof body === 'object' && body !== null && 'payoutId' in body
      ? (body as { payoutId?: unknown }).payoutId : null
    if (typeof payoutId !== 'string' || !payoutId) return NextResponse.json({ error: 'Payout ID is required.' }, { status: 400 })

    const { data, error } = await supabase.rpc('settle_payout', { p_payout_id: payoutId })
    if (error) {
      const message = String(error.message || 'Payout could not be settled.')
      const status = message.includes('ADMIN_REQUIRED') ? 403 : message.includes('NOT_FOUND') ? 404 : 400
      return NextResponse.json({ success: false, error: message }, { status })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Payout settlement error:', error)
    return NextResponse.json({ success: false, error: 'Payout could not be settled.' }, { status: 500 })
  }
}
