'use client'

import { useEffect, useState } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { UserPageShell } from '@/components/layout/user-page-shell'
import { FundingAccountCard } from '@/components/wallet/funding-account-card'

const money=(value:number)=>`₦${Number(value||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`
type DashboardResponse={wallet?:{balance?:number}}

export default function WalletPage(){
 const[balance,setBalance]=useState(0),[loading,setLoading]=useState(true)
 useEffect(()=>{fetch('/api/dashboard',{cache:'no-store'}).then(async r=>{if(r.status===401){window.location.replace('/login');return}const d:DashboardResponse=r.ok?await r.json():{};setBalance(Number(d.wallet?.balance??0))}).catch(()=>setBalance(0)).finally(()=>setLoading(false))},[])
 return <UserPageShell eyebrow="Wallet" title="Wallet" description="Your wallet balance and personal virtual account." actions={<div className="h-9 w-9 rounded-full bg-[#e8f6ed] text-[#15803d] flex items-center justify-center"><AlajoIcon name="wallet" size={17}/></div>}>
  <div className="max-w-2xl space-y-5">
   <section className="bg-white rounded-2xl border border-[#e3e9e5] p-5 sm:p-7 shadow-[0_8px_30px_rgba(16,37,26,.05)]">
    <p className="text-[10px] uppercase tracking-[.16em] font-bold text-[#15803d]">Wallet balance</p>
    <p className="text-[32px] font-extrabold text-[#10251a] mt-2">{loading?'—':money(balance)}</p>
   </section>
   <section className="bg-white rounded-2xl border border-[#e3e9e5] p-5 sm:p-7 shadow-[0_8px_30px_rgba(16,37,26,.05)]">
    <h2 className="font-bold text-[#10251a] text-[19px]">Your Alajo virtual account</h2>
    <p className="text-[#68766e] text-[12px] mt-1">Transfer any amount from your bank app directly to this account. Your wallet is credited automatically after Paystack confirms the transfer.</p>
    <FundingAccountCard />
   </section>
  </div>
 </UserPageShell>
}
