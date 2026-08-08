'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

function BrandPanel() {
  return (
    <section className="relative p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
      <Link href="/" className="flex items-center gap-1 relative z-10 w-fit"><span className="text-[22px] font-extrabold tracking-tight text-gray-900 font-display">Alajo</span><svg width="18" height="18" viewBox="0 0 20 20" className="mt-1"><circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/><path d="M10 2 A8 8 0 0 1 17 8" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round"/><path d="M17 8 A8 8 0 0 1 14.5 16" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg></Link>
      <h1 className="relative z-10 mt-8 font-display font-bold text-[28px] leading-[1.2] text-gray-900 max-w-[320px]">Smart Rotational Savings for <span className="text-[#16a34a]">Everyone</span></h1>
      <p className="relative z-10 mt-3 text-[15px] text-gray-500 max-w-[300px]">Join thousands of people already saving and growing together with Alajo.</p>
      <div className="relative z-10 mt-8 space-y-5">{[['👥','Join Savings Groups','Become a member of a savings group that fits your goals.'],['💳','Make Contributions','Contribute monthly and track your savings progress.'],['💰','Receive Payouts','Get your payout based on your selected position in the group.']].map(([icon,title,text])=><div className="flex gap-3" key={title}><div className="w-9 h-9 shrink-0 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a]">{icon}</div><div><p className="font-semibold text-[14px] text-gray-900">{title}</p><p className="text-[13px] text-gray-500">{text}</p></div></div>)}</div>
      <div className="absolute left-[-40px] bottom-[-40px] w-56 h-56 rounded-full bg-[#eab308]/25"/><div className="absolute left-[-60px] bottom-[-80px] w-64 h-64 rounded-full bg-[#14532d]/90"/>
    </section>
  )
}

export default function SignupPage() {
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false); const [sent,setSent]=useState(false); const [resendSeconds,setResendSeconds]=useState(0)
  useEffect(()=>{if(resendSeconds<=0)return;const t=window.setInterval(()=>setResendSeconds(v=>Math.max(0,v-1)),1000);return()=>window.clearInterval(t)},[resendSeconds])

  async function submit(e:FormEvent){
    e.preventDefault(); if(loading)return; setError('')
    if(!name.trim())return setError('Please enter your full name'); if(!email.trim())return setError('Please enter your email address'); if(password.length<8)return setError('Password must be at least 8 characters'); if(password!==confirm)return setError('Passwords do not match')
    setLoading(true)
    try {
      const response=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})})
      const result=await response.json().catch(()=>({error:'The account service returned an invalid response.'}))
      if(!response.ok){setError(result.error||`Account creation failed (${response.status}).`);return}
      setSent(true);setResendSeconds(30)
    } catch (err:unknown) {
      console.error('Alajo signup request failed:',err)
      setError('Unable to connect to the account service. Please check your connection and try again.')
    } finally {setLoading(false)}
  }

  async function resendEmail(){
    if(resendSeconds>0||!email)return;setError('')
    try {
      const response=await fetch('/api/auth/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})})
      const result=await response.json().catch(()=>({error:'Unable to resend the verification email.'}))
      if(!response.ok){setError(result.error||'Unable to resend the verification email.');return}
      setResendSeconds(30)
    } catch { setError('Unable to resend the verification email. Please try again.') }
  }

  if(sent)return <main className="min-h-screen bg-white grid lg:grid-cols-2"><BrandPanel/><section className="p-10 lg:p-14 flex flex-col justify-center"><div className="max-w-[400px] w-full mx-auto text-center"><div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center text-3xl text-[#16a34a]">✉️</div><h1 className="mt-6 font-display font-bold text-[26px] text-gray-900">Verify Your Email</h1><p className="mt-4 text-gray-500 text-[15px] leading-relaxed">We've sent a verification link to<br/><span className="font-semibold text-gray-900">{email}</span></p><p className="mt-4 text-gray-500 text-[15px] leading-relaxed">Please check your email and click on the link to verify your account.</p><button type="button" onClick={()=>window.location.href=`mailto:${email}`} className="mt-8 inline-block w-full max-w-[340px] py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px]">Open Email App</button><button type="button" disabled={resendSeconds>0} onClick={resendEmail} className="block mx-auto mt-4 text-[14px] text-gray-500">{resendSeconds>0?`Resend Email (${resendSeconds}s)`:'Resend Email'}</button>{error&&<p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}</div></section></main>

  return <main className="min-h-screen bg-white grid lg:grid-cols-2"><BrandPanel/><section className="p-10 lg:p-14 flex flex-col justify-center"><div className="max-w-[380px] w-full mx-auto"><h2 className="font-display font-extrabold text-[26px] text-gray-900 text-center">Create Your Account</h2><p className="mt-1 text-center text-gray-500 text-[15px]">Sign up to start saving with Alajo</p><form onSubmit={submit} className="mt-8 space-y-5"><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Full Name</label><input required value={name} onChange={e=>setName(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]"/></div><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Email Address</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]"/></div><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Password</label><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]"/></div><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">Confirm Password</label><input required type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]"/></div>{error&&<p className="text-sm text-red-600 bg-red-50 p-3 rounded-md break-words">{error}</p>}<button disabled={loading} type="submit" className="w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px] disabled:opacity-70">{loading?'Creating account…':'Create Account'}</button><p className="text-center text-[14px] text-gray-500">Already have an account? <Link href="/login" className="text-[#16a34a] font-semibold">Login</Link></p></form></div></section></main>
}
