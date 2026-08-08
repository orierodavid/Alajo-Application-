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

    if (!groupId) {
      return NextResponse.json({ error: 'Group is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
    }

    // Use the existing transactional database functions. If a slot was
    // selected, honour it; otherwise use the automatic first-available slot
    // flow used by the original Alajo join experience.
    const rpc = slotId ? 'join_group' : 'join_group_auto'
    const args = slotId
      ? { p_group_id: groupId, p_slot_id: slotId }
      : { p_group_id: groupId }

    const { data, error } = await supabase.rpc(rpc, args)

    if (error) {
      console.error('Join group RPC error:', error)
      const message = messages[error.message] ?? messages[error.details ?? ''] ?? 'Unable to join this group right now. Please try again.'
      const status = /already|maximum|only be active|not available|not valid|taken|no available/i.test(error.message) ? 400 : 400
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ membership: data })
  } catch (error) {
    console.error('Join group API error:', error)
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json(
      { error: messages[message] ?? 'Unable to join this group right now. Please try again.' },
      { status: 400 },
    )
  }
}
