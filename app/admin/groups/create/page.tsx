'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const response = await fetch('/api/admin/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, contribution_amount: Number(amount), start_date: startDate || undefined }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create group.')
      router.push('/admin/groups'); router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create group.') } finally { setSaving(false) }
  }

  const field = 'mt-2 w-full rounded-xl border border-white/30 bg-white/20 dark:bg-white/[.06] backdrop-blur-xl px-4 py-3 outline-none transition-all duration-200 hover:border-white/50 focus:border-[#16a34a]/60 focus:ring-2 focus:ring-[#16a34a]/20'

  return (
    <section className="p-5 sm:p-8 max-w-4xl mx-auto">
      <p className="text-xs font-bold tracking-[.2em] text-[#16a34a]">OPERATIONS</p>
      <div className="mt-2"><h1 className="text-3xl font-bold">Create group</h1><p className="text-gray-500 dark:text-gray-400 mt-2">Every group has up to 10 slots. Members may join or leave until the group closes one day before contributions start.</p></div>
      <form onSubmit={submit} className="alajo-glass mt-8 rounded-2xl p-5 sm:p-8 space-y-6">
        <div className="grid sm:grid-cols-2 gap-5">
          <label className="block"><span className="text-sm font-semibold">Group name</span><input required value={name} onChange={e=>setName(e.target.value)} className={field} placeholder="e.g. Alajo Family Circle" /></label>
          <label className="block"><span className="text-sm font-semibold">Contribution amount</span><input required min="1" step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)} className={field} placeholder="50000" /></label>
          <label className="block"><span className="text-sm font-semibold">Contribution start</span><input required type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className={field} /></label>
          <div><span className="text-sm font-semibold">Member capacity</span><div className={field+' text-sm'}>10 members maximum</div></div>
        </div>
        <div className="alajo-glass rounded-xl p-4 text-sm"><p className="font-semibold">How the cycle is determined</p><p className="text-gray-500 dark:text-gray-400 mt-1">The group must have at least 5 members when it closes. If 5–10 members remain, that final count becomes the cycle length: 5 members = 5 months, 6 = 6 months, through 10 = 10 months. The member count and schedule are then locked.</p></div>
        <label className="block"><span className="text-sm font-semibold">Description <span className="font-normal text-gray-400">(optional)</span></span><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className={field+' resize-none'} placeholder="Briefly describe this savings group." /></label>
        {error && <div className="rounded-xl border border-red-300/40 bg-red-500/10 backdrop-blur-xl p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3"><button type="button" onClick={()=>router.push('/admin/groups')} className="alajo-interactive rounded-xl border border-white/30 bg-white/10 backdrop-blur-xl px-5 py-3 font-semibold">Cancel</button><button disabled={saving} className="alajo-interactive rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white shadow-lg disabled:opacity-60">{saving ? 'Creating…' : 'Create group'}</button></div>
      </form>
    </section>
  )
}
