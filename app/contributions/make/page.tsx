'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlajoIcon } from '@/components/ui/alajo-icon'

const money=(n:number)=>`₦${Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`

export default function MakeContributionPage(){
 const params=useSearchParams()
 const id=params.get('id')||''
 const [amount,setAmount]=useState(0)
 const [dueDate,setDueDate]=useState('')
 const [loading,setLoading]=useState(true)
 const [confirmed,setConfirmed]=useState(false)
 useEffect(()=>{
  let dead=false
  async function load(){
   if(!id){setLoading(false);return}
   try{
    const { createClient }=await import('@/lib/supabase/client')
    const supabase=createClient()
    const {data,error}=await supabase.from('contribution_schedules').select('id,amount,due_date,status').eq('id',id).maybeSingle()
    if(!error&&data&&!dead){setAmount(Number(data.amount||0));setDueDate(data.due_date||'')}
   }finally{if(!dead)setLoading(false)}
  }
  load();return()=>{dead=true}
 },[id])
 if(loading)return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading contribution…</main>
 if(!id||!amount)return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-6"><div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center"><div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><AlajoIcon name="info"/></div><h1 className="font-bold text-xl mt-4">Contribution unavailable</h1><p className="text-sm text-gray-500 mt-2">This contribution could not be found.</p><Link href="/contributions" className="mt-6 inline-block text-[#16a34a] font-semibold">Return to Contributions</Link></div></main>
 return <main className="min-h-screen bg-[#f8faf9] text-gray-900"><header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center"><Link href="/contributions" className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><AlajoIcon name="arrow-up" size={18} className="rotate-[-90deg]"/> Contributions</Link></header><section className="max-w-3xl mx-auto p-5 sm:p-8"><div className="text-center mb-8"><div className="mx-auto w-12 h-12 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center"><AlajoIcon name="wallet" size={22}/></div><h1 className="text-2xl font-bold mt-4">Make Contribution</h1><p className="text-sm text-gray-500 mt-2">Review your contribution before confirming payment.</p></div><div className="bg-white rounded-2xl border border-gray-100 p-6"><div className="flex items-center justify-between border-b border-gray-100 pb-5"><div><p className="text-sm text-gray-400">Contribution Amount</p><p className="text-3xl font-bold text-gray-900 mt-1">{money(amount)}</p></div><span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">Due {dueDate?new Date(dueDate).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'—'}</span></div><div className="mt-6 space-y-4"><div className="flex justify-between text-sm"><span className="text-gray-500">Payment source</span><span className="font-semibold">Alajo Wallet</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Amount to pay</span><span className="font-semibold">{money(amount)}</span></div></div><div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3"><AlajoIcon name="info" size={19} className="text-blue-500 shrink-0"/><p className="text-sm text-blue-800">This confirmation step does not deduct funds yet. Payment processing will be connected after the wallet/payment schema is finalized.</p></div>{confirmed?<div className="mt-6 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-800">Confirmation received. No funds were deducted.</div>:<button onClick={()=>setConfirmed(true)} className="mt-6 w-full bg-[#14532d] hover:bg-[#123f24] text-white py-3 rounded-xl font-semibold">Confirm Contribution</button>}<Link href="/contributions" className="mt-3 block w-full border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-50">Cancel</Link></div></section></main>
}
