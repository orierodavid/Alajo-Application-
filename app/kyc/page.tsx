'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Bank = { code: string; name: string; slug: string }

export default function KycPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [bvn, setBvn] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [banks, setBanks] = useState<Bank[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/kyc/profile', { credentials: 'include', cache: 'no-store' }).then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Unable to load your profile.')
        setFirstName(data.firstName ?? '')
        setLastName(data.lastName ?? '')
        setPhone(data.phone ?? '')
        setEmail(data.email ?? '')
      }),
      fetch('/api/kyc/banks', { credentials: 'include', cache: 'no-store' }).then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Unable to load banks.')
        setBanks(data.banks ?? [])
      }),
    ])
      .catch(error => setError(error instanceof Error ? error.message : 'Unable to load verification details.'))
      .finally(() => { setLoadingProfile(false); setLoadingBanks(false) })
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!firstName.trim()) return setError('Enter your first name.')
    if (!lastName.trim()) return setError('Enter your last name.')
    if (!/^\d{11}$/.test(phone.replace(/\D/g, ''))) return setError('Phone number must contain exactly 11 digits.')
    if (!email.trim()) return setError('Enter your email address.')
    if (!/^\d{11}$/.test(bvn)) return setError('BVN must contain exactly 11 digits.')
    if (!bankCode) return setError('Select your bank.')
    if (!/^\d{10}$/.test(accountNumber)) return setError('Account number must contain exactly 10 digits.')

    setLoading(true)
    try {
      const response = await fetch('/api/kyc/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, credentials: 'include', cache: 'no-store',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.replace(/\D/g, ''), email: email.trim(), bvn, bankCode, accountNumber }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || result.message || 'Verification could not be started.')
      router.replace('/kyc/status?status=pending')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white grid lg:grid-cols-2">
      <section className="relative p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
        <Link href="/" className="flex items-center gap-1 relative z-10 w-fit"><span className="text-[22px] font-extrabold tracking-tight text-gray-900">Alajo</span><span aria-hidden="true">◌</span></Link>
        <h1 className="relative z-10 mt-8 font-bold text-[28px] leading-[1.2] text-gray-900 max-w-[320px]">Smart Rotational Savings for <span className="text-[#16a34a]">Everyone</span></h1>
        <p className="relative z-10 mt-3 text-[15px] text-gray-500 max-w-[320px]">Complete verification once. After approval, Alajo can create your dedicated funding account.</p>
        <div className="relative z-10 mt-8 space-y-5">{[['✓','Secure Verification','Your identity is verified server-side with Paystack.'],['✓','Bank Ownership Check','Your BVN and bank account are checked together.'],['✓','Dedicated Funding Account','After approval, you receive a personal account for wallet funding.']].map(([icon,title,description])=><div className="flex gap-3" key={title}><div className="w-9 h-9 shrink-0 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a] font-bold">{icon}</div><div><p className="font-semibold text-[14px] text-gray-900">{title}</p><p className="text-[13px] text-gray-500">{description}</p></div></div>)}</div>
      </section>
      <section className="p-10 lg:p-14 flex flex-col justify-center"><div className="max-w-[430px] w-full mx-auto">
        <div className="flex items-center gap-2 text-[13px] font-medium mb-8"><span className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[11px]">✓</span><span>Personal Info</span><span className="flex-1 h-px bg-gray-200"/><span className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[11px]">2</span><span>Verification</span><span className="flex-1 h-px bg-gray-200"/><span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[11px]">3</span><span className="text-gray-400">Account</span></div>
        <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a] text-lg mb-3">🛡️</div>
        <h2 className="font-bold text-[22px] text-gray-900">Verify Your Identity</h2>
        <p className="mt-1 text-gray-500 text-[14px] leading-relaxed">Confirm your signup details, then enter your BVN and the Nigerian bank account connected to it.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3"><div><label htmlFor="firstName" className="block text-[14px] font-semibold text-gray-900 mb-1.5">First Name</label><input id="firstName" required autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]" placeholder="David" /></div><div><label htmlFor="lastName" className="block text-[14px] font-semibold text-gray-900 mb-1.5">Last Name</label><input id="lastName" required autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]" placeholder="Oriero" /></div></div>
          <div><label htmlFor="phone" className="block text-[14px] font-semibold text-gray-900 mb-1.5">Phone Number</label><input id="phone" required type="tel" inputMode="tel" autoComplete="tel" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="09024856517" className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]" /></div>
          <div><label htmlFor="email" className="block text-[14px] font-semibold text-gray-900 mb-1.5">Email Address</label><input id="email" required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]" /></div>
          <div><label htmlFor="bvn" className="block text-[14px] font-semibold text-gray-900 mb-1.5">BVN</label><input id="bvn" required inputMode="numeric" autoComplete="off" maxLength={11} minLength={11} pattern="[0-9]{11}" value={bvn} onChange={e=>setBvn(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="Enter your 11-digit BVN" className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]" /></div>
          <div><label htmlFor="bank" className="block text-[14px] font-semibold text-gray-900 mb-1.5">Bank</label><select id="bank" required value={bankCode} onChange={e=>setBankCode(e.target.value)} disabled={loadingBanks} className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px] bg-white"><option value="">{loadingBanks?'Loading banks…':'Select your bank'}</option>{banks.map(bank=><option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></div>
          <div><label htmlFor="account" className="block text-[14px] font-semibold text-gray-900 mb-1.5">Account Number</label><input id="account" required inputMode="numeric" autoComplete="off" maxLength={10} minLength={10} pattern="[0-9]{10}" value={accountNumber} onChange={e=>setAccountNumber(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="Enter 10-digit account number" className="w-full border border-gray-200 rounded-md px-3 py-2.5 outline-none text-[14px]" /></div>
          <div className="bg-green-50 rounded-md p-3 flex gap-2"><span>🔒</span><div><p className="font-semibold text-[13px] text-gray-900">Your details are protected</p><p className="text-[12px] text-gray-500">Your signup details can be corrected here before they are sent for verification.</p></div></div>
          {error&&<p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
          <button type="submit" disabled={loading||loadingBanks||loadingProfile} className="w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px] disabled:opacity-60">{loading?'Starting secure verification…':loadingProfile?'Loading your details…':'Verify Identity & Bank'}</button>
        </form>
      </div></section>
    </main>
  )
}
