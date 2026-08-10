'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'

const money=(value:number)=>`₦${Number(value||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`
const presets=[10000,20000,50000]
type DashboardResponse={wallet?:{balance?:number}}

export default function WalletPage(){
 const[balance,setBalance]=useState(0),[amount,setAmount]=useState<number|null>(null),[custom,setCustom]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{fetch('/api/dashboard',{cache:'no-store'}).then(async r=>{if(r.status===401){window.location.replace('/login');return}const d:DashboardResponse=r.ok?await r.json():{};setBalance(Number(d.wallet?.balance??0))}).catch(()=>setBalance(0)).finally(()=>setLoading(false))},[])
 const selectedAmount=useMemo(()=>custom.trim()?Number(custom)||0:amount||0,[amount,custom])
 return <div className="min-h-screen bg-[#f7f8f9] text-gray-900"><main className="lg:ml-[250px] p-5 sm:p-8">
  <header className="max-w-[1180px]"><p className="text-gray-400 text-[12px] uppercase tracking-[.16em] font-semibold">Wallet</p><h1 className="font-bold text-[22px] mt-1">Fund Wallet</h1><p className="text-gray-500 text-[14px] mt-1">Add money to your wallet for automatic contributions.</p></header>
  <section className="mt-6 max-w-2xl"><div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7 shadow-sm">
   <h2 className="font-semibold text-gray-900 text-[16px]">Choose Amount</h2><p className="text-gray-500 text-[13px] mt-1">Select an amount to add to your Alajo wallet.</p>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">{presets.map(v=>{const selected=amount===v&&!custom;return <button key={v} type="button" onClick={()=>{setAmount(v);setCustom('')}} className={`min-w-0 w-full rounded-xl px-3 py-4 text-center border transition ${selected?'border-[#16a34a] bg-green-50 ring-1 ring-[#16a34a]/20':'border-gray-200 hover:border-green-300 hover:bg-green-50/30'}`}><span className="block text-gray-400 text-[11px]">Amount</span><span className="block font-bold text-gray-900 text-[15px] mt-1 whitespace-nowrap">{money(v)}</span></button>})}</div>
   <div className="mt-5"><label htmlFor="custom-amount" className="text-[13px] font-semibold">Enter Other Amount</label><input id="custom-amount" type="number" min="1" inputMode="decimal" value={custom} onChange={e=>{setCustom(e.target.value);setAmount(null)}} placeholder="₦ Enter amount" className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/></div>
   <h2 className="font-semibold text-[16px] mt-7">Payment Method</h2><p className="text-gray-500 text-[13px] mt-1">Paystack handles card, bank transfer and USSD payments.</p>
   <div className="mt-4 border border-gray-200 rounded-xl p-4 flex items-center gap-3 opacity-60 cursor-not-allowed" aria-disabled="true"><div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0"><AlajoIcon name="wallet" size={18} className="text-[#16a34a]"/></div><div className="min-w-0 flex-1"><p className="font-semibold text-sm">Paystack</p><p className="text-gray-400 text-xs">Card, bank transfer and USSD</p></div><span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-gray-400">Soon</span></div>
   <div className="mt-6 bg-green-50 rounded-xl p-4 space-y-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-gray-500">Wallet Balance</span><span className="font-semibold whitespace-nowrap">{loading?'—':money(balance)}</span></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-gray-500">New Balance</span><span className="font-semibold text-[#16a34a] whitespace-nowrap">{loading?'—':money(balance+selectedAmount)}</span></div></div>
   <button type="button" disabled className="w-full mt-6 bg-[#14532d] text-white py-3.5 rounded-xl font-semibold text-sm shadow-sm opacity-50 cursor-not-allowed">Fund Wallet</button><p className="text-[11px] text-gray-400 text-center mt-3 leading-5">Wallet funding will be enabled when Paystack is connected and verified.</p>
  </div></section></main></div>
}
