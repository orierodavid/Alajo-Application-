'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TEST_VALUES = { bvn: '0000000000', nin: '1111111111' } as const
const KYC_DIGITS = 10

type KycType = 'bvn' | 'nin'

type ApiResult = {
  status?: string
  persisted?: boolean
  error?: string
  message?: string
  code?: string
}

export default function KycPage() {
  const router = useRouter()
  const [type, setType] = useState<KycType>('bvn')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^\d{10}$/.test(value)) {
      setError(`Enter a valid ${KYC_DIGITS}-digit ${type.toUpperCase()} for development testing.`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ type, value }),
      })

      const text = await response.text()
      let result: ApiResult = {}
      try {
        result = text ? JSON.parse(text) as ApiResult : {}
      } catch {
        throw new Error(`The verification service returned an invalid response (${response.status}). Please try again.`)
      }

      if (!response.ok) throw new Error(result.error || result.message || `Verification could not be completed (${response.status}).`)
      if (result.status !== 'approved' || result.persisted !== true) {
        throw new Error(result.message || 'Identity verification was not saved. Please try again.')
      }

      router.replace('/bank-details')
    } catch (err) {
      if (err instanceof TypeError && /fetch/i.test(err.message)) {
        setError('We could not reach the verification service. Check your connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white grid lg:grid-cols-2">
      <section className="relative p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-hidden">
        <Link href="/" className="flex items-center gap-1 relative z-10 w-fit"><span className="text-[22px] font-extrabold tracking-tight text-gray-900">Alajo</span><svg width="18" height="18" viewBox="0 0 20 20" className="mt-1"><circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/><path d="M10 2 A8 8 0 0 1 17 8" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round"/><path d="M17 8 A8 8 0 0 1 14.5 16" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg></Link>
        <h1 className="relative z-10 mt-8 font-bold text-[28px] leading-[1.2] text-gray-900 max-w-[320px]">Smart Rotational Savings for <span className="text-[#16a34a]">Everyone</span></h1>
        <p className="relative z-10 mt-3 text-[15px] text-gray-500 max-w-[300px]">Complete one identity verification before accessing your Alajo dashboard.</p>
        <div className="relative z-10 mt-8 space-y-5">{[['✓','Secure Verification','Your identity is handled securely.'],['✓','One identity is enough','Choose either BVN or NIN. You do not need both.'],['✓','Development test mode','Use only the synthetic test value shown for your selected option.']].map(([i,t,d])=><div className="flex gap-3" key={t}><div className="w-9 h-9 shrink-0 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a] font-bold">{i}</div><div><p className="font-semibold text-[14px] text-gray-900">{t}</p><p className="text-[13px] text-gray-500">{d}</p></div></div>)}</div>
      </section>
      <section className="p-10 lg:p-14 flex flex-col justify-center"><div className="max-w-[400px] w-full mx-auto">
        <div className="flex items-center gap-2 text-[13px] font-medium mb-8"><span className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[11px]">✓</span><span>Personal Info</span><span className="flex-1 h-px bg-gray-200"/><span className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[11px]">2</span><span>Verification</span><span className="flex-1 h-px bg-gray-200"/><span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[11px]">3</span><span className="text-gray-400">Bank Details</span></div>
        <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a] text-lg mb-3">🛡️</div><h2 className="font-bold text-[22px] text-gray-900">Verify Your Identity</h2><p className="mt-1 text-gray-500 text-[14px] leading-relaxed">Select <strong>either BVN or NIN</strong>. Only one is required to continue.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-[14px] font-semibold"><button type="button" onClick={()=>{setType('bvn');setValue('');setError('')}} className={`py-2.5 rounded-md border-2 ${type==='bvn'?'border-[#16a34a] text-[#16a34a] bg-green-50':'border-gray-200 text-gray-500'}`}>BVN</button><button type="button" onClick={()=>{setType('nin');setValue('');setError('')}} className={`py-2.5 rounded-md border-2 ${type==='nin'?'border-[#16a34a] text-[#16a34a] bg-green-50':'border-gray-200 text-gray-500'}`}>NIN</button></div>
        <form onSubmit={submit} className="mt-5 space-y-4"><div><label className="block text-[14px] font-semibold text-gray-900 mb-1.5">{type.toUpperCase()}</label><div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2.5"><span>🔒</span><input required inputMode="numeric" maxLength={KYC_DIGITS} value={value} onChange={e=>setValue(e.target.value.replace(/\D/g,'').slice(0,KYC_DIGITS))} placeholder={`Enter your ${KYC_DIGITS}-digit ${type.toUpperCase()}`} className="w-full outline-none text-[14px]"/></div></div><div className="bg-green-50 rounded-md p-3 text-[12px] text-gray-600"><strong>Development test value:</strong> <code>{TEST_VALUES[type]}</code>. This is synthetic and must not be treated as real BVN/NIN verification.</div>{error&&<p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}<button type="submit" disabled={loading} className="w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px]">{loading?'Verifying…':`Verify ${type.toUpperCase()}`}</button></form>
      </div></section>
    </main>
  )
}
