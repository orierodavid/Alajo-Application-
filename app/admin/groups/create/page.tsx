'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [launchDate, setLaunchDate] = useState('')
  const [cycle, setCycle] = useState<'five_month'|'ten_month'>('five_month')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const schedule = useMemo(() => {
    if (!launchDate) return null
    const d = new Date(`${launchDate}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return null
    const months = cycle === 'five_month' ? 5 : 10
    const finish = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 0))
    const joinClose = new Date(d.getTime() - 86400000)
    const valid = d.getUTCDate() === 1 && finish.getUTCFullYear() === d.getUTCFullYear()
    return { months, finish, joinClose, valid }
  }, [launchDate, cycle])

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!schedule?.valid) { setError('Choose a launch date on the 1st that allows the full cycle to finish in the same calendar year.'); return }
    setSaving(true)
    try {
      const response = await fetch('/api/admin/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, contribution_amount: Number(amount), launch_date: launchDate, cycle }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create group.')
      router.push('/admin/groups'); router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create group.') } finally { setSaving(false) }
  }

  const field = 'mt-2 w-full rounded-xl border border-white/30 bg-white/20 dark:bg-white/[.06] backdrop-blur-xl px-4 py-3 outline-none transition-all duration-200 hover:border-white/50 focus:border-[#16a34a]/60 focus:ring-2 focus:ring-[#16a34a]/20'
  const fmt=(d:Date)=>d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})

  return <section className="p-5 sm:p-8 max-w-4xl mx-auto">
    <p className="text-xs font-bold tracking-[.2em] text-[#16a34a]">OPERATIONS</p>
    <div className="mt-2"><h1 className="text-3xl font-bold">Create group</h1><p className="text-gray-500 dark:text-gray-400 mt-2">Set the original cycle and launch date. Users choose available slots until joining closes one day before launch.</p></div>
    <form onSubmit={submit} className="alajo-glass mt-8 rounded-2xl p-5 sm:p-8 space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="block"><span className="text-sm font-semibold">Group name</span><input required value={name} onChange={e=>setName(e.target.value)} className={field} placeholder="e.g. ZeePay July Circle" /></label>
        <label className="block"><span className="text-sm font-semibold">Contribution amount</span><input required min="1" step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)} className={field} placeholder="50000" /></label>
        <label className="block"><span className="text-sm font-semibold">Original cycle</span><select value={cycle} onChange={e=>setCycle(e.target.value as 'five_month'|'ten_month')} className={field}><option value="five_month">5 months · 5 slots required</option><option value="ten_month">10 months · up to 10 slots</option></select></label>
        <label className="block"><span className="text-sm font-semibold">Launch date</span><input required type="date" value={launchDate} onChange={e=>setLaunchDate(e.target.value)} className={field} /></label>
      </div>
      <div className="alajo-glass rounded-xl p-4 text-sm space-y-1"><p className="font-semibold">Group schedule</p>{schedule ? <><p className={schedule.valid?'text-gray-500 dark:text-gray-400':'text-red-600'}>{schedule.valid?'Valid schedule':'Invalid schedule — groups launch on the 1st and must finish within the same calendar year.'}</p><p>Joining closes: <strong>{fmt(schedule.joinClose)}</strong></p><p>Slots at launch: <strong>{cycle==='five_month'?'5 required':'up to 10, remappable downward after closure'}</strong></p><p>Final contribution closes: <strong>{fmt(schedule.finish)}</strong> (monthly contribution window: 1st–29th)</p></> : <p className="text-gray-500 dark:text-gray-400">Choose a launch date to calculate the joining deadline and final contribution date.</p>}</div>
      <div className="alajo-glass rounded-xl p-4 text-sm"><p className="font-semibold">Finalization rule</p><p className="text-gray-500 dark:text-gray-400 mt-1">5-month groups require all 5 selected slots to be valid at closure. Otherwise the group is cancelled and members are released. 10-month groups preserve selected slots and may remap downward to the final viable member count before launch.</p></div>
      <label className="block"><span className="text-sm font-semibold">Description <span className="font-normal text-gray-400">(optional)</span></span><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className={field+' resize-none'} placeholder="Briefly describe this savings group." /></label>
      {error && <div className="rounded-xl border border-red-300/40 bg-red-500/10 backdrop-blur-xl p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3"><button type="button" onClick={()=>router.push('/admin/groups')} className="alajo-interactive rounded-xl border border-white/30 bg-white/10 backdrop-blur-xl px-5 py-3 font-semibold">Cancel</button><button disabled={saving} className="alajo-interactive rounded-xl bg-[#16a34a] px-5 py-3 font-semibold text-white shadow-lg disabled:opacity-60">{saving ? 'Creating…' : 'Create group'}</button></div>
    </form>
  </section>
}
