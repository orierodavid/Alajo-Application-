import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminGroupsPage() {
  const supabase = await createClient()
  const { data: groups } = await supabase.from('groups').select('id,name,description,cycle,contribution_amount,slot_count,start_date,finish_date,status').order('created_at', { ascending: false })

  return <section className="p-5 sm:p-8 max-w-6xl mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div><p className="text-xs font-bold tracking-[.2em] text-[#16a34a]">OPERATIONS</p><h1 className="text-3xl font-bold mt-2">Groups</h1><p className="text-gray-500 dark:text-gray-400 mt-2">Create, configure and manage Alajo savings groups.</p></div>
      <Link href="/admin/groups/create" className="inline-flex justify-center rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white">Create group</Link>
    </div>
    <div className="mt-8 grid gap-4">
      {groups?.length ? groups.map(group => <article key={group.id} className="rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#102719] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{group.name}</h2><span className="rounded-full bg-green-50 dark:bg-green-950/40 px-2.5 py-1 text-xs font-semibold text-[#16a34a]">{group.status}</span></div><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description || 'Structured rotational savings group.'}</p></div><div className="text-sm font-semibold">₦{Number(group.contribution_amount).toLocaleString()} / month</div></div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><span className="text-gray-400 block">Cycle</span><strong>{group.cycle === 'six_month' ? '6 months' : '10 months'}</strong></div><div><span className="text-gray-400 block">Slots</span><strong>{group.slot_count}</strong></div><div><span className="text-gray-400 block">Starts</span><strong>{group.start_date || '—'}</strong></div><div><span className="text-gray-400 block">Finishes</span><strong>{group.finish_date || '—'}</strong></div></div>
      </article>) : <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 bg-white dark:bg-[#102719] p-10 text-center"><p className="font-semibold">No groups created yet</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Create your first rotational savings group to begin filling positions.</p><Link href="/admin/groups/create" className="inline-flex mt-5 rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white">Create first group</Link></div>}
    </div>
  </section>
}
