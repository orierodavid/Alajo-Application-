import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DeleteGroupButton } from './group-actions'

export const dynamic = 'force-dynamic'

const cycleLabel = (group: any) => group.finalized_member_count ? `${group.finalized_member_count} months` : group.lifecycle_managed ? '5–10 months' : group.cycle === 'ten_month' ? '10 months' : '5 months'
const dateLabel = (value: string | null) => value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : '—'

export default async function AdminGroupsPage() {
  const supabase = await createClient()
  await supabase.rpc('finalize_due_groups')
  await supabase.rpc('activate_due_groups')
  const { data: groups } = await supabase.from('groups').select('id,name,description,cycle,contribution_amount,slot_count,start_date,close_date,finalized_member_count,finalized_at,finish_date,status,lifecycle_managed').order('created_at', { ascending: false })

  const ids = (groups ?? []).map(g => g.id)
  let counts = new Map<string, number>()
  if (ids.length) {
    const { data: members } = await supabase.from('group_members').select('group_id,status').in('group_id', ids).in('status',['active','pending'])
    counts = new Map<string, number>()
    for (const member of members ?? []) counts.set(member.group_id, (counts.get(member.group_id) ?? 0) + 1)
  }

  return <section className="p-5 sm:p-8 max-w-6xl mx-auto text-white">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div><p className="text-xs font-bold tracking-[.2em] text-[#39c66b]">OPERATIONS</p><h1 className="text-3xl font-bold mt-2 text-white">Groups</h1><p className="text-[#b7c7be] mt-2">Create, configure and manage Alajo savings groups.</p></div>
      <Link href="/admin/groups/create" className="inline-flex justify-center rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white">Create group</Link>
    </div>
    <div className="mt-8 grid gap-4">
      {groups?.length ? groups.map(group => { const memberCount = counts.get(group.id) ?? 0; const locked = ['closed','active','completed','cancelled'].includes(group.status); const canDelete = group.lifecycle_managed && ['open','full'].includes(group.status); return <article key={group.id} className="rounded-2xl border border-[#244332] bg-[#0d1d13] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-white">{group.name}</h2><span className="rounded-full bg-[#123b22] px-2.5 py-1 text-xs font-semibold text-[#61e58d]">{locked ? (group.status === 'closed' ? 'Closed' : group.status) : group.status}</span></div><p className="text-sm text-[#b7c7be] mt-1">{group.description || 'Structured rotational savings group.'}</p></div><div className="text-sm font-semibold text-white">₦{Number(group.contribution_amount).toLocaleString()} / month</div></div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm"><div><span className="text-[#9fb3a8] block">Cycle</span><strong className="text-white">{cycleLabel(group)}</strong></div><div><span className="text-[#9fb3a8] block">Members</span><strong className="text-white">{memberCount} / {group.lifecycle_managed ? 10 : group.slot_count}</strong></div><div><span className="text-[#9fb3a8] block">Closes</span><strong className="text-white">{group.lifecycle_managed ? dateLabel(group.close_date) : '—'}</strong></div><div><span className="text-[#9fb3a8] block">Starts</span><strong className="text-white">{dateLabel(group.start_date)}</strong></div><div><span className="text-[#9fb3a8] block">Finishes</span><strong className="text-white">{dateLabel(group.finish_date)}</strong></div></div>
        {group.lifecycle_managed && <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#244332] bg-[#102619] px-4 py-3"><div className="text-xs text-[#b7c7be]">{group.finalized_member_count ? <><strong className="text-white">{group.finalized_member_count}-member cycle locked.</strong> Contributions cannot change the finalized schedule.</> : <>Users can join or leave until <strong className="text-white">{dateLabel(group.close_date)}</strong>. The group closes automatically one day before contributions start.</>}</div>{canDelete ? <DeleteGroupButton groupId={group.id} /> : <span className="text-xs font-semibold text-[#82948a]">{locked ? 'Deletion locked after closure.' : ''}</span>}</div>}
      </article>}) : <div className="rounded-2xl border border-dashed border-[#355442] bg-[#0d1d13] p-10 text-center"><p className="font-semibold text-white">No groups created yet</p><p className="text-sm text-[#9fb3a8] mt-2">Create your first rotational savings group to begin filling positions.</p><Link href="/admin/groups/create" className="inline-flex mt-5 rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white">Create first group</Link></div>}
    </div>
  </section>
}
