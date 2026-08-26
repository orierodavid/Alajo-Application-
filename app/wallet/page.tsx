'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { UserPageShell } from '@/components/layout/user-page-shell'
import { FundingAccountCard } from '@/components/wallet/funding-account-card'

const money=(value:number)=>`₦${Number(value||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`
const presets=[10000,20000,50000]
type DashboardResponse={wallet?:{balance?:number}}

export default function WalletPage(){
 const[balance,setBalance]=useState(0),[amount,setAmount]=useState<number|null>(null),[custom,setCustom]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{fetch('/api/dashboard',{cache:'no-store'}).then(async r=>{if(r.status===401){window.location.replace('/login');return}const d:DashboardResponse=r.ok?await r.json():{};setBalance(Number(d.wallet?.balance??0))}).catch(()=>setBalance(0)).finally(()=>setLoading(false))},[])
 const selectedAmount=useMemo(()=>custom.trim()?Number(custom)||0:amount||0,[amount,custom])
 return <UserPageShell eyebrow="Wallet" title="Fund Wallet" description="Fund your Alajo wallet by transferring directly to your personal virtual account." actions={<div className="h-9 w-9 rounded-full bg-[#e8f6ed] text-[#15803d] flex items-center justify-center"><AlajoIcon name="wallet" size={17}/></div>}>
  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,760px)_300px] gap-5 items-start">
   <section className="bg-white rounded-2xl border border-[#e3e9e5] p-5 sm:p-7 shadow-[0_8px_30px_rgba(16,37,26,.05)]">
    <h2 className="font-bold text-[#10251a] text-[17px]">Your Alajo virtual account</h2>
    <p className="text-[#68766e] text-[12px] mt-1">Transfer money from any Nigerian bank directly to this account. Paystack will notify Alajo and your wallet will be credited automatically.</p>
    <FundingAccountCard />
    <div className="mt-8 bg-[#f7faf8] border border-[#e3e9e5] rounded-xl p-4">
      <p className="font-bold text-[#183526] text-sm">How to fund your wallet</p>
      <ol className="mt-3 space-y-2 text-xs text-[#68766e] list-decimal list-inside"><li>Copy your Alajo virtual account number above.</li><li>Open your bank app and make a bank transfer.</li><li>Use the displayed account name and bank.</li><li>Your wallet is credited automatically after Paystack confirms the transfer.</li></ol>
    </div>
    <div className="mt-6 bg-[#eaf7ef] border border-[#d4ecdc] rounded-xl p-4 flex items-center justify-between gap-3 text-sm"><span className="text-[#68766e]">Wallet Balance</span><span className="font-bold text-[#10251a]">{loading?'—':money(balance)}</span></div>
    <div className="mt-4 bg-white border border-[#e3e9e5] rounded-xl p-4"><p className="font-bold text-[#183526] text-sm">Transfer amount</p><div className="grid grid-cols-3 gap-3 mt-4">{presets.map(v=>{const selected=amount===v&&!custom;return <button key={v} type="button" onClick={()=>{setAmount(v);setCustom('')}} className={`rounded-xl px-3 py-3 text-center border ${selected?'border-[#16a34a] bg-[#eaf7ef]':'border-[#dfe6e1]'}`}>{money(v)}</button>})}</div><input type="number" min="100" max="10000000" inputMode="decimal" value={custom} onChange={e=>{setCustom(e.target.value);setAmount(null)}} placeholder="Other amount (optional)" className="mt-4 w-full border border-[#dfe6e1] rounded-xl px-4 py-3 text-sm"/><p className="text-[10px] text-[#8a958f] mt-3">This amount is an instruction for your bank transfer. Alajo does not initiate a second checkout payment.</p></div>
   </section>
   <aside className="space-y-4"><div className="bg-[#0f5b32] text-white rounded-2xl p-5"><p className="text-[10px] uppercase tracking-[.16em] text-white/65 font-bold">Available balance</p><p className="text-[25px] font-bold mt-2">{loading?'—':money(balance)}</p><p className="text-[11px] text-white/65 mt-2 leading-5">Direct transfers to your personal virtual account are credited automatically after webhook confirmation.</p></div><div className="bg-white rounded-2xl border border-[#e3e9e5] p-5"><p className="font-bold text-[#183526] text-sm">Automatic funding</p><p className="text-[#7a867f] text-[11px] mt-1 leading-5">No admin approval or Paystack Checkout is required for normal virtual-account deposits.</p><div className="mt-4 flex items-center gap-2 text-[11px] text-[#15803d] font-semibold"><span className="h-2 w-2 rounded-full bg-[#16a34a]"/> Direct transfer enabled</div></div></aside>
  </div>
 </UserPageShell>
}
