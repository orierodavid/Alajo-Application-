'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'

type Group = { id: string; name: string; contribution_amount: number; slot_count: number; cycle: string; start_date: string | null }
type Slot = { id: string; position: number; status: string }

const nav = [['dashboard','/dashboard','Dashboard'],['groups','/groups','Groups'],['contributions','/contributions','Contributions'],['payouts','/payouts','Payouts'],['wallet','/wallet','Wallet'],['transactions','/transactions','Transactions'],['invite','/invite-earn','Invite & Earn'],['notifications','/notifications','Notifications'],['settings','/settings','Settings'],['help','/help-center','Help Center'],['logout','/login','Logout']] as const
const money = (v:number) => `₦${Number(v).toLocaleString('en-NG',{minimumFractionDigits:0})}`

export default function JoinGroupSuccessPage() {
  const [group,setGroup]=useState<Group|null>(null)
  const [slot,setSlot]=useState<number|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(() => {
    let cancelled=false
    const params=new URLSearchParams(window.location.search)
    const groupId=params.get('group')||''
    const slotPosition=params.get('slot')
    if(slotPosition) setSlot(Number(slotPosition))
    if(!groupId){setError('The joined group could not be identified.');setLoading(false);return}
    fetch(`/api/groups/${encodeURIComponent(groupId)}`,{credentials:'include',cache:'no-store'})
      .then(async r=>{const d=await r.json().catch(()=>({}));if(r.status===401){window.location.replace('/login?error=session');return}if(!r.ok)throw new Error(d?.error||'Unable to load the joined group.');if(!cancelled){setGroup(d.group);if(!slotPosition){const assigned=(d.slots||[]).find((s:Slot)=>s.status==='assigned'||s.status==='reserved');if(assigned)setSlot(assigned.position)}}})
      .catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Unable to load membership details.')})
      .finally(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true}
  },[])

  return <div className="min-h-screen bg-gray-50 text-gray-900 flex">
    <aside className="hidden lg:flex w-64 shrink-0 bg-[#0b2313] text-white p-5 flex-col min-h-screen sticky top-0">
      <Link href="/dashboard" className="text-2xl font-extrabold tracking-tight">Alajo</Link>
      <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">{nav.map(([icon,href,label])=><Link key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label==='Groups'?'bg-white/10 text-white':'text-gray-300 hover:bg-white/5'}`}><AlajoIcon name={icon} size={17}/>{label}</Link>)}</nav>
      <div className="bg-[#123524] rounded-xl p-4 text-white"><p className="font-semibold text-[14px]">Grow your savings with Alajo</p><p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p><Link href="/invite-earn" className="mt-3 inline-flex items-center gap-1.5 bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends <AlajoIcon name="arrow-up" size={14}/></Link></div>
    </aside>
    <main className="flex-1 min-w-0 flex items-center justify-center p-6 lg:p-10">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center"><AlajoIcon name="check" size={32}/></div>
        <p className="mt-6 text-sm font-semibold text-[#16a34a]">Group joined successfully</p>
        {loading ? <p className="mt-3 text-sm text-gray-500">Loading your membership details…</p> : error ? <p className="mt-3 text-sm text-red-600">{error}</p> : <>
          <h1 className="mt-2 text-2xl font-extrabold">You’re now part of {group?.name || 'the group'}</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">Your membership has been recorded and your assigned savings position is reserved.</p>
          {group && <div className="mt-6 grid grid-cols-2 gap-3 text-left"><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-400">Monthly Contribution</p><p className="mt-1 font-bold">{money(group.contribution_amount)}</p></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-400">Payout Position</p><p className="mt-1 font-bold text-[#14532d]">Slot {slot ?? '—'}</p></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-400">Savings Cycle</p><p className="mt-1 font-bold">{group.cycle === 'ten_month' ? '10 Months' : '6 Months'}</p></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-400">Expected Payout</p><p className="mt-1 font-bold text-[#14532d]">{money(Number(group.contribution_amount)*Number(group.slot_count))}</p></div></div>}
          <p className="mt-5 text-sm leading-6 text-gray-500">Your contribution schedule will appear in Contributions.</p>
        </>}
        <div className="mt-7 grid grid-cols-2 gap-3"><Link href="/groups" className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Back to Groups</Link><Link href="/contributions" className="rounded-lg bg-[#14532d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#123f24]">View Contributions</Link></div>
      </div>
    </main>
  </div>
}
