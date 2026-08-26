'use client'

import { useEffect, useState } from 'react'

export function FundingAccountCard() {
  const [account, setAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  useEffect(() => { fetch('/api/wallet/funding-account', { cache:'no-store' }).then(async r => r.ok ? r.json() : {account:null}).then(d => setAccount(d.account ?? null)).finally(() => setLoading(false)) }, [])
  async function copy(){ if(!account?.account_number)return; await navigator.clipboard.writeText(account.account_number); setCopied(true); setTimeout(()=>setCopied(false),1500) }
  if(loading) return <div className="mt-5 rounded-2xl border border-[#dfe6e1] p-5 animate-pulse"><div className="h-4 w-40 bg-gray-100 rounded"/><div className="h-8 w-52 bg-gray-100 rounded mt-4"/></div>
  if(!account || account.status!=='ACTIVE') return <div className="mt-5 rounded-2xl border border-[#e3e9e5] bg-[#f7faf8] p-5"><p className="font-bold text-[#183526] text-sm">Your virtual account</p><p className="text-[#7a867f] text-xs mt-1">Your dedicated account will appear here when active.</p></div>
  return <div className="mt-5 rounded-2xl border border-[#bfe3cb] bg-[#f1faf4] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.14em] font-bold text-[#15803d]">Alajo virtual account</p><p className="font-bold text-[#183526] mt-1">{account.bank_name}</p></div><span className="text-[9px] font-bold uppercase tracking-wider text-[#15803d] bg-white border border-[#d4ecdc] px-2 py-1 rounded-full">ACTIVE</span></div><p className="text-[11px] text-[#68766e] mt-4">Send a Nigerian bank transfer directly to this account. Your Alajo wallet is credited automatically after Paystack confirms the transfer.</p><div className="mt-4 bg-white rounded-xl border border-[#dfe6e1] p-4"><p className="text-[10px] text-[#8a958f] uppercase tracking-wide">Account name</p><p className="font-semibold text-[#183526] text-sm mt-1">{account.account_name}</p><div className="flex items-end justify-between gap-3 mt-4"><div><p className="text-[10px] text-[#8a958f] uppercase tracking-wide">Account number</p><p className="font-extrabold text-[#10251a] text-[22px] tracking-wide mt-1">{account.account_number}</p></div><button type="button" onClick={copy} className="text-xs font-bold text-[#15803d] border border-[#bfe3cb] rounded-lg px-3 py-2">{copied?'Copied':'Copy'}</button></div><p className="text-[10px] text-[#8a958f] mt-3">Currency: {account.currency ?? 'NGN'}</p></div></div>
}
