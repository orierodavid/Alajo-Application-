import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { supabase, error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', auth.user.id).maybeSingle()
  if (role?.role !== 'admin') return { supabase, error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
  return { supabase, error: null }
}

export async function GET() {
  const { supabase, error } = await requireAdmin()
  if (error) return error
  const { data, error: rpcError } = await supabase.rpc('admin_list_payout_context')
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 })
  return NextResponse.json(data || { groups: [], members: [], payouts: [] })
}

export async function POST(request: Request) {
  try {
    const { supabase, error } = await requireAdmin()
    if (error) return error
    const body = await request.json()
    const groupId = typeof body.groupId === 'string' ? body.groupId : ''
    const groupMemberId = typeof body.groupMemberId === 'string' ? body.groupMemberId : ''
    const periodNumber = Number(body.periodNumber)
    const scheduledDate = typeof body.scheduledDate === 'string' ? body.scheduledDate : ''
    const expectedAmount = Number(body.expectedAmount)
    if (!groupId || !groupMemberId || !Number.isInteger(periodNumber) || !scheduledDate || !Number.isFinite(expectedAmount)) return NextResponse.json({ error: 'Group, beneficiary, period, scheduled date and expected amount are required.' }, { status: 400 })
    const { data, error: rpcError } = await supabase.rpc('admin_create_payout_schedule', { p_group_id: groupId, p_group_member_id: groupMemberId, p_period_number: periodNumber, p_scheduled_date: scheduledDate, p_expected_amount: expectedAmount })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    return NextResponse.json({ success: true, payout: data })
  } catch (error) {
    console.error('Admin payout schedule request error:', error)
    return NextResponse.json({ error: 'Unable to create payout schedule.' }, { status: 500 })
  }
}
