import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Please log in again.',
  GROUP_NOT_FOUND: 'This group could not be found.',
  GROUP_NOT_OPEN: 'This group is no longer accepting members.',
  POSITION_TAKEN: 'That group was just filled. Please choose another position.',
  INVALID_POSITION: 'That payout position is not valid.',
  MAX_ACTIVE_GROUPS: 'You can only be active in 3 groups at a time.',
  ALREADY_A_MEMBER: 'You are already a member of this group.',
  'Group not found': 'This group could not be found.',
  'Group is not available for joining': 'This group is no longer accepting members.',
  'You are already a member of this group': 'You are already a member of this group.',
  'You can only have 3 active groups': 'You can only be active in 3 groups at a time.',
  'No available slots in this group': 'This group has no available positions.',
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const groupId = typeof body?.groupId === 'string' ? body.groupId : ''
    const slotId = typeof body?.slotId === 'string' ? body.slotId : ''

    if (!groupId) return NextResponse.json({ error: 'Group is required.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })

    if (slotId) {
      // The established database join function accepts the payout position,
      // not the group_slots UUID. Resolve the selected slot to its position
      // before calling the transactional function.
      const { data: slot, error: slotError } = await supabase
        .from('group_slots')
        .select('position,status')
        .eq('id', slotId)
        .eq('group_id', groupId)
        .maybeSingle()

      if (slotError) {
        console.error('Load selected slot error:', slotError)
        return NextResponse.json({ error: 'Unable to verify the selected payout slot.' }, { status: 400 })
      }
      if (!slot) return NextResponse.json({ error: 'That payout position is not valid.' }, { status: 400 })
      if (slot.status !== 'available') return NextResponse.json({ error: 'That group was just filled. Please choose another position.' }, { status: 400 })

      const { data, error } = await supabase.rpc('join_group', {
        p_group_id: groupId,
        p_position: slot.position,
      })

      if (error) {
        console.error('Join group RPC error:', error)
        const message = messages[error.message] ?? messages[error.details ?? ''] ?? 'Unable to join this group right now. Please try again.'
        return NextResponse.json({ error: message }, { status: 400 })
      }

      return NextResponse.json({ membership: data })
    }

    const { data, error } = await supabase.rpc('join_group_auto', { p_group_id: groupId })
    if (error) {
      console.error('Automatic join RPC error:', error)
      const message = messages[error.message] ?? messages[error.details ?? ''] ?? 'Unable to join this group right now. Please try again.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ membership: data })
  } catch (error) {
    console.error('Join group API error:', error)
    return NextResponse.json({ error: 'Unable to join this group right now. Please try again.' }, { status: 400 })
  }
}
