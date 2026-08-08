'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Group = { id: string; name: string; contribution_amount: number; cycle: string; start_date: string | null }
type Member = { id: string; group_id: string; user_id: string; status: string; name: string; email: string }

const money = (value: number) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

export default function AdminContributionsPage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<Group[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [groupId, setGroupId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [cycleMonths, setCycleMonths] = useState<6 | 10>(6)
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDay, setDueDay] = useState('1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { if (active) setError('Please sign in as an administrator.'); setLoading(false); return }
      const { data: role, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', auth.user.id).maybeSingle()
      if (roleError || !['admin', 'super_admin'].includes(role?.role || '')) { if (active) setError('Administrator access is required to create contribution schedules.'); setLoading(false); return }
      const [{ data: groupRows, error: groupError }, { data: memberRows, error: memberError }] = await Promise.all([
        supabase.from('groups').select('id,name,contribution_amount,cycle,start_date,contribution_due_day').order('name'),
        supabase.from('group_members').select('id,group_id,user_id,status').order('created_at')
      ])
      if (groupError || memberError) { if (active) setError(groupError?.message || memberError?.message || 'Unable to load groups and members.'); setLoading(false); return }
      const userIds = [...new Set((memberRows || []).map((m: any) => m.user_id))]
      const { data: profiles } = userIds.length ? await supabase.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [] as any[] }
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
      const normalized = (memberRows || []).map((m: any) => { const p = profileMap.get(m.user_id); return { ...m, name: p?.full_name || 'Member', email: p?.email || '' } })
      if (active) { setGroups(groupRows || []); setMembers(normalized); if (groupRows?.[0]) { setGroupId(groupRows[0].id); setAmount(String(groupRows[0].contribution_amount || '')); setStartDate(groupRows[0].start_date || ''); setDueDay(String(groupRows[0].contribution_due_day || 1)) } }
      setLoading(false)
    }
    load(); return () => { active = false }
  }, [])

  const selectedGroup: any = groups.find(g => g.id === groupId)
  const groupMembers = useMemo(() => members.filter(m => m.group_id === groupId && ['active', 'pending'].includes(m.status)), [members, groupId])

  function changeGroup(id: string) {
    setGroupId(id); setMemberId('')
    const group: any = groups.find(g => g.id === id)
    setAmount(group ? String(group.contribution_amount || '') : '')
    setStartDate(group?.start_date || '')
    setDueDay(String(group?.contribution_due_day || 1))
  }

  function datesForCycle() {
    if (!startDate) return [] as string[]
    const base = new Date(`${startDate}T00:00:00`)
    return Array.from({ length: cycleMonths }, (_, index) => {
      const d = new Date(base)
      d.setMonth(base.getMonth() + index)
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(Number(dueDay) || 1, lastDay))
      return d.toISOString().slice(0, 10)
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage('')
    if (!memberId || !amount || !startDate) { setError('Select a member and provide the amount and start date.'); return }
    setSaving(true)
    const value = Number(amount)
    const dueDates = datesForCycle()
    const rows = dueDates.map((date, index) => ({ group_member_id: memberId, period_number: index + 1, due_date: date, amount: value, outstanding_amount: value, status: 'pending' }))

    // A schedule may already contain some periods (for example Month 1 was
    // created during an earlier test). Only create the missing periods.
    const { data: existing, error: existingError } = await supabase
      .from('contribution_schedules')
      .select('id,period_number')
      .eq('group_member_id', memberId)
      .in('period_number', rows.map(r => r.period_number))

    if (existingError) { setError(existingError.message); setSaving(false); return }

    const existingPeriods = new Set((existing || []).map((row: any) => Number(row.period_number)))
    const missingRows = rows.filter(row => !existingPeriods.has(row.period_number))

    if (!missingRows.length) {
      setMessage(`All ${cycleMonths} periods already exist for this member. No duplicate schedules were created.`)
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('contribution_schedules').insert(missingRows)
    if (insertError) {
      setError(insertError.message)
    } else {
      const skipped = rows.length - missingRows.length
      setMessage(`${cycleMonths}-month contribution schedule is ready. Created ${missingRows.length} missing period${missingRows.length === 1 ? '' : 's'}${skipped ? ` and kept ${skipped} existing period${skipped === 1 ? '' : 's'}` : ''}.`)
    }
    setSaving(false)
  }

  if (loading) return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading admin contribution tools…</main>

  return <main className="min-h-screen bg-[#f8faf9] text-gray-900 p-5 sm:p-8"><div className="max-w-5xl mx-auto">
    <div className="mb-8"><p className="text-sm font-semibold text-[#16a34a]">ADMINISTRATION</p><h1 className="text-3xl font-bold mt-2">Create Contribution Schedule</h1><p className="text-gray-500 mt-2">The administrator-defined cycle is the source of truth for this schedule.</p></div>
    {error && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {message && <div className="mb-5 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">{message}</div>}
    <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6"><section className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-xl font-bold">Schedule details</h2><div className="mt-6 grid sm:grid-cols-2 gap-5">
        <label className="text-sm font-medium">Savings Group<select value={groupId} onChange={e => changeGroup(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 bg-white">{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label className="text-sm font-medium">Member<select value={memberId} onChange={e => setMemberId(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 bg-white"><option value="">Select member</option>{groupMembers.map(m => <option key={m.id} value={m.id}>{m.name}{m.email ? ` — ${m.email}` : ''}</option>)}</select></label>
        <label className="text-sm font-medium">Admin-defined Cycle<select value={cycleMonths} onChange={e => setCycleMonths(Number(e.target.value) as 6 | 10)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 bg-white"><option value="6">6 Months</option><option value="10">10 Months</option></select></label>
        <label className="text-sm font-medium">Contribution Amount<input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>
        <label className="text-sm font-medium">Schedule Start Date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>
        <label className="text-sm font-medium">Monthly Due Day<select value={dueDay} onChange={e => setDueDay(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 bg-white">{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1}{[1,21].includes(i+1)?'st':[2,22].includes(i+1)?'nd':[3,23].includes(i+1)?'rd':'th'}</option>)}</select></label>
      </div><button disabled={saving} className="mt-7 w-full rounded-xl bg-[#14532d] hover:bg-[#123f24] disabled:opacity-60 text-white py-3 font-semibold">{saving ? 'Generating Schedule…' : `Create ${cycleMonths}-Month Contribution Schedule`}</button>
    </section><aside className="bg-white rounded-2xl border border-gray-100 p-6 h-fit"><h3 className="font-bold text-lg">Schedule Preview</h3><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-gray-500">Group</span><span className="font-semibold text-right">{selectedGroup?.name || '—'}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Member</span><span className="font-semibold text-right">{groupMembers.find(m => m.id === memberId)?.name || '—'}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Cycle</span><span className="font-semibold">{cycleMonths} Months</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Periods</span><span className="font-semibold">{cycleMonths}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Amount / period</span><span className="font-semibold">{money(Number(amount))}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Start</span><span className="font-semibold">{startDate || '—'}</span></div><div className="pt-3 border-t border-gray-100"><p className="text-gray-500 mb-2">Generated due dates</p><div className="space-y-1 max-h-52 overflow-auto">{datesForCycle().map((date,i)=><p key={date} className="flex justify-between"><span>Month {i+1}</span><span className="font-medium">{date}</span></p>)}</div></div></div></aside></form>
  </div></main>
}
