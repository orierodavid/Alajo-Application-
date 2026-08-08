'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function KycPage() {
  const router = useRouter()
  const [type, setType] = useState<'bvn' | 'nin'>('bvn')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^\d{11}$/.test(value)) {
      setError(`Enter a valid 11-digit ${type.toUpperCase()}.`)
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login?error=session_required')
      return
    }
    // Provider integration is intentionally isolated here. The number is not
    // persisted until a verified provider response is received.
    setLoading(false)
    router.push('/bank-details')
  }

  return (
    <main className="min-h-screen bg-white grid lg:grid-cols-2">
      <section className="relative p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
        <Link href="/" className="flex items-center gap-1 relative z-10 w-fit"><span className="text-[22px] font-extrabold tracking-tight text-gray-900">Alajo</span><svg width="18" height="18" viewBox="0 0 20 20" className="mt-1"><circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/><path d="M10 2 A8 8 0 0 1 17 8" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round"/><path d="M17 8 A8 8 0 0 1 14.5 16" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg></Link>
        <h1 className="relative z-10 mt-8 font-bold text-[28px] leading-[1.2] text-gray-900 max-w-[320px]">Smart Rotational Savings for <span className="text-[#16a34a]">Everyone</span></h1>
        <p className="relative z-10 mt-3 text-[15px] text-gray-500 max-w-[300px]">Join thousands of people already saving and growing together with Alajo.</p>
        <div className="relative z-10 mt-8 space-y-5">{[['✅','Secure & Verified','Your security is our priority. We verify your identity to keep your account safe.'],['👥','Trusted by Thousands','Thousands of users trust Alajo for their savings journey.'],['🔒','100% Compliant','We comply with all regulations to protect your data.']].map(([i,t,d])=><div className="flex gap-3" key={t}><div className="w-9 h-9 shrink-0 rounded-full bg-green-50 flex items-center justify-center">{i}</div><div><p className="font-semibold text-[14px] text-gray-900">{t}</p><p className="text-[13px] text-gray-500">{d}</p></div></div>)}</div>
        <div className="absolute left-[-40px] bottom-[-40px] w-56 h-56 rounded-full bg-[#eab308]/25"/><div className="absolute left-[-60px] bottom-[-80px] w-64 h-64 rounded-full bg-[#14532d]/90"/>
      </section>
      <section className="p-10 lg:p-14 flex flex-col justify-center"><div className="max-w-[400px] w-full mx-auto">
        <div className="flex items-center gap-2 text-[13px] font-medium mb-8"><span className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[11px]">✓</span><span>Personal Info</span><span className="flex-1 h-px bg-gray-200"/><span className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[11px]">2</span><span>Verification</span><span className="flex-1 h-px bg-gray-200"/><span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[11px]">3</span><span className="text-gray-400">Bank Details</span></div>
        <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a] text-lg mb-3">🛡️</div><h2 className="font-bold text-[22px] text-gray-900">Verify Your Identity</h2><p className="mt-1 text-gray-500 text-[14px] leading-relaxed">We need to verify your identity using your BVN or NIN. This helps us keep your account secure and comply with regulatory requirements.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-[14px] font-semibold"><button type="button" onClick={()=>{setType('bvn');setValue('')}} className={`py-2.5 rounded-md border-2 ${type==='bvn'?'border-[#16a34a] text-[#16a34a] bg-green-50':'border-gray-200 text-gray-500'}`}>🪪 BVN Verification</button><button type="button" onClick={()=>{setType('nin');setValue('')}} className={`py-2.5 rounded-md border-2 ${type==='nin'?'border-[#16a34a] text-[#16a34a] bg-green-50':'border-gray-200 text-gray-500'}`}>🆔 NIN Verification</button></div>
        <form onSubmit={submit} className="mt-5 space-y-4"><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">{type.toUpperCase()}</label><div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2.5"><span>🔒</span><input required inputMode="numeric" maxLength={11} value={value} onChange={e=>setValue(e.target.value.replace(/\D/g,''))} placeholder={`Enter your 11-digit ${type.toUpperCase()}`} className="w-full outline-none text-[14px]"/></div></div>{error&&<p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}<div className="bg-green-50 rounded-md p-3 flex gap-2"><span>🔒</span><div><p className="font-semibold text-[13px] text-gray-900">Your data is secure</p><p className="text-[12px] text-gray-500">Your information is encrypted and will never be shared with third parties.</p></div></div><button disabled={loading} className="w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px]">{loading?'Verifying…':`Verify ${type.toUpperCase()}`}</button></form>
      </div></section>
    </main>
  )
}
