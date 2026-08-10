'use client'

import { useEffect, useMemo, useState } from 'react'

const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

type Group = { id: string; name: string; cycle_months: number; contribution_kobo: number; capacity: number; status: string; starts_on: string | null }
type Member = { id: string; group_id: string; user_id: string; slot_id: string; status: string }
type Payout = { id: string; group_id: string; group_member_id: string; period_number: number; scheduled_date: string; expected_amount: number; funded_amount: number; shortfall_amount: number; status: string }

export default function AdminPayoutsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [groupId, setGroupId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [period, setPeriod] = useState('1')
  const [scheduledDate, setScheduledDate] = useState('')
  const [expectedAmount, setExpectedAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true); setError('')
    const response = await fetch('/api/admin/payout-schedules', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) { setError(data.error || 'Unable to load payout schedules.'); setLoading(false); return }
    setGroups(data.groups || []); setMembers(data.members || []); setPayouts(data.payouts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedGroup = groups.find(g => g.id === groupId)
  const groupMembers = useMemo(() => members.filter(m => m.group_id === groupId && ['active', 'pending'].includes(m.status)), [members, groupId])

  useEffect(() => {
    setMemberId('')
    if (selectedGroup) setExpectedAmount(String(Number(selectedGroup.contribution_kobo || 0) / 100 * Number(selectedGroup.capacity || 0)))
    else setExpectedAmount('')
  }, [groupId, selectedGroup])

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const response = await fetch('/api/admin/payout-schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, groupMemberId: memberId, periodNumber: Number(period), scheduledDate, expectedAmount: Number(expectedAmount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create payout schedule.')
      setSuccess('Payout schedule created successfully.')
      await load()
    } catch (e: any) { setError(e.message || 'Unable to create payout schedule.') }
    finally { setSaving(false) }
  }

  return <main className="min-h-screen bg-[#f8faf9] dark:bg-[#08170e] text-gray-900 dark:text-gray-100 p-5 sm:p-8 lg:p-10">
    <div className="max-w-7xl mx-auto">
      <div className="mb-8"><p className="text-sm font-semibold text-[#16a34a]">ADMINISTRATION</p><h1 className="text-3xl font-bold mt-1">Payout Schedules</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Create and manage the authoritative payout schedule. User-facing pages never recalculate these values.</p></div>
      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <form onSubmit={createSchedule} className="rounded-2xl bg-white dark:bg-[#102719] border border-gray-200 dark:border-white/20 p-6 shadow-sm h-fit">
          <h2 className="font-bold text-lg">Create payout schedule</h2><p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">Only administrators can create or replace an unpaid schedule.</p>
          <label className="block text-sm font-semibold mb-2">Savings group</label><select required value={groupId} onChange={e => setGroupId(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0d2115] px-3 py-3 text-sm mb-4"><option value="">Select group</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <label className="block text-sm font-semibold mb-2">Beneficiary</label><select required value={memberId} onChange={e => setMemberId(e.target.value)} disabled={!groupId} className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0d2115] px-3 py-3 text-sm mb-4"><option value="">Select member / slot</option>{groupMembers.map(m => <option key={m.id} value={m.id}>Slot {m.slot_id.slice(0, 8)} · {m.user_id.slice(0, 8)}</option>)}</select>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-semibold mb-2">Period</label><input required min="1" max={selectedGroup?.cycle_months || 120} type="number" value={period} onChange={e => setPeriod(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0d2115] px-3 py-3 text-sm" /></div><div><label className="block text-sm font-semibold mb-2">Scheduled date</label><input required type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0d2115] px-3 py-3 text-sm" /></div></div>
          <label className="block text-sm font-semibold mt-4 mb-2">Expected payout (₦)</label><input required min="0.01" step="0.01" type="number" value={expectedAmount} onChange={e => setExpectedAmount(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0d2115] px-3 py-3 text-sm" />
          {selectedGroup && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Group cycle: {selectedGroup.cycle_months} months · capacity: {selectedGroup.capacity}</p>}
          {error && <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}{success && <div className="mt-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 p-3 text-sm text-green-700 dark:text-green-300">{success}</div>}
          <button disabled={saving || loading} className="mt-5 w-full rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white py-3 font-semibold disabled:opacity-50">{saving ? 'Creating…' : 'Create payout schedule'}</button>
        </form>
        <section className="rounded-2xl bg-white dark:bg-[#102719] border border-gray-200 dark:border-white/20 p-6 shadow-sm overflow-hidden"><div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="font-bold text-lg">Authoritative schedules</h2><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">These dates and amounts are the source of truth for users.</p></div><span className="rounded-full bg-gray-100 dark:bg-white/10 px-3 py-1 text-xs font-semibold">{payouts.length} schedules</span></div>{loading ? <p className="text-sm text-gray-500">Loading…</p> : payouts.length === 0 ? <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/15 p-8 text-center text-sm text-gray-500">No payout schedules have been created yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-white/10"><th className="py-3 pr-4">Period</th><th className="py-3 pr-4">Scheduled</th><th className="py-3 pr-4">Expected</th><th className="py-3 pr-4">Funded</th><th className="py-3">Status</th></tr></thead><tbody>{payouts.map(p => <tr key={p.id} className="border-b border-gray-50 dark:border-white/5"><td className="py-4 pr-4 font-semibold">{p.period_number}</td><td className="py-4 pr-4">{p.scheduled_date}</td><td className="py-4 pr-4">{money(p.expected_amount)}</td><td className="py-4 pr-4">{money(p.funded_amount)}</td><td className="py-4"><span className="capitalize">{p.status}</span></td></tr>)}</tbody></table></div>}</section>
      </div>
    </div>
  </main>
}
