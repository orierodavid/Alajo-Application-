import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Group is required.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })

    await supabase.rpc('finalize_due_groups')
    await supabase.rpc('activate_due_groups')

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id,name,description,cycle,contribution_amount,slot_count,start_date,close_date,finalized_member_count,finalized_at,finish_date,status,lifecycle_managed')
      .eq('id', id)
      .maybeSingle()

    if (groupError) {
      console.error('Load group error:', groupError)
      return NextResponse.json({ error: 'Unable to load this group.' }, { status: 500 })
    }
    if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 })

    const { data: slots, error: slotsError } = await supabase
      .from('group_slots')
      .select('id,position,status')
      .eq('group_id', id)
      .order('position', { ascending: true })

    if (slotsError) {
      console.error('Load group slots error:', slotsError)
      return NextResponse.json({ error: 'Unable to load group slots.' }, { status: 500 })
    }

    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('slot_id,user_id,status,payout_position')
      .eq('group_id', id)
      .in('status', ['active', 'pending'])

    if (membersError) {
      console.error('Load group members error:', membersError)
      return NextResponse.json({ error: 'Unable to load group members.' }, { status: 500 })
    }

    const memberBySlot = new Map((members ?? []).map((member) => [member.slot_id, member]))
    const enrichedSlots = (slots ?? []).map((slot) => {
      const member = memberBySlot.get(slot.id)
      return {
        ...slot,
        payoutPosition: member?.payout_position ?? null,
        payoutMonth: member?.payout_position ?? null,
      }
    })

    return NextResponse.json({ group, slots: enrichedSlots })
  } catch (error) {
    console.error('Group details API error:', error)
    return NextResponse.json({ error: 'Something went wrong while loading the group.' }, { status: 500 })
  }
}
