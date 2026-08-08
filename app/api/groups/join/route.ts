import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Please log in again.',
  GROUP_NOT_FOUND: 'This group could not be found.',
  GROUP_NOT_OPEN: 'This group is no longer accepting members.',
  POSITION_TAKEN: 'That payout position was just taken. Please choose another position.',
  INVALID_POSITION: 'That payout position is not valid.',
  MAX_ACTIVE_GROUPS: 'You can only be active in 3 groups at a time.',
  ALREADY_A_MEMBER: 'You are already a member of this group.',
  'Not authenticated': 'Please log in again.',
  'Group not found': 'This group could not be found.',
  'Group is not available for joining': 'This group is no longer accepting members.',
  'You are already a member of this group': 'You are already a member of this group.',
  'You can only have 3 active groups': 'You can only be active in 3 groups at a time.',
  'Selected slot does not exist': 'That payout slot is not valid.',
  'That position has just been taken. Please choose another available position.': 'That payout position was just taken. Please choose another position.',
}

function errorMessage(error: { message?: string; details?: string } | null) {
  if (!error) return 'Unable to join this group right now. Please try again.'
  return messages[error.message ?? ''] ?? messages[error.details ?? ''] ?? 'Unable to join this group right now. Please try again.'
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const groupId = typeof body?.groupId === 'string' ? body.groupId : ''
    const slotId = typeof body?.slotId === 'string' ? body.slotId : ''

    if (!groupId) return NextResponse.json({ error: 'Group is required.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })

    if (slotId) {
      // Use the database's UUID-slot overload directly. This keeps the
      // selected slot atomic and avoids a separate group_slots read that can
      // fail under RLS or race with another member joining.
      const { data, error } = await supabase.rpc('join_group', {
        p_group_id: groupId,
        p_slot_id: slotId,
      })

      if (error) {
        console.error('Join group RPC error:', error)
        return NextResponse.json({ error: errorMessage(error) }, { status: 400 })
      }

      return NextResponse.json({ membership: data })
    }

    const { data, error } = await supabase.rpc('join_group_auto', { p_group_id: groupId })
    if (error) {
      console.error('Automatic join RPC error:', error)
      return NextResponse.json({ error: errorMessage(error) }, { status: 400 })
    }

    return NextResponse.json({ membership: data })
  } catch (error) {
    console.error('Join group API error:', error)
    return NextResponse.json({ error: 'Unable to join this group right now. Please try again.' }, { status: 400 })
  }
}
