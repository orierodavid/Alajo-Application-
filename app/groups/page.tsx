import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GroupsClient from './groups-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GroupsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Groups page: Supabase environment variables are missing')
    redirect('/login?error=config')
  }

  // Do not wrap redirect() in a catch block: Next.js implements redirect
  // by throwing a control-flow exception that must be allowed to escape.
  const supabase = await createClient()

  const { data: authData, error: userError } = await supabase.auth.getUser()
  if (userError || !authData.user) {
    redirect('/login?error=session')
  }

  type Group = {
    id: string
    name: string
    description: string | null
    cycle: 'six_month' | 'ten_month'
    contribution_amount: number
    slot_count: number
    start_date: string | null
    status: string
    memberCount: number
  }

  type Membership = {
    id: string
    group_id: string
    status: string
    joined_at: string
    slot_id: string
  }

  let groups: Group[] = []
  let memberships: Membership[] = []

  const { data: groupRows, error: groupsError } = await supabase
    .from('groups')
    .select('id,name,description,cycle,contribution_amount,slot_count,start_date,status')
    .in('status', ['open', 'full'])
    .order('created_at', { ascending: true })

  if (groupsError) {
    console.error('Groups page: groups query failed', {
      message: groupsError.message,
      code: groupsError.code,
      details: groupsError.details,
      hint: groupsError.hint,
    })
  } else {
    const groupIds = (groupRows ?? []).map((group) => group.id)
    let slotRows: Array<{ group_id: string; status: string }> = []

    if (groupIds.length > 0) {
      const { data, error: slotsError } = await supabase
        .from('group_slots')
        .select('group_id,status')
        .in('group_id', groupIds)

      if (slotsError) {
        console.error('Groups page: slots query failed', {
          message: slotsError.message,
          code: slotsError.code,
          details: slotsError.details,
          hint: slotsError.hint,
        })
      } else {
        slotRows = data ?? []
      }
    }

    const counts = new Map<string, number>()
    for (const slot of slotRows) {
      if (slot.status === 'assigned' || slot.status === 'reserved') {
        counts.set(slot.group_id, (counts.get(slot.group_id) ?? 0) + 1)
      }
    }

    groups = (groupRows ?? []).map((group) => ({
      ...group,
      memberCount: counts.get(group.id) ?? 0,
    })) as Group[]
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from('group_members')
    .select('id,group_id,status,joined_at,slot_id')
    .eq('user_id', authData.user.id)

  if (membershipError) {
    console.error('Groups page: memberships query failed', {
      message: membershipError.message,
      code: membershipError.code,
      details: membershipError.details,
      hint: membershipError.hint,
    })
  } else {
    memberships = (membershipRows ?? []) as Membership[]
  }

  return (
    <GroupsClient
      groups={groups}
      memberships={memberships}
      userEmail={authData.user.email ?? ''}
    />
  )
}
