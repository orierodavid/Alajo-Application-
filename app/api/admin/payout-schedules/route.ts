import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', auth.user.id).maybeSingle()
  if (role?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const [groups, members, payouts] = await Promise.all([
    supabase.from('savings_groups').select('id,name,cycle_months,contribution_kobo,capacity,status,starts_on').order('created_at', { ascending: false }),
    supabase.from('group_members').select('id,group_id,user_id,slot_id,status,joined_at').order('joined_at', { ascending: true }),
    supabase.from('payouts').select('id,group_id,group_member_id,period_number,scheduled_date,expected_amount,funded_amount,shortfall_amount,status,created_at').order('scheduled_date', { ascending: true }),
  ])

  if (groups.error) return NextResponse.json({ error: groups.error.message }, { status: 500 })
  if (members.error) return NextResponse.json({ error: members.error.message }, { status: 500 })
  if (payouts.error) return NextResponse.json({ error: payouts.error.message }, { status: 500 })

  return NextResponse.json({ groups: groups.data || [], members: members.data || [], payouts: payouts.data || [] })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', auth.user.id).maybeSingle()
    if (role?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

    const body = await request.json()
    const groupId = typeof body.groupId === 'string' ? body.groupId : ''
    const groupMemberId = typeof body.groupMemberId === 'string' ? body.groupMemberId : ''
    const periodNumber = Number(body.periodNumber)
    const scheduledDate = typeof body.scheduledDate === 'string' ? body.scheduledDate : ''
    const expectedAmount = Number(body.expectedAmount)

    if (!groupId || !groupMemberId || !Number.isInteger(periodNumber) || !scheduledDate || !Number.isFinite(expectedAmount)) {
      return NextResponse.json({ error: 'Group, beneficiary, period, scheduled date and expected amount are required.' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('admin_create_payout_schedule', {
      p_group_id: groupId,
      p_group_member_id: groupMemberId,
      p_period_number: periodNumber,
      p_scheduled_date: scheduledDate,
      p_expected_amount: expectedAmount,
    })

    if (error) {
      console.error('Admin payout schedule error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, payout: data })
  } catch (error) {
    console.error('Admin payout schedule request error:', error)
    return NextResponse.json({ error: 'Unable to create payout schedule.' }, { status: 500 })
  }
}
