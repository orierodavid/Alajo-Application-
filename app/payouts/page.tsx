'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { UserPageShell } from '@/components/layout/user-page-shell'

type Row={id:string;periodNumber:number;scheduledDate:string;expectedAmount:number;fundedAmount:number;shortfallAmount:number;status:string;provider:string|null;providerReference:string|null;paidAt:string|null;failureReason:string|null;group:{id:string;name:string;cycle:string;contributionAmount:number}|null}
type Summary={totalExpected:number;totalReceived:number;pendingExpected:number;failedCount:number;paidCount:number;pendingCount:number}
const money=(n:number)=>`₦${Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`
const dateText=(v:string|null)=>v?new Date(v).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'Not scheduled'

export default function PayoutsPage(){
 const[rows,setRows]=useState<Row[]>([]),[summary,setSummary]=useState<Summary>({totalExpected:0,totalReceived:0,pendingExpected:0,failedCount:0,paidCount:0,pendingCount:0}),[next,setNext]=useState<Row|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState<'all'|'upcoming'|'paid'|'failed'>('all'),[name,setName]=useState('User')
 useEffect(()=>{let dead=false;async function load(){try{const r=await fetch('/api/payouts',{cache:'no-store'});const d=await r.json();if(r.status===401||d?.authenticated===false){location.href='/login';return}if(!r.ok||d?.error)throw new Error(d?.error||'Unable to load payouts');if(!dead){setRows(d.rows||[]);setSummary(d.summary||{});setNext(d.next||null)}}catch(e){if(!dead)setError(e instanceof Error?e.message:'Unable to load payouts.')}finally{if(!dead)setLoading(false)}}load();fetch('/api/auth/session',{cache:'no-store'}).then(async r=>r.ok?r.json():null).then(d=>{if(!dead&&d?.name)setName(d.name)}).catch(()=>{});return()=>{dead=true}},[])
 const visible=useMemo(()=>tab==='upcoming'?rows.filter(r=>['pending','processing','scheduled'].includes(r.status)):tab==='paid'?rows.filter(r=>['paid','completed','successful'].includes(r.status)):tab==='failed'?rows.filter(r=>['failed','reversed','cancelled'].includes(r.status)):rows,[rows,tab])
 const status=(s:string)=>['paid','completed','successful'].includes(s)?'Paid':['failed','reversed','cancelled'].includes(s)?(s==='cancelled'?'Cancelled':'Failed'):s==='processing'?'Processing':'Scheduled'
 const cls=(s:string)=>['paid','completed','successful'].includes(s)?'bg-[#eaf7ef] text-[#15803d]':['failed','reversed','cancelled'].includes(s)?'bg-[#fff1f1] text-[#dc4c4c]':'bg-[#eef5ff] text-[#3977c8]'
 return <UserPageShell eyebrow="Savings workspace" title="My Payouts" description="Track scheduled, completed and pending payouts from your savings groups." userName={name}>
   {error&&<div className="mb-5 rounded-xl border border-red-100 bg-red-50 text-red-700 p-4 text-sm">{error}</div>}
   {loading?<div className="bg-white rounded-2xl border border-[#e6ebe8] p-12 text-center text-[#68766e]">Loading payouts…</div>:<>
   <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
    <Stat title="Total Expected" value={money(summary.totalExpected)} sub="Across payout schedules" icon="payouts" primary/>
    <Stat title="Received" value={money(summary.totalReceived)} sub={`${summary.paidCount} completed`} icon="check"/>
    <Stat title="Upcoming" value={money(summary.pendingExpected)} sub={`${summary.pendingCount} scheduled`} icon="clock"/>
    <Stat title="Failed" value={String(summary.failedCount)} sub="Requires attention" icon="info"/>
   </div>
   <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
    <div className="xl:col-span-2 bg-white rounded-2xl border border-[#e6ebe8] overflow-hidden">
      <div className="px-5 pt-4 border-b border-[#edf0ee] flex gap-5 overflow-x-auto">{([['all','All Payouts'],['upcoming','Upcoming'],['paid','Paid'],['failed','Failed']] as const).map(([k,v])=><button key={k} onClick={()=>setTab(k)} className={`pb-3 text-[12px] font-semibold whitespace-nowrap border-b-2 transition ${tab===k?'text-[#15803d] border-[#16a34a]':'text-[#8a9690] border-transparent hover:text-[#315342]'}`}>{v}</button>)}</div>
      <div className="px-5">{visible.length?visible.map(r=><div key={r.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3.5 border-b border-[#f0f3f1] last:border-0 hover:bg-[#fbfcfb] transition">
       <div className="flex items-center gap-3 min-w-0"><div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cls(r.status)}`}><AlajoIcon name={['paid','completed','successful'].includes(r.status)?'check':['failed','reversed','cancelled'].includes(r.status)?'info':'payouts'} size={16}/></div><div className="min-w-0"><p className="text-[13px] font-semibold text-[#173323] truncate">{r.group?.name||'Savings Group'}</p><p className="text-[10px] text-[#8a9690]">Period {r.periodNumber} • {dateText(r.scheduledDate)}</p></div></div>
       <span className={`font-semibold text-[10px] rounded-full px-2 py-1 shrink-0 ${cls(r.status)}`}>{status(r.status)}</span><span className="text-[13px] font-bold text-[#173323] shrink-0">{money(r.expectedAmount)}</span>
      </div>):<div className="py-12 text-center"><p className="font-semibold text-[#30463a]">No payouts in this view</p><p className="text-[12px] text-[#8a9690] mt-1">Assigned payout schedules will appear here.</p></div>}</div>
    </div>
    <div className="space-y-4">
      <div className="bg-[#0f5b32] rounded-2xl p-5 text-white shadow-[0_12px_30px_rgba(15,91,50,.12)]"><p className="text-[10px] uppercase tracking-[.16em] text-white/65 font-bold">Next payout</p>{next?<><p className="font-bold text-[16px] mt-3">{next.group?.name||'Savings Group'}</p><p className="text-[11px] text-white/65 mt-1">Period {next.periodNumber} • {dateText(next.scheduledDate)}</p><p className="text-[27px] font-extrabold mt-4">{money(next.expectedAmount)}</p><span className="inline-block mt-3 bg-white/15 rounded-full px-2.5 py-1 text-[10px] font-semibold">{status(next.status)}</span></>:<p className="mt-3 text-sm text-white/65">No upcoming payout has been assigned yet.</p>}</div>
      <div className="bg-white rounded-2xl border border-[#e6ebe8] p-5"><h3 className="font-bold text-[14px] text-[#173323]">Payout information</h3><div className="mt-4 space-y-2.5 text-[12px]"><Info label="Completed" value={summary.paidCount}/><Info label="Scheduled" value={summary.pendingCount}/><Info label="Failed" value={summary.failedCount}/></div><Link href="/transactions" className="mt-4 flex justify-between text-[11px] font-semibold text-[#15803d]">View transactions <span>→</span></Link></div>
    </div>
   </div></>}
 </UserPageShell>
}
function Stat({icon,title,value,sub,primary=false}:{icon:'payouts'|'check'|'clock'|'info';title:string;value:string;sub:string;primary?:boolean}){return <div className={`${primary?'bg-[#0f5b32] text-white border-[#0f5b32]':'bg-white text-[#173323] border-[#e6ebe8]'} rounded-2xl border p-4 sm:p-5`}><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${primary?'bg-white/15 text-white':'bg-[#eaf7ef] text-[#15803d]'}`}><AlajoIcon name={icon} size={17}/></div><p className={`mt-3 text-[11px] font-semibold ${primary?'text-white/65':'text-[#748178]'}`}>{title}</p><p className="text-[18px] sm:text-[20px] font-extrabold mt-0.5">{value}</p><p className={`text-[10px] mt-1 ${primary?'text-white/55':'text-[#98a29d]'}`}>{sub}</p></div>}
function Info({label,value}:{label:string;value:number}){return <div className="flex items-center justify-between border-b border-[#f0f3f1] pb-2 last:border-0"><span className="text-[#7b8880]">{label}</span><b className="text-[#173323]">{value}</b></div>}
