'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

function BrandPanel() {
  return <section className="relative p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
    <Link href="/" className="flex items-center gap-1 relative z-10 w-fit">
      <span className="text-[22px] font-extrabold tracking-tight text-gray-900">Alajo</span>
      <svg width="18" height="18" viewBox="0 0 20 20" className="mt-1"><circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/><path d="M10 2 A8 8 0 0 1 17 8" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round"/><path d="M17 8 A8 8 0 0 1 14.5 16" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg>
    </Link>
    <h1 className="relative z-10 mt-8 font-bold text-[28px] leading-[1.2] text-gray-900 max-w-[320px]">Smart Rotational Savings for <span className="text-[#16a34a]">Everyone</span></h1>
    <p className="relative z-10 mt-3 text-[15px] text-gray-500 max-w-[300px]">Join thousands of people already saving and growing together with Alajo.</p>
    <div className="relative z-10 mt-8 space-y-5">
      {[['👥','Join Savings Groups','Become a member of a savings group that fits your goals.'],['💳','Make Contributions','Contribute monthly and track your savings progress.'],['💰','Receive Payouts','Get your payout based on your selected position in the group.']].map(([icon,title,text])=><div className="flex gap-3" key={title}><div className="w-9 h-9 shrink-0 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a]">{icon}</div><div><p className="font-semibold text-[14px] text-gray-900">{title}</p><p className="text-[13px] text-gray-500">{text}</p></div></div>)}
    </div>
    <div className="absolute left-[-40px] bottom-[-40px] w-56 h-56 rounded-full bg-[#eab308]/25"/><div className="absolute left-[-60px] bottom-[-80px] w-64 h-64 rounded-full bg-[#14532d]/90"/>
    <div className="relative z-10 mt-10 flex items-end"><div className="bg-black rounded-t-lg p-1.5 w-[300px]"><div className="bg-white rounded overflow-hidden h-[150px] text-[7px] p-2"><p className="font-bold text-[9px]">Alajo</p><p className="mt-1 text-gray-700">Good morning, David 👋</p><div className="mt-1 grid grid-cols-3 gap-1"><div className="border border-gray-100 rounded p-1"><p className="text-gray-400">Total Contributions</p><p className="text-[#16a34a] font-bold">₦250,000.00</p></div><div className="border border-gray-100 rounded p-1"><p className="text-gray-400">Active Groups</p><p className="font-bold">3</p></div><div className="border border-gray-100 rounded p-1"><p className="text-gray-400">Total Payouts</p><p className="font-bold">₦180,000.00</p></div></div></div></div><div className="bg-black rounded-[16px] p-1.5 w-[90px] -ml-6 -mb-4 shrink-0"><div className="bg-white rounded-[10px] overflow-hidden h-[160px] p-1.5 text-[6px]"><p className="font-bold text-[7px]">Alajo</p><p className="mt-1 text-gray-700">Good morning, David</p><p className="text-gray-400 mt-1">Total Contributions</p><p className="text-[#16a34a] font-bold">₦250,000.00</p><p className="text-gray-400 mt-1">My Active Groups</p><div className="mt-1 border border-gray-100 rounded p-1">₦50,000 Group</div></div></div></div>
  </section>
}

function MobileWelcome({ onLogin }: { onLogin: () => void }) {
  return <section className="lg:hidden relative min-h-[100svh] overflow-hidden bg-[#03160d] text-white flex flex-col items-center px-6 pt-[max(52px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(31,92,48,.48),transparent_34%),linear-gradient(145deg,#071b11_0%,#03160d_55%,#02100a_100%)]" />
    <div className="absolute -right-28 top-[55%] w-[150%] h-40 rotate-[-14deg] rounded-[50%] border border-[#4f8b3c]/30 shadow-[0_0_45px_rgba(54,130,53,.12)]" />
    <div className="absolute -right-40 top-[63%] w-[150%] h-48 rotate-[-14deg] rounded-[50%] border border-[#1f6d35]/20" />
    <div className="relative z-10 w-full flex justify-center">
      <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-[11px] font-medium tracking-[.18em] text-white/60">9:41</div>
    </div>
    <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center -mt-4">
      <div className="relative w-[174px] h-[174px] flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#4d9b3d]/10 blur-2xl" />
        <img src="/icons/alajo-mark.svg" alt="Alajo" className="relative w-[150px] h-[150px] drop-shadow-[0_10px_24px_rgba(234,179,8,.22)]" />
      </div>
      <div className="mt-2 text-[42px] leading-none font-semibold tracking-[.18em] text-[#f5c542]">ALAJO</div>
      <div className="mt-7 w-36 h-px bg-gradient-to-r from-transparent via-[#eab308] to-transparent relative"><span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rounded-full bg-[#f5c542] shadow-[0_0_14px_4px_rgba(245,197,66,.5)]" /></div>
      <p className="mt-6 text-[18px] font-light tracking-wide text-white/90">Smart Rotational Savings</p>
    </div>
    <div className="relative z-10 w-full max-w-[390px] pb-3">
      <button type="button" onClick={onLogin} className="w-full h-[58px] rounded-2xl border border-[#80b74d]/80 bg-gradient-to-b from-[#5d9d36] to-[#184923] text-white text-[18px] font-semibold shadow-[0_10px_35px_rgba(49,133,47,.28),inset_0_1px_0_rgba(255,255,255,.18)] active:scale-[.99] transition">Login <span className="float-right mr-5 text-2xl leading-none">›</span></button>
      <p className="mt-6 text-center text-[15px] text-white/75">New to Alajo? <Link href="/signup" className="text-[#f5c542] font-medium">Create an account</Link></p>
    </div>
  </section>
}

export default function LoginPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [remember,setRemember]=useState(true); const [error,setError]=useState(''); const [loading,setLoading]=useState(false); const [show,setShow]=useState(false); const [mobileLogin,setMobileLogin]=useState(false)
  async function submit(e:FormEvent){
    e.preventDefault(); setError(''); setLoading(true)
    try { const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}); const data=await response.json(); if(!response.ok){setError(data.error||'Unable to log in. Please try again.');return} window.location.assign('/dashboard') } catch { setError('Unable to log in right now. Please try again.') } finally { setLoading(false) }
  }
  function google(){setError('Google sign-in is not available yet. Please use your email and password.')}
  return <main className="min-h-screen bg-white grid lg:grid-cols-2">
    <MobileWelcome onLogin={()=>setMobileLogin(true)} />
    <div className={`lg:hidden ${mobileLogin?'block':'hidden'} min-h-[100svh] bg-[#f7f8f9] px-5 pt-[max(24px,env(safe-area-inset-top))] pb-10`}>
      <button type="button" onClick={()=>setMobileLogin(false)} className="mb-8 text-[#14532d] text-sm font-semibold">← Back</button>
      <div className="mx-auto max-w-[390px]"><div className="flex items-center gap-2"><img src="/icons/alajo-mark.svg" alt="" className="w-9 h-9"/><span className="font-bold tracking-[.12em] text-[#14532d]">ALAJO</span></div><h2 className="font-extrabold text-[26px] text-gray-900 mt-8">Welcome Back 👋</h2><p className="mt-1 text-gray-500 text-[15px]">Login to your account</p><form onSubmit={submit} className="mt-8 space-y-5"><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Email Address</label><div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-3 bg-white"><span className="text-gray-400">✉️</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full outline-none text-[14px] text-gray-800 bg-transparent"/></div></div><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Password</label><div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-3 bg-white"><span className="text-gray-400">🔒</span><input required type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full outline-none text-[14px] text-gray-800 bg-transparent"/><button type="button" onClick={()=>setShow(!show)} className="text-gray-400">👁️</button></div></div><div className="flex items-center justify-between text-[14px]"><label className="flex items-center gap-2 text-gray-700"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="w-4 h-4 accent-[#16a34a]"/> Remember me</label><Link href="/forgot-password" className="text-[#16a34a] font-medium">Forgot Password?</Link></div>{error&&<p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}<button disabled={loading} className="block text-center w-full py-3.5 rounded-xl bg-[#14532d] text-white font-semibold text-[15px] disabled:opacity-60">{loading?'Logging in…':'Login'}</button><p className="text-center text-[14px] text-gray-500">Don't have an account? <Link href="/signup" className="text-[#16a34a] font-semibold">Sign up</Link></p></form></div>
    </div>
    <div className="hidden lg:block lg:contents"><BrandPanel/><section className="p-10 lg:p-14 flex flex-col justify-center"><div className="max-w-[380px] w-full mx-auto"><h2 className="font-extrabold text-[26px] text-gray-900 text-center">Welcome Back 👋</h2><p className="mt-1 text-center text-gray-500 text-[15px]">Login to your account</p><form onSubmit={submit} className="mt-8 space-y-5"><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Email Address</label><div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2.5"><span className="text-gray-400">✉️</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full outline-none text-[14px] text-gray-800"/></div></div><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Password</label><div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2.5"><span className="text-gray-400">🔒</span><input required type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full outline-none text-[14px] text-gray-800"/><button type="button" onClick={()=>setShow(!show)} className="text-gray-400">👁️</button></div></div><div className="flex items-center justify-between text-[14px]"><label className="flex items-center gap-2 text-gray-700"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="w-4 h-4 accent-[#16a34a]"/> Remember me</label><Link href="/forgot-password" className="text-[#16a34a] font-medium">Forgot Password?</Link></div>{error&&<p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</p>}<button disabled={loading} className="block text-center w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px] disabled:opacity-60">{loading?'Logging in…':'Login'}</button><div className="flex items-center gap-3 text-gray-300 text-[13px]"><div className="flex-1 h-px bg-gray-200"/>or<div className="flex-1 h-px bg-gray-200"/></div><button type="button" onClick={google} className="flex items-center justify-center gap-2 w-full py-3 rounded-md border border-gray-200 font-semibold text-[15px] text-gray-800">🔵 Continue with Google</button><p className="text-center text-[14px] text-gray-500">Don't have an account? <Link href="/signup" className="text-[#16a34a] font-semibold">Sign up</Link></p></form></div></section></div>
  </main>
}
