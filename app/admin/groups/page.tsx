import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AdminGroupsList } from './groups-list'

export const dynamic = 'force-dynamic'

export default async function AdminGroupsPage() {
  const supabase = await createClient()
  await supabase.rpc('finalize_due_groups')
  await supabase.rpc('activate_due_groups')
  const { data: groups } = await supabase.from('groups').select('id,name,description,cycle,contribution_amount,slot_count,start_date,close_date,finalized_member_count,finalized_at,finish_date,status,lifecycle_managed,is_private,approval_status,invite_token').order('created_at', { ascending: false })

  const ids = (groups ?? []).map(g => g.id)
  let counts = new Map<string, number>()
  if (ids.length) {
    const { data: members } = await supabase.from('group_members').select('group_id,status').in('group_id', ids).in('status',['active','pending'])
    for (const member of members ?? []) counts.set(member.group_id, (counts.get(member.group_id) ?? 0) + 1)
  }

  const groupsWithCounts = (groups ?? []).map(group => ({ ...group, memberCount: counts.get(group.id) ?? 0 }))

  return <section className="p-5 sm:p-8 max-w-6xl mx-auto text-white">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div><p className="text-xs font-bold tracking-[.2em] text-[#39c66b]">OPERATIONS</p><h1 className="text-3xl font-bold mt-2 text-white">Groups</h1><p className="text-[#b7c7be] mt-2">Create, configure and manage ZeePay savings groups.</p></div>
      <Link href="/admin/groups/create" className="inline-flex justify-center rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white">Create group</Link>
    </div>
    <AdminGroupsList groups={groupsWithCounts} />
  </section>
}
