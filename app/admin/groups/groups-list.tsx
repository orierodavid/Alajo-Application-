'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DeleteGroupButton } from './group-actions'
import { PrivateGroupApprovalAction } from './private-group-approval-action'

const cycleLabel = (group: any) => group.finalized_member_count ? `${group.finalized_member_count} months` : group.lifecycle_managed ? '5–10 months' : group.cycle === 'ten_month' ? '10 months' : '5 months'
const dateLabel = (value: string | null) => value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : '—'

export function AdminGroupsList({ groups }: { groups: any[] }) {
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('all')

  const amounts = useMemo(() => Array.from(new Set(groups.map(group => Number(group.contribution_amount)))).sort((a,b) => a-b), [groups])
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    return groups.filter(group => {
      const matchesSearch = !query || String(group.name ?? '').toLowerCase().includes(query) || String(group.description ?? '').toLowerCase().includes(query)
      const matchesAmount = amount === 'all' || Number(group.contribution_amount) === Number(amount)
      return matchesSearch && matchesAmount
    })
  }, [groups, search, amount])

  return <>
    <div className="mt-6 rounded-2xl border border-[#244332] bg-[#0d1d13] p-4 sm:p-5">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search groups by name or description…" aria-label="Search groups" className="w-full rounded-xl border border-[#355442] bg-[#102619] px-4 py-3 text-sm text-white placeholder:text-[#7f9588] outline-none focus:border-[#39c66b]" />
        </div>
        <select value={amount} onChange={e=>setAmount(e.target.value)} aria-label="Filter groups by contribution amount" className="rounded-xl border border-[#355442] bg-[#102619] px-4 py-3 text-sm text-white outline-none focus:border-[#39c66b] md:w-56">
          <option value="all">All contribution amounts</option>
          {amounts.map(value => <option key={value} value={value}>₦{value.toLocaleString('en-NG')} / month</option>)}
        </select>
      </div>
      {(search || amount !== 'all') && <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-[#9fb3a8]">{filteredGroups.length} of {groups.length} groups shown</p><button type="button" onClick={()=>{setSearch('');setAmount('all')}} className="text-xs font-semibold text-[#61e58d] hover:text-white">Clear filters</button></div>}
    </div>

    <div className="mt-4 grid gap-4">
      {filteredGroups.length ? filteredGroups.map(group => {
        const memberCount = (group.memberCount ?? 0) as number
        const locked = ['closed','active','completed','cancelled'].includes(group.status)
        const privatePending=group.is_private&&group.approval_status==='pending'
        const full=memberCount>=Number(group.slot_count||0)
        const canDelete = true
        return <article key={group.id} className="rounded-2xl border border-[#244332] bg-[#0d1d13] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-white">{group.name}</h2><span className="rounded-full bg-[#123b22] px-2.5 py-1 text-xs font-semibold text-[#61e58d]">{privatePending ? (full ? 'Awaiting Approval' : 'Filling') : locked ? (group.status === 'closed' ? 'Closed' : group.status) : group.status}</span></div><p className="text-sm text-[#b7c7be] mt-1">{group.description || 'Structured rotational savings group.'}</p></div><div className="text-sm font-semibold text-white">₦{Number(group.contribution_amount).toLocaleString()} / month</div></div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm"><div><span className="text-[#9fb3a8] block">Cycle</span><strong className="text-white">{cycleLabel(group)}</strong></div><div><span className="text-[#9fb3a8] block">Members</span><strong className="text-white">{memberCount} / {group.lifecycle_managed ? 10 : group.slot_count}</strong></div><div><span className="text-[#9fb3a8] block">Closes</span><strong className="text-white">{group.lifecycle_managed ? dateLabel(group.close_date) : '—'}</strong></div><div><span className="text-[#9fb3a8] block">Starts</span><strong className="text-white">{dateLabel(group.start_date)}</strong></div><div><span className="text-[#9fb3a8] block">Finishes</span><strong className="text-white">{dateLabel(group.finish_date)}</strong></div></div>
          {privatePending && <div className="mt-4 rounded-xl border border-[#244332] bg-[#102619] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div className="text-xs text-[#b7c7be]">Private group · <strong className="text-white">{memberCount}/{group.slot_count}</strong> members. {full?'All slots are filled; admin approval is required before the cycle starts.':'Waiting for invited members to fill every slot.'}</div><PrivateGroupApprovalAction groupId={group.id} full={full}/></div>}{group.lifecycle_managed && <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#244332] bg-[#102619] px-4 py-3"><div className="text-xs text-[#b7c7be]">{group.finalized_member_count ? <><strong className="text-white">{group.finalized_member_count}-member cycle locked.</strong> Contributions cannot change the finalized schedule.</> : <>Users can join or leave until <strong className="text-white">{dateLabel(group.close_date)}</strong>. The group closes automatically one day before contributions start.</>}</div>{canDelete && <DeleteGroupButton groupId={group.id} />}</div>}
        </article>
      }) : <div className="rounded-2xl border border-dashed border-[#355442] bg-[#0d1d13] p-10 text-center"><p className="font-semibold text-white">No groups match your search or amount filter</p><p className="text-sm text-[#9fb3a8] mt-2">Try a different group name, description or contribution amount.</p><button type="button" onClick={()=>{setSearch('');setAmount('all')}} className="inline-flex mt-5 rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white">Clear filters</button></div>}
    </div>
  </>
}
