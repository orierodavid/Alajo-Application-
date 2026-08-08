import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json()
    if (!groupId) return NextResponse.json({ error: 'Group is required.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })

    const { data: availableSlots, error: slotError } = await supabase
      .from('group_slots')
      .select('position')
      .eq('group_id', groupId)
      .eq('status', 'available')
      .order('position', { ascending: true })
      .limit(1)

    if (slotError || !availableSlots?.length) return NextResponse.json({ error: 'This group is full. Please choose another group.' }, { status: 400 })

    const { data, error } = await supabase.rpc('join_group', {
      p_group_id: groupId,
      p_position: availableSlots[0].position,
    })

    if (error) {
      const messages: Record<string, string> = {
        AUTH_REQUIRED: 'Please log in again.',
        GROUP_NOT_FOUND: 'This group could not be found.',
        GROUP_NOT_OPEN: 'This group is no longer accepting members.',
        INVALID_POSITION: 'That position is not valid.',
        POSITION_TAKEN: 'That position was just taken. Please try again.',
        MAX_ACTIVE_GROUPS: 'You can only be active in 3 groups at a time.',
        ALREADY_A_MEMBER: 'You are already a member of this group.',
      }
      return NextResponse.json({ error: messages[error.message] ?? error.message }, { status: 400 })
    }

    return NextResponse.json({ membership: data })
  } catch (error) {
    console.error('Join group API error:', error)
    return NextResponse.json({ error: 'Something went wrong while joining the group.' }, { status: 500 })
  }
}
