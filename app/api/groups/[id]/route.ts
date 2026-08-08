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
    if (userError || !user) {
      return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id,name,description,cycle,contribution_amount,slot_count,start_date,status')
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

    return NextResponse.json({ group, slots: slots ?? [] })
  } catch (error) {
    console.error('Group details API error:', error)
    return NextResponse.json({ error: 'Something went wrong while loading the group.' }, { status: 500 })
  }
}
