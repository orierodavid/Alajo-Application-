import { createClient } from '@/lib/supabase/server'
import GroupsClient from './groups-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id,name,description,cycle,contribution_amount,slot_count,start_date,status')
    .in('status', ['open', 'full'])
    .order('created_at', { ascending: true })

  if (groupsError) console.error('Groups load error:', groupsError)

  const { data: memberships, error: membershipError } = await supabase
    .from('group_members')
    .select('id,group_id,status,joined_at,slot_id')
    .eq('user_id', user.id)

  if (membershipError) console.error('Membership load error:', membershipError)

  const groupIds = (groups ?? []).map((group) => group.id)
  const { data: slots } = groupIds.length
    ? await supabase.from('group_slots').select('group_id,status').in('group_id', groupIds)
    : { data: [] }

  const counts = new Map<string, number>()
  for (const slot of slots ?? []) {
    if (slot.status === 'assigned' || slot.status === 'reserved') counts.set(slot.group_id, (counts.get(slot.group_id) ?? 0) + 1)
  }

  return (
    <GroupsClient
      groups={(groups ?? []).map((group) => ({ ...group, memberCount: counts.get(group.id) ?? 0 }))}
      memberships={memberships ?? []}
      userEmail={user.email ?? ''}
    />
  )
}
