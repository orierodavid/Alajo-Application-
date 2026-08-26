'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { UserPageShell } from '@/components/layout/user-page-shell'
import { FundingAccountCard } from '@/components/wallet/funding-account-card'

const money=(value:number)=>`₦${Number(value||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`
const presets=[10000,20000,50000]
type DashboardResponse={wallet?:{balance?:number}}

export default function WalletPage(){
 const[balance,setBalance]=useState(0),[amount,setAmount]=useState<number|null>(null),[custom,setCustom]=useState(''),[loading,setLoading]=useState(true),[funding,setFunding]=useState(false),[error,setError]=useState('')
 useEffect(()=>{fetch('/api/dashboard',{cache:'no-store'}).then(async r=>{if(r.status===401){window.location.replace('/login');return}const d:DashboardResponse=r.ok?await r.json():{};setBalance(Number(d.wallet?.balance??0))}).catch(()=>setBalance(0)).finally(()=>setLoading(false))},[])
 const selectedAmount=useMemo(()=>custom.trim()?Number(custom)||0:amount||0,[amount,custom])
 const startFunding=async()=>{
  setError('')
  if(!Number.isInteger(selectedAmount)||selectedAmount<100||selectedAmount>10000000){setError('Enter an amount between ₦100 and ₦10,000,000.');return}
  setFunding(true)
  try{
   const response=await fetch('/api/wallet/fund',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:selectedAmount})})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.authorizationUrl)throw new Error(data.error||'Unable to start payment.')
   window.location.assign(data.authorizationUrl)
  }catch(error){setError(error instanceof Error?error.message:'Unable to start payment.');setFunding(false)}
 }
 return <UserPageShell eyebrow="Wallet" title="Fund Wallet" description="Add money to your wallet for automatic contributions." actions={<div className="h-9 w-9 rounded-full bg-[#e8f6ed] text-[#15803d] flex items-center justify-center"><AlajoIcon name="wallet" size={17}/></div>}>
  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,760px)_300px] gap-5 items-start">
   <section className="bg-white rounded-2xl border border-[#e3e9e5] p-5 sm:p-7 shadow-[0_8px_30px_rgba(16,37,26,.05)]">
    <h2 className="font-bold text-[#10251a] text-[17px]">Your funding account</h2><p className="text-[#68766e] text-[12px] mt-1">After KYC approval, you can fund your wallet by bank transfer to your personal Alajo account.</p>
    <FundingAccountCard />
    <h2 className="font-bold text-[#10251a] text-[17px] mt-8">Fund with Paystack checkout</h2><p className="text-[#68766e] text-[12px] mt-1">You can also add money instantly through secure hosted checkout.</p>
    <div className="grid grid-cols-3 gap-3 mt-5">{presets.map(v=>{const selected=amount===v&&!custom;return <button key={v} type="button" onClick={()=>{setAmount(v);setCustom('');setError('')}} className={`w-full rounded-xl px-3 py-4 text-center border transition duration-200 hover:-translate-y-0.5 active:scale-[.98] ${selected?'border-[#16a34a] bg-[#eaf7ef] ring-1 ring-[#16a34a]/20':'border-[#dfe6e1] bg-white hover:border-[#8bc9a3] hover:bg-[#f5faf6]'}`}><span className="block text-[#8a958f] text-[10px] uppercase tracking-wide">Amount</span><span className="block font-bold text-[#10251a] text-[14px] mt-1 whitespace-nowrap">{money(v)}</span></button>})}</div>
    <div className="mt-5"><label htmlFor="custom-amount" className="text-[12px] font-bold text-[#263b30]">Enter Other Amount</label><input id="custom-amount" type="number" min="100" max="10000000" inputMode="decimal" value={custom} onChange={e=>{setCustom(e.target.value);setAmount(null);setError('')}} placeholder="₦ Enter amount" className="mt-2 w-full border border-[#dfe6e1] bg-white rounded-xl px-4 py-3 text-sm text-[#10251a] placeholder:text-[#9aa59f] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10"/></div>
    <div className="mt-4 border border-[#dfe6e1] rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-white border border-[#e8ece9] flex items-center justify-center shrink-0 overflow-hidden"><img src="https://dashboard.paystack.com/assets/img/logo.svg" alt="Paystack" className="w-8 h-8 object-contain" /></div><div className="min-w-0 flex-1"><p className="font-bold text-[#183526] text-sm">Paystack</p><p className="text-[#7a867f] text-xs">Secure hosted checkout for card, bank transfer and USSD</p></div><span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#15803d]">Enabled</span></div>
    <div className="mt-6 bg-[#eaf7ef] border border-[#d4ecdc] rounded-xl p-4 space-y-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#68766e]">Wallet Balance</span><span className="font-bold text-[#10251a] whitespace-nowrap">{loading?'—':money(balance)}</span></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#68766e]">New Balance</span><span className="font-bold text-[#15803d] whitespace-nowrap">{loading?'—':money(balance+selectedAmount)}</span></div></div>
    {error&&<p role="alert" className="mt-4 text-xs font-semibold text-red-600">{error}</p>}
    <button type="button" onClick={startFunding} disabled={funding||loading||selectedAmount<100} className="w-full mt-6 bg-[#0f5b32] text-white py-3.5 rounded-xl font-bold text-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#0b4727] active:scale-[.99] disabled:opacity-50 disabled:cursor-not-allowed">{funding?'Opening secure checkout…':'Fund Wallet via Checkout'}</button><p className="text-[10px] text-[#8a958f] text-center mt-3 leading-5">Wallet funding from your dedicated account is credited only after Alajo verifies the Paystack webhook server-side.</p>
   </section>
   <aside className="space-y-4"><div className="bg-[#0f5b32] text-white rounded-2xl p-5 shadow-[0_10px_25px_rgba(15,91,50,.12)]"><p className="text-[10px] uppercase tracking-[.16em] text-white/65 font-bold">Available balance</p><p className="text-[25px] font-bold mt-2">{loading?'—':money(balance)}</p><p className="text-[11px] text-white/65 mt-2 leading-5">Keep your wallet funded so scheduled contributions can be processed automatically.</p></div><div className="bg-white rounded-2xl border border-[#e3e9e5] p-5"><p className="font-bold text-[#183526] text-sm">Automatic contributions</p><p className="text-[#7a867f] text-[11px] mt-1 leading-5">Your wallet can be used to attempt contributions when they become due.</p><div className="mt-4 flex items-center gap-2 text-[11px] text-[#15803d] font-semibold"><span className="h-2 w-2 rounded-full bg-[#16a34a]"/> Ready for setup</div></div></aside>
  </div>
 </UserPageShell>
}
