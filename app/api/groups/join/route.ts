import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json()
    if (!groupId) return NextResponse.json({ error: 'Group is required.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })

    // Position selection happens inside the SECURITY DEFINER transaction.
    // This avoids an RLS-protected client read and prevents two users from
    // being assigned the same position during concurrent joins.
    const { data, error } = await supabase.rpc('join_group_auto', {
      p_group_id: groupId,
    })

    if (error) {
      console.error('Join group RPC error:', error)
      const messages: Record<string, string> = {
        AUTH_REQUIRED: 'Please log in again.',
        GROUP_NOT_FOUND: 'This group could not be found.',
        GROUP_NOT_OPEN: 'This group is no longer accepting members.',
        POSITION_TAKEN: 'That group was just filled. Please choose another group.',
        MAX_ACTIVE_GROUPS: 'You can only be active in 3 groups at a time.',
        ALREADY_A_MEMBER: 'You are already a member of this group.',
      }
      return NextResponse.json({ error: messages[error.message] ?? 'Unable to join this group right now. Please try again.' }, { status: 400 })
    }

    return NextResponse.json({ membership: data })
  } catch (error) {
    console.error('Join group API error:', error)
    return NextResponse.json({ error: 'Something went wrong while joining the group.' }, { status: 500 })
  }
}
