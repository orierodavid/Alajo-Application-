'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else window.location.assign('/dashboard')
    setLoading(false)
  }

  async function google() {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) setError(error.message)
  }

  return <main className="min-h-screen bg-white grid lg:grid-cols-2">
    <section className="relative p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
      <Link href="/" className="text-[22px] font-extrabold tracking-tight">Alajo</Link>
      <h1 className="mt-10 font-bold text-[28px] leading-tight max-w-[320px]">Smart Rotational Savings for <span className="text-[#16a34a]">Everyone</span></h1>
      <p className="mt-3 text-[15px] text-gray-500 max-w-[320px]">Join thousands of people already saving and growing together with Alajo.</p>
      <div className="mt-8 space-y-5">{[['👥','Join Savings Groups','Become a member of a savings group that fits your goals.'],['💳','Make Contributions','Contribute monthly and track your savings progress.'],['💰','Receive Payouts','Get your payout based on your selected position in the group.']].map(([icon,title,text])=><div className="flex gap-3" key={title}><div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">{icon}</div><div><p className="font-semibold text-[14px]">{title}</p><p className="text-[13px] text-gray-500">{text}</p></div></div>)}</div>
    </section>
    <section className="p-8 lg:p-14 flex items-center"><div className="max-w-[380px] w-full mx-auto">
      <h2 className="font-extrabold text-[26px] text-center">Welcome Back 👋</h2><p className="mt-1 text-center text-gray-500 text-[15px]">Login to your account</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <label className="block text-[14px] font-semibold">Email Address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full border border-gray-200 rounded-md px-3 py-3 outline-none focus:border-[#16a34a]" /></label>
        <label className="block text-[14px] font-semibold">Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 w-full border border-gray-200 rounded-md px-3 py-3 outline-none focus:border-[#16a34a]" /></label>
        <div className="flex justify-between text-[14px]"><label className="flex gap-2 items-center font-normal"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Remember me</label><Link href="/forgot-password" className="text-[#16a34a]">Forgot Password?</Link></div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</p>}
        <button disabled={loading} className="w-full py-3 rounded-md bg-[#14532d] text-white font-semibold disabled:opacity-60">{loading?'Logging in…':'Login'}</button>
        <div className="flex items-center gap-3 text-gray-300 text-[13px]"><div className="flex-1 h-px bg-gray-200"/>or<div className="flex-1 h-px bg-gray-200"/></div>
        <button type="button" onClick={google} className="w-full py-3 rounded-md border border-gray-200 font-semibold">🔵 Continue with Google</button>
        <p className="text-center text-[14px] text-gray-500">Don't have an account? <Link href="/signup-personal" className="text-[#16a34a] font-semibold">Sign up</Link></p>
      </form>
    </div></section>
  </main>
}
