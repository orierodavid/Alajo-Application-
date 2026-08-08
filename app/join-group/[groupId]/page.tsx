'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlajoIcon } from '@/components/ui/alajo-icon'

type Group = {
  id: string
  name: string
  description: string | null
  cycle: 'six_month' | 'ten_month'
  contribution_amount: number
  slot_count: number
  start_date: string | null
  status: string
}

type Slot = { id: string; position: number; status: string }

const money = (value: number) => `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
const cycleLabel = (cycle: Group['cycle']) => cycle === 'ten_month' ? '10 Months' : '6 Months'

export default function JoinGroupPage() {
  const params = useParams<{ groupId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const groupId = params.groupId
  const [group, setGroup] = useState<Group | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [agreements, setAgreements] = useState([true, false, false, false])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) { router.replace('/login?error=session'); return }
        const [{ data: groupRow, error: groupError }, { data: slotRows, error: slotError }] = await Promise.all([
          supabase.from('groups').select('id,name,description,cycle,contribution_amount,slot_count,start_date,status').eq('id', groupId).single(),
          supabase.from('group_slots').select('id,position,status').eq('group_id', groupId).order('position', { ascending: true }),
        ])
        if (groupError) throw new Error(groupError.message)
        if (slotError) throw new Error(slotError.message)
        if (!cancelled) {
          setGroup(groupRow as Group)
          setSlots((slotRows ?? []) as Slot[])
          const first = (slotRows ?? []).find((slot) => slot.status === 'available')
          if (first) setSelectedSlot(first.id)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load this group.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [groupId, router, supabase])

  const availableSlots = useMemo(() => slots.filter((slot) => slot.status === 'available'), [slots])
  const selected = slots.find((slot) => slot.id === selectedSlot)
  const payout = group ? Number(group.contribution_amount) * group.slot_count : 0
  const allAgreed = agreements.every(Boolean)

  async function confirmJoin() {
    if (!selectedSlot || !allAgreed || !group) return
    setJoining(true)
    setError('')
    try {
      const { error: joinError } = await supabase.rpc('join_group', { p_group_id: group.id, p_slot_id: selectedSlot })
      if (joinError) {
        if (joinError.message.toLowerCase().includes('just been taken')) {
          setSlots((current) => current.map((slot) => slot.id === selectedSlot ? { ...slot, status: 'assigned' } : slot))
          setSelectedSlot('')
          throw new Error('That position has just been taken. Please choose another available position.')
        }
        throw new Error(joinError.message || 'Something went wrong while joining the group.')
      }
      router.push(`/join-group-success?group=${encodeURIComponent(group.id)}&slot=${encodeURIComponent(String(selected?.position ?? ''))}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while joining the group.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#16a34a] animate-spin" /><p className="mt-3 text-sm text-gray-500">Loading group…</p></div></main>
  if (error && !group) return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><div className="bg-white rounded-2xl border border-red-100 p-7 max-w-md w-full"><h1 className="font-bold text-gray-900">Unable to load group</h1><p className="mt-2 text-sm text-red-600">{error}</p><Link href="/groups" className="mt-5 inline-flex rounded-lg bg-[#14532d] text-white px-4 py-2 text-sm font-semibold">Back to Groups</Link></div></main>
  if (!group) return null

  const membersTaken = slots.filter((slot) => slot.status === 'assigned' || slot.status === 'reserved').length
  const startDate = group.start_date ? new Date(group.start_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'To be announced'

  return <div className="min-h-screen bg-gray-50 text-gray-900 flex">
    <aside className="hidden lg:flex w-64 shrink-0 bg-[#0b2313] text-white p-5 flex-col min-h-screen sticky top-0">
      <Link href="/dashboard" className="text-2xl font-extrabold tracking-tight">Alajo</Link>
      <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">
        {[
          ['dashboard','/dashboard','Dashboard'], ['groups','/groups','Groups'], ['contributions','/contributions','Contributions'], ['payouts','/payouts','Payouts'],
          ['wallet','/wallet','Wallet'], ['transactions','/transactions','Transactions'], ['invite','/invite-earn','Invite & Earn'], ['notifications','/notifications','Notifications'],
          ['settings','/settings','Settings'], ['help','/help-center','Help Center'], ['logout','/login','Logout'],
        ].map(([icon, href, label]) => <Link key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label === 'Groups' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}><AlajoIcon name={icon as any} size={17} />{label}{label === 'Notifications' && <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] ml-auto" />}</Link>)}
      </nav>
      <div className="bg-[#123524] rounded-xl p-4 text-white relative overflow-hidden">
        <p className="font-semibold text-[14px]">Grow your savings with Alajo</p>
        <p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p>
        <Link href="/invite-earn" className="mt-3 inline-flex items-center gap-1.5 bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends <AlajoIcon name="arrow-up" size={14} /></Link>
        <div className="absolute -bottom-1 -right-1 opacity-80 text-amber-300"><AlajoIcon name="coin" size={34} /></div>
      </div>
    </aside>

    <main className="flex-1 min-w-0">
      <header className="bg-white border-b border-gray-100 px-5 lg:px-8 py-5"><p className="text-gray-400 text-sm">Groups</p><h1 className="text-2xl font-bold">Join Savings Group</h1></header>
      <section className="p-5 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 bg-green-50 text-[#16a34a] text-[12px] font-semibold px-3 py-1 rounded-full"><AlajoIcon name="groups" size={14} />Available Group</span>
              <h2 className="font-bold text-[24px] text-gray-900 mt-4">{group.name}</h2>
              <p className="text-[14px] text-gray-500 mt-2 max-w-2xl">{group.description || `Join this ${cycleLabel(group.cycle).toLowerCase()} rotating savings group and receive your payout based on your selected slot.`}</p>
            </div>
            <div className="bg-green-50 rounded-xl px-5 py-4 text-center shrink-0"><p className="text-[12px] text-gray-500">Members</p><p className="font-bold text-[24px] text-[#14532d]">{membersTaken} / {group.slot_count}</p></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {[['Monthly Contribution', money(Number(group.contribution_amount))], ['Savings Cycle', cycleLabel(group.cycle)], ['Total Payout', money(payout)], ['Admin Fee', '10%']].map(([label, value]) => <div key={label} className="bg-[#f9fafb] rounded-xl border border-gray-100 p-4"><p className="text-gray-400 text-[13px]">{label}</p><p className="mt-2 font-bold text-[20px] text-gray-900">{value}</p></div>)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            <div><p className="text-gray-400 text-[13px]">Group Starts</p><p className="font-semibold text-gray-900 mt-1">{startDate}</p></div>
            <div><p className="text-gray-400 text-[13px]">First Contribution</p><p className="font-semibold text-gray-900 mt-1">{startDate}</p></div>
            <div><p className="text-gray-400 text-[13px]">Available Slots</p><p className="font-semibold text-[#16a34a] mt-1">{availableSlots.length} {availableSlots.length === 1 ? 'Slot' : 'Slots'} Remaining</p></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-7">
          <div className="flex items-center justify-between gap-4"><div><h2 className="font-bold text-[22px] text-gray-900">Select Your Payout Slot</h2><p className="text-[14px] text-gray-500 mt-1">Choose the month you would like to receive your payout. Only one member can occupy each slot.</p></div><span className="text-[13px] font-medium bg-green-50 text-[#16a34a] px-3 py-1 rounded-full whitespace-nowrap">{availableSlots.length} Available</span></div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {slots.map((slot) => {
              const available = slot.status === 'available'
              const selectedState = selectedSlot === slot.id
              return <label key={slot.id} className={available ? 'cursor-pointer' : 'cursor-not-allowed'}>
                <input type="radio" name="slot" className="peer sr-only" disabled={!available} checked={selectedState} onChange={() => setSelectedSlot(slot.id)} />
                <div className={`rounded-xl border p-5 transition-all duration-200 ${available ? 'hover:border-[#14532d] hover:shadow-sm' : 'bg-gray-50 opacity-70'} ${selectedState ? 'border-[#14532d] bg-green-50 shadow-sm' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Slot {slot.position}</h3><span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedState ? 'border-[#14532d] bg-[#14532d]' : available ? 'border-gray-300' : 'border-gray-300 bg-gray-200'}`}>{selectedState && <AlajoIcon name="check" size={12} className="text-white" />}</span></div>
                  <p className="text-[13px] text-gray-500 mt-3">Receive payout in</p><p className="font-semibold text-[#14532d] mt-1">Month {slot.position}</p>
                  <span className={`inline-block mt-4 px-2 py-1 rounded-full text-[11px] font-semibold ${available ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{available ? 'Available' : 'Taken'}</span>
                </div>
              </label>
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-[22px] text-gray-900">Membership Agreement</h2>
            <p className="text-[14px] text-gray-500 mt-2">Please review the terms below before joining this savings group.</p>
            <div className="mt-6 space-y-4">
              {[
                <>I understand that I must make my monthly contribution of <strong>{money(Number(group.contribution_amount))}</strong> before the contribution deadline.</>,
                <>I understand that late payments attract a <strong>2% daily penalty</strong> until payment is received.</>,
                <>I authorize Alajo to automatically debit my wallet whenever my monthly contribution becomes due.</>,
                <>I agree to the Alajo Terms & Conditions and Savings Policy.</>,
              ].map((text, index) => <label key={index} className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1 w-5 h-5 accent-[#14532d]" checked={agreements[index]} onChange={(e) => setAgreements((current) => current.map((value, i) => i === index ? e.target.checked : value))} /><span className="text-[14px] text-gray-700 leading-7">{text}</span></label>)}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-[20px] text-gray-900">Membership Summary</h3>
            <div className="mt-6 space-y-5 text-[14px]">
              {[['Group', group.name], ['Contribution', money(Number(group.contribution_amount))], ['Cycle', cycleLabel(group.cycle)], ['Selected Slot', selected ? `Slot ${selected.position}` : 'Select a slot'], ['Expected Payout', money(payout)], ['First Contribution', startDate]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><span className="text-gray-500">{label}</span><span className={`font-semibold text-right ${label === 'Selected Slot' || label === 'Expected Payout' ? 'text-[#14532d]' : 'text-gray-900'}`}>{value}</span></div>)}
            </div>
            {error && <div className="mt-6 rounded-lg bg-red-50 border border-red-100 text-red-700 px-3 py-2 text-sm">{error}</div>}
            <button onClick={confirmJoin} disabled={!selectedSlot || !allAgreed || joining} className="mt-8 w-full bg-[#14532d] hover:bg-[#123f24] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition">{joining ? 'Joining Group…' : 'Join Savings Group'}</button>
            <Link href="/groups" className="mt-3 block w-full border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-50 transition">Cancel</Link>
          </div>
        </div>

        <div className="bg-green-50 rounded-2xl border border-green-100 p-5 flex items-start gap-4"><div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#14532d] shrink-0"><AlajoIcon name="info" size={24} /></div><div><h3 className="font-semibold text-gray-900">Before You Join</h3><p className="text-[14px] text-gray-600 mt-2 leading-7">Ensure your wallet has sufficient funds before your contribution due date. If Auto Contribution is enabled, Alajo will automatically debit your wallet each month.</p></div></div>
      </section>
    </main>
  </div>
}
