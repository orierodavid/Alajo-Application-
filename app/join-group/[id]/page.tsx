'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlajoIcon } from '@/components/ui/alajo-icon'

type Group = {
  id: string; name: string; description: string | null; cycle: 'six_month' | 'ten_month'; contribution_amount: number; slot_count: number; start_date: string | null; status: string
}
type Slot = { id: string; position: number; status: string }
const money = (value: number) => `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
const cycleLabel = (cycle: Group['cycle']) => cycle === 'ten_month' ? '10 Months' : '6 Months'
const nav = [['dashboard','/dashboard','Dashboard'],['groups','/groups','Groups'],['contributions','/contributions','Contributions'],['payouts','/payouts','Payouts'],['wallet','/wallet','Wallet'],['transactions','/transactions','Transactions'],['invite','/invite-earn','Invite & Earn'],['notifications','/notifications','Notifications'],['settings','/settings','Settings'],['help','/help-center','Help Center'],['logout','/login','Logout']] as const

export default function JoinGroupPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [group,setGroup]=useState<Group|null>(null),[slots,setSlots]=useState<Slot[]>([]),[selectedSlot,setSelectedSlot]=useState(''),[checks,setChecks]=useState([false,false,false,false]),[loading,setLoading]=useState(true),[joining,setJoining]=useState(false),[error,setError]=useState('')

  useEffect(() => {
    let cancelled=false
    async function load(){
      try {
        const response=await fetch(`/api/groups/${encodeURIComponent(params.id)}`,{credentials:'include',cache:'no-store'})
        if(response.status===401){router.replace('/login?error=session');return}
        if(!response.ok) throw new Error('Unable to load this group.')
        const data=await response.json()
        if(!data?.group) throw new Error('Group not found.')
        if(!cancelled){setGroup(data.group);setSlots(data.slots??[])}
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Unable to load this group.')}finally{if(!cancelled)setLoading(false)}
    }
    load();return()=>{cancelled=true}
  },[params.id,router])

  const availableSlots=useMemo(()=>slots.filter(s=>s.status==='available'),[slots]), selected=slots.find(s=>s.id===selectedSlot), allAgreed=checks.every(Boolean), payout=group?Number(group.contribution_amount)*Number(group.slot_count):0
  async function join(){
    if(!selectedSlot||!allAgreed||!group)return
    setJoining(true);setError('')
    try{
      const response=await fetch('/api/groups/join',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({groupId:group.id,slotId:selectedSlot})})
      const data=await response.json().catch(()=>({}))
      if(response.status===401){router.replace('/login?error=session');return}
      if(!response.ok){setError(data?.error||'Unable to join this group right now.');setJoining(false);return}
      router.push(`/join-group-success?group=${group.id}&slot=${selected?.position??''}`)
    }catch(e){setError(e instanceof Error?e.message:'Unable to join this group right now.');setJoining(false)}
  }

  if(loading)return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#14532d] animate-spin"/><p className="mt-3 text-sm text-gray-500">Loading group…</p></div></main>
  if(error&&!group)return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><div className="bg-white rounded-2xl border border-red-100 p-6 max-w-md w-full"><h1 className="font-bold">Unable to load group</h1><p className="mt-2 text-sm text-gray-500">{error}</p><Link href="/groups" className="mt-4 inline-block text-sm font-semibold text-[#14532d]">Back to Groups</Link></div></main>
  if(!group)return null

  return <div className="min-h-screen bg-gray-50 text-gray-900 flex"><aside className="hidden lg:flex w-64 shrink-0 bg-[#0b2313] text-white p-5 flex-col min-h-screen sticky top-0"><Link href="/dashboard" className="text-2xl font-extrabold tracking-tight">Alajo</Link><nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">{nav.map(([icon,href,label])=><Link key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label==='Groups'?'bg-white/10 text-white':'text-gray-300 hover:bg-white/5'}`}><AlajoIcon name={icon} size={17}/>{label}</Link>)}</nav></aside><main className="flex-1 min-w-0"><header className="bg-white border-b border-gray-100 px-5 lg:px-8 py-5"><p className="text-gray-400 text-sm">Groups / Join Group</p><h1 className="text-2xl font-bold mt-1">Join Savings Group</h1></header><section className="p-5 lg:p-8 max-w-7xl mx-auto space-y-6"><div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-7"><div className="flex items-start justify-between gap-6"><div><span className="inline-flex items-center gap-2 bg-green-50 text-[#16a34a] text-[12px] font-semibold px-3 py-1 rounded-full"><AlajoIcon name="groups" size={14}/> Available Group</span><h2 className="font-bold text-[24px] mt-4">{group.name}</h2><p className="text-[14px] text-gray-500 mt-2 max-w-2xl">{group.description??`Join this ${cycleLabel(group.cycle).toLowerCase()} rotating savings group.`}</p></div><div className="bg-green-50 rounded-xl px-5 py-4 text-center shrink-0"><p className="text-[12px] text-gray-500">Members</p><p className="font-bold text-[24px] text-[#14532d]">{slots.filter(s=>s.status!=='available').length} / {group.slot_count}</p></div></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-8">{[['Monthly Contribution',money(Number(group.contribution_amount))],['Savings Cycle',cycleLabel(group.cycle)],['Total Payout',money(payout)],['Admin Fee','10%']].map(([label,value])=><div key={label} className="bg-[#f9fafb] rounded-xl border border-gray-100 p-4"><p className="text-gray-400 text-[13px]">{label}</p><p className="mt-2 font-bold text-[20px]">{value}</p></div>)}</div></div><div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-7"><div className="flex items-center justify-between"><div><h2 className="font-bold text-[22px]">Select Your Payout Slot</h2><p className="text-[14px] text-gray-500 mt-1">Choose the month you would like to receive your payout.</p></div><span className="text-[13px] font-medium bg-green-50 text-[#16a34a] px-3 py-1 rounded-full">{availableSlots.length} Available</span></div><div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-8">{slots.map(slot=>{const available=slot.status==='available',sel=selectedSlot===slot.id;return <label key={slot.id} className={available?'cursor-pointer':'cursor-not-allowed'}><input type="radio" name="slot" value={slot.id} checked={sel} onChange={()=>available&&setSelectedSlot(slot.id)} disabled={!available} className="peer sr-only"/><div className={`rounded-xl border p-5 ${available?'hover:border-[#14532d]':''} ${sel?'border-[#14532d] bg-green-50 ring-1 ring-[#14532d]':available?'border-gray-200':'border-gray-200 bg-gray-50 opacity-60'}`}><div className="flex items-center justify-between"><h3 className="font-semibold">Slot {slot.position}</h3><span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sel?'border-[#14532d] bg-[#14532d]':available?'border-gray-300':'border-gray-200 bg-gray-100'}`}>{sel&&<span className="w-2 h-2 rounded-full bg-white"/>}</span></div><p className="text-[13px] text-gray-500 mt-3">Receive payout in</p><p className="font-semibold text-[#14532d] mt-1">Month {slot.position}</p><span className="inline-flex mt-4 px-2 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">{available?'Available':'Taken'}</span></div></label>})}</div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6"><h2 className="font-bold text-[22px]">Membership Agreement</h2><p className="text-[14px] text-gray-500 mt-2">Please review the terms below before joining.</p><div className="mt-6 space-y-4">{['I understand that I must make my monthly contribution before the contribution deadline.','I understand that late payments may attract applicable penalties until payment is received.','I authorize Alajo to automatically debit my wallet whenever my monthly contribution becomes due.','I agree to the Alajo Terms & Conditions and Savings Policy.'].map((text,i)=><label key={i} className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={checks[i]} onChange={e=>setChecks(c=>c.map((v,j)=>j===i?e.target.checked:v))} className="mt-1 w-5 h-5 accent-[#14532d]"/><span className="text-[14px] text-gray-700 leading-7">{text}</span></label>)}</div></div><div className="bg-white rounded-2xl border border-gray-100 p-6"><h3 className="font-bold text-[20px]">Membership Summary</h3><div className="mt-6 space-y-5 text-[14px]">{[['Group',group.name],['Contribution',money(Number(group.contribution_amount))],['Cycle',cycleLabel(group.cycle)],['Selected Slot',selected?`Slot ${selected.position}`:'Select a slot'],['Expected Payout',money(payout)]].map(([label,value])=><div className="flex justify-between gap-4" key={label}><span className="text-gray-500">{label}</span><span className="font-semibold text-right">{value}</span></div>)}</div>{error&&<div className="mt-5 rounded-lg bg-red-50 text-red-700 text-sm p-3">{error}</div>}<button onClick={join} disabled={!selectedSlot||!allAgreed||joining} className="mt-8 w-full bg-[#14532d] disabled:opacity-50 text-white py-3 rounded-xl font-semibold">{joining?'Joining Group…':'Join Savings Group'}</button><Link href="/groups" className="mt-3 block w-full border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold">Cancel</Link></div></div></section></main></div>
}
