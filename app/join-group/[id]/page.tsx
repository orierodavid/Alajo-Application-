'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function Icon({ name, size = 18 }: { name: 'users' | 'check' | 'arrow' | 'info'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'users') return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  if (name === 'check') return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
  return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>
}

type Group = { id: string; name: string; description: string | null; cycle: string; contribution_amount: number; slot_count: number; start_date: string | null; status: string }
type Slot = { id: string; position: number; status: string }
const money = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
const cycleLabel = (v: string) => v === 'ten_month' ? '10 Months' : '6 Months'

export default function JoinGroupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      const supabase = createClient()
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) { router.replace('/login?error=session'); return }
        const [{ data: g, error: ge }, { data: s, error: se }] = await Promise.all([
          supabase.from('groups').select('id,name,description,cycle,contribution_amount,slot_count,start_date,status').eq('id', id).single(),
          supabase.from('group_slots').select('id,position,status').eq('group_id', id).order('position', { ascending: true }),
        ])
        if (ge) throw new Error(ge.message)
        if (se) throw new Error(se.message)
        if (alive) { setGroup(g); setSlots(s ?? []) }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Unable to load this group.') }
      finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [id, router])

  const available = useMemo(() => slots.filter(s => s.status === 'available'), [slots])
  const chosen = slots.find(s => s.id === selectedId)
  const payout = group ? Number(group.contribution_amount) * Number(group.slot_count) : 0

  async function join() {
    if (!group || !chosen || !agreed) return
    setJoining(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase.rpc('join_group', { p_group_id: group.id, p_slot_id: chosen.id })
    if (e) {
      setError(e.message)
      const { data } = await supabase.from('group_slots').select('id,position,status').eq('group_id', group.id).order('position', { ascending: true })
      setSlots(data ?? []); setSelectedId(''); setJoining(false); return
    }
    router.push(`/join-group-success?group=${group.id}&slot=${chosen.position}`)
  }

  if (loading) return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-sm text-gray-500">Loading group…</p></main>
  if (!group) return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><div className="bg-white rounded-2xl border p-7 max-w-md w-full"><h1 className="font-bold text-xl">Unable to load group</h1><p className="text-sm text-gray-500 mt-2">{error || 'This group could not be found.'}</p><Link href="/groups" className="inline-block mt-5 text-[#14532d] font-semibold">Back to Groups</Link></div></main>

  return <main className="min-h-screen bg-gray-50 text-gray-900"><header className="bg-white border-b border-gray-100 px-5 lg:px-10 py-5"><div className="max-w-6xl mx-auto"><Link href="/groups" className="text-sm text-gray-500">Groups</Link><span className="mx-2 text-gray-300">/</span><span className="text-sm font-medium">Join Group</span></div></header><section className="max-w-6xl mx-auto p-5 lg:p-10 space-y-6">
    <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8"><div className="flex items-start justify-between gap-5"><div><span className="inline-flex items-center gap-2 bg-green-50 text-[#16a34a] text-xs font-semibold px-3 py-1 rounded-full"><Icon name="users" size={14}/>Available Group</span><h1 className="mt-4 text-2xl font-bold">{group.name}</h1><p className="mt-2 text-sm text-gray-500 max-w-2xl">{group.description || `Join this ${cycleLabel(group.cycle).toLowerCase()} rotating savings group and choose your payout month.`}</p></div><div className="bg-green-50 rounded-xl px-5 py-4 text-center"><p className="text-xs text-gray-500">Available</p><p className="text-2xl font-bold text-[#14532d]">{available.length}</p><p className="text-xs text-gray-500">slots</p></div></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">{[['Monthly Contribution',money(Number(group.contribution_amount))],['Savings Cycle',cycleLabel(group.cycle)],['Total Payout',money(payout)],['Group Size',String(group.slot_count)]].map(([a,b])=><div key={a} className="bg-gray-50 rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400">{a}</p><p className="mt-2 text-xl font-bold">{b}</p></div>)}</div></div>
    <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Select Your Payout Slot</h2><p className="text-sm text-gray-500 mt-1">Choose the month you want to receive your payout. Slots are first-come, first-served.</p></div><span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">{available.length} Available</span></div><div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-7">{slots.map(slot=>{const open=slot.status==='available';const active=selectedId===slot.id;return <label key={slot.id} className={open?'cursor-pointer':'cursor-not-allowed'}><input type="radio" name="payout-slot" checked={active} disabled={!open} onChange={()=>setSelectedId(slot.id)} className="sr-only"/><div className={`rounded-xl border p-5 ${active?'border-[#14532d] bg-green-50 ring-1 ring-[#14532d]':'border-gray-200'} ${!open?'bg-gray-50 opacity-55':'hover:border-[#14532d]'}`}><div className="flex justify-between"><h3 className="font-semibold">Slot {slot.position}</h3><span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active?'bg-[#14532d] border-[#14532d]':'border-gray-300'}`}>{active&&<span className="w-2 h-2 rounded-full bg-white"/>}</span></div><p className="text-xs text-gray-500 mt-3">Receive payout in</p><p className="font-semibold text-[#14532d] mt-1">Month {slot.position}</p><span className={`inline-flex items-center gap-1 mt-4 px-2 py-1 rounded-full text-[11px] font-semibold ${open?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{open&&<Icon name="check" size={12}/>} {open?'Available':'Taken'}</span></div></label>})}</div></div>
    <div className="grid lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6"><h2 className="text-xl font-bold">Membership Agreement</h2><p className="text-sm text-gray-500 mt-1">Confirm that you understand the group rules before joining.</p><label className="mt-6 flex gap-3 cursor-pointer"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-1 h-5 w-5 accent-[#14532d]"/><span className="text-sm text-gray-700 leading-7">I agree to make my monthly contribution on time and accept the Alajo Terms & Conditions and Savings Policy.</span></label><div className="mt-6 rounded-xl bg-green-50 p-4 flex gap-3 text-sm text-gray-600"><Icon name="info" size={20}/><p>Your selected slot is reserved only when the join transaction succeeds. If another member takes it first, choose another available slot.</p></div></div><div className="bg-white rounded-2xl border border-gray-100 p-6"><h3 className="text-lg font-bold">Membership Summary</h3><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-gray-500">Group</span><b className="text-right">{group.name}</b></div><div className="flex justify-between"><span className="text-gray-500">Contribution</span><b>{money(Number(group.contribution_amount))}</b></div><div className="flex justify-between"><span className="text-gray-500">Cycle</span><b>{cycleLabel(group.cycle)}</b></div><div className="flex justify-between"><span className="text-gray-500">Selected Slot</span><b className="text-[#14532d]">{chosen?`Slot ${chosen.position}`:'Select a slot'}</b></div><div className="flex justify-between"><span className="text-gray-500">Expected Payout</span><b className="text-[#14532d]">{money(payout)}</b></div></div>{error&&<p className="mt-5 bg-red-50 text-red-700 rounded-lg p-3 text-xs">{error}</p>}<button onClick={join} disabled={!chosen||!agreed||joining} className="mt-7 w-full rounded-xl bg-[#14532d] text-white py-3 font-semibold disabled:opacity-50">{joining?'Joining…':'Join Savings Group'}</button><Link href="/groups" className="mt-3 block text-center border border-gray-200 rounded-xl py-3 font-semibold text-sm">Cancel</Link></div></div>
  </section></main>
}
