'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Contribution = { id: string; group_member_id: string; period_number: number; due_date: string; amount: number; service_fee_amount: number; delay_fee_amount: number; total_due: number; outstanding_amount: number; status: string; paid_at: string | null }
type Member = { id: string; group_id: string; user_id: string; name: string; email: string }
type Group = { id: string; name: string }

const tabs = ['All', 'Pending', 'Processing', 'Paid', 'Failed', 'Missed'] as const
type Tab = typeof tabs[number]
const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

function normalStatus(status: string, dueDate: string) {
  const s = String(status || '').toLowerCase()
  if (['paid', 'completed', 'success', 'successful'].includes(s)) return 'paid'
  if (['processing', 'in_progress'].includes(s)) return 'processing'
  if (['failed', 'error'].includes(s)) return 'failed'
  if (dueDate && new Date(`${dueDate}T23:59:59`) < new Date() && !['paid','completed','successful'].includes(s)) return 'missed'
  return 'pending'
}

export default function AdminContributionsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<Contribution[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Please sign in as an administrator.')
      const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', auth.user.id).maybeSingle()
      if (!['admin', 'super_admin'].includes(role?.role || '')) throw new Error('Administrator access is required.')

      const [{ data: contributionRows, error: contributionError }, { data: memberRows, error: memberError }, { data: groupRows, error: groupError }] = await Promise.all([
        supabase.from('contribution_schedules').select('id,group_member_id,period_number,due_date,amount,service_fee_amount,delay_fee_amount,total_due,outstanding_amount,status,paid_at').order('due_date', { ascending: false }),
        supabase.from('group_members').select('id,group_id,user_id').order('created_at'),
        supabase.from('groups').select('id,name').order('name')
      ])
      if (contributionError || memberError || groupError) throw new Error(contributionError?.message || memberError?.message || groupError?.message || 'Unable to load contributions.')

      const userIds = [...new Set((memberRows || []).map((m: any) => m.user_id))]
      const { data: profiles, error: profilesError } = userIds.length ? await supabase.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [], error: null }
      if (profilesError) throw new Error(profilesError.message)
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
      const normalizedMembers = (memberRows || []).map((m: any) => { const p = profileMap.get(m.user_id); return { ...m, name: p?.full_name || 'Member', email: p?.email || '' } })
      setRows((contributionRows || []) as Contribution[]); setMembers(normalizedMembers); setGroups((groupRows || []) as Group[])
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load contributions.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const groupMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups])
  const filtered = useMemo(() => rows.filter(r => {
    const status = normalStatus(r.status, r.due_date)
    const member = memberMap.get(r.group_member_id)
    const group = member ? groupMap.get(member.group_id) : undefined
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || member?.name?.toLowerCase().includes(q) || member?.email?.toLowerCase().includes(q) || group?.name?.toLowerCase().includes(q)
    return (tab === 'All' || status === tab.toLowerCase()) && matchesSearch
  }), [rows, memberMap, groupMap, tab, search])
  const count = (name: Tab) => rows.filter(r => name === 'All' || normalStatus(r.status, r.due_date) === name.toLowerCase()).length

  const statusClass = (status: string) => status === 'paid' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : status === 'failed' || status === 'missed' ? 'bg-red-500/15 text-red-700 dark:text-red-300' : status === 'processing' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-white/30 dark:bg-white/10 text-gray-700 dark:text-gray-200'

  return <main className="min-h-screen bg-gradient-to-br from-[#f5faf7] via-[#eef8f1] to-[#e8f5ec] dark:from-[#06130b] dark:via-[#081a10] dark:to-[#0a2115] text-gray-900 dark:text-gray-100 p-5 sm:p-8 lg:p-10">
    <div className="max-w-[1500px] mx-auto">
      <div className="mb-7"><p className="text-sm font-semibold text-[#16a34a] tracking-[.16em]">ADMINISTRATION</p><h1 className="text-3xl font-bold mt-1">Contributions</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Monitor every member contribution. Schedules are generated automatically from the group cycle.</p></div>
      <div className="flex flex-col lg:flex-row gap-3 mb-5 lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{tabs.map(name => <button key={name} onClick={() => setTab(name)} className={`rounded-xl border border-white/50 dark:border-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition duration-200 hover:-translate-y-0.5 active:scale-95 ${tab === name ? 'bg-[#16a34a]/20 text-[#15803d] dark:text-[#86efac] shadow-[0_8px_25px_rgba(22,163,74,.12)]' : 'bg-white/30 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300'}`}>{name} <span className="ml-1 opacity-60">{count(name)}</span></button>)}</div><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user or group…" className="w-full lg:w-72 rounded-xl border border-white/50 dark:border-white/15 bg-white/35 dark:bg-white/[0.06] backdrop-blur-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#16a34a]/30" /></div>
      {error && <div className="mb-5 rounded-xl border border-red-200/60 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 backdrop-blur p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-white/50 dark:border-white/15 bg-white/45 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_15px_45px_rgba(0,0,0,.07)]"><div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-sm"><thead className="bg-white/30 dark:bg-white/[0.06] border-b border-white/50 dark:border-white/15"><tr>{['User','Group','Period','Amount','Service fee','Delay fee','Total due','Due date','Outstanding','Status','Paid'].map(h => <th key={h} className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/40 dark:divide-white/10">{loading ? <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-500">Loading contributions…</td></tr> : filtered.length === 0 ? <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No contributions in this view.</td></tr> : filtered.map(r => { const member = memberMap.get(r.group_member_id); const group = member ? groupMap.get(member.group_id) : undefined; const status = normalStatus(r.status, r.due_date); return <tr key={r.id} className="transition duration-150 hover:bg-white/35 dark:hover:bg-white/[0.05]"><td className="px-4 py-4"><p className="font-semibold">{member?.name || 'Member'}</p><p className="text-xs text-gray-500 dark:text-gray-400">{member?.email || '—'}</p></td><td className="px-4 py-4">{group?.name || 'Savings group'}</td><td className="px-4 py-4">{r.period_number}</td><td className="px-4 py-4 font-medium whitespace-nowrap">{money(r.amount)}</td><td className="px-4 py-4 whitespace-nowrap">{money(r.service_fee_amount)}</td><td className="px-4 py-4 whitespace-nowrap">{money(r.delay_fee_amount)}</td><td className="px-4 py-4 font-semibold whitespace-nowrap">{money(r.total_due || Number(r.amount) + Number(r.service_fee_amount || 0) + Number(r.delay_fee_amount || 0))}</td><td className="px-4 py-4 whitespace-nowrap">{r.due_date}</td><td className="px-4 py-4 whitespace-nowrap">{money(r.outstanding_amount)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}>{status}</span></td><td className="px-4 py-4 whitespace-nowrap">{r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-NG') : '—'}</td></tr>})}</tbody></table></div></div>
    </div>
  </main>
}
