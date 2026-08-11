'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState('6')
  const [slots, setSlots] = useState('10')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, contribution_amount: Number(amount), cycle: Number(cycle), slot_count: Number(slots), start_date: startDate || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create group.')
      router.push('/admin/groups')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create group.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="p-5 sm:p-8 max-w-4xl mx-auto">
      <p className="text-xs font-bold tracking-[.2em] text-[#16a34a]">OPERATIONS</p>
      <div className="flex items-start justify-between gap-4 mt-2">
        <div><h1 className="text-3xl font-bold">Create group</h1><p className="text-gray-500 dark:text-gray-400 mt-2">Set the rules once. Alajo generates the monthly contribution schedule automatically.</p></div>
      </div>
      <form onSubmit={submit} className="mt-8 rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#102719] p-5 sm:p-8 space-y-6">
        <div className="grid sm:grid-cols-2 gap-5">
          <label className="block"><span className="text-sm font-semibold">Group name</span><input required value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="e.g. Alajo Family Circle" /></label>
          <label className="block"><span className="text-sm font-semibold">Contribution amount</span><input required min="1" step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="50000" /></label>
          <label className="block"><span className="text-sm font-semibold">Cycle</span><select value={cycle} onChange={e=>setCycle(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-4 py-3 outline-none"><option value="6">6 months</option><option value="10">10 months</option></select></label>
          <label className="block"><span className="text-sm font-semibold">Number of slots</span><select value={slots} onChange={e=>setSlots(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-4 py-3 outline-none">{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1} {i===0?'slot':'slots'}</option>)}</select></label>
          <label className="block sm:col-span-2"><span className="text-sm font-semibold">Start date</span><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-4 py-3 outline-none" /><span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">Leave blank to use the next available cycle start.</span></label>
          <label className="block sm:col-span-2"><span className="text-sm font-semibold">Description <span className="font-normal text-gray-400">(optional)</span></span><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-4 py-3 outline-none resize-none" placeholder="Briefly describe this savings group." /></label>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-4 text-sm"><p className="font-semibold">Contribution rule</p><p className="text-gray-500 dark:text-gray-400 mt-1">Every monthly contribution is due on the 1st and remains payable through the 29th.</p></div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3"><button type="button" onClick={()=>router.push('/admin/groups')} className="rounded-xl border border-gray-200 dark:border-white/15 px-5 py-3 font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Creating…' : 'Create group'}</button></div>
      </form>
    </section>
  )
}
