'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = {
  kycStatus: string
  accountStatus: string
  rejectionReason: string | null
  account: { bank_name: string; account_number: string; account_name: string; currency: string; status: string } | null
  complete: boolean
}

export default function KycStatusPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function loadStatus() {
    setRefreshing(true)
    try {
      const response = await fetch('/api/kyc/status', { credentials: 'include', cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (response.status === 401) { router.replace('/login?next=/kyc/status'); return }
      if (!response.ok) throw new Error(result.error || 'Unable to load verification status.')
      setStatus(result)
      setError('')
      if (result.complete) window.setTimeout(() => router.replace('/dashboard'), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load verification status.')
    } finally { setRefreshing(false) }
  }

  useEffect(() => {
    void loadStatus()
    const timer = window.setInterval(() => void loadStatus(), 5000)
    return () => window.clearInterval(timer)
  }, [])

  const verified = status?.kycStatus === 'VERIFIED'
  const rejected = status?.kycStatus === 'REJECTED'
  const complete = Boolean(status?.complete)

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <section className="w-full max-w-lg">
        <div className="text-center">
          <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center text-2xl ${complete ? 'bg-green-50 text-green-700' : rejected ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>{complete ? '✓' : rejected ? '!' : '⏳'}</div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">{complete ? 'Your Alajo account is ready' : rejected ? 'Verification needs attention' : verified ? 'Identity verified — preparing your account' : 'Verification in progress'}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">{complete ? 'Your identity and dedicated funding account are active. You can now access your wallet.' : rejected ? (status?.rejectionReason || 'Your verification was not approved. Please review your details and try again.') : verified ? 'Your identity is verified. We are waiting for the dedicated funding account to become active.' : 'You do not need to log in again. Keep this page open; we will check your verification status automatically.'}</p>
        </div>
        <div className="mt-7 rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500">KYC verification</span><span className="text-sm font-semibold text-gray-900">{status?.kycStatus?.replace('_',' ') ?? 'Checking…'}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Virtual account</span><span className="text-sm font-semibold text-gray-900">{status?.accountStatus?.replace('_',' ') ?? 'Checking…'}</span></div>
        </div>
        {complete && status?.account && <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-5"><p className="text-sm font-semibold text-gray-900">Your virtual account</p><p className="mt-2 text-xs text-gray-500">Transfer money directly to this account to fund your Alajo wallet.</p><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><span className="text-gray-500">Account name</span><span className="font-semibold text-gray-900">{status.account.account_name}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Bank</span><span className="font-semibold text-gray-900">{status.account.bank_name}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Account number</span><span className="font-semibold text-gray-900">{status.account.account_number}</span></div></div></div>}
        {error && <p role="alert" className="mt-5 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
        <div className="mt-6 space-y-3">
          {complete ? <Link href="/dashboard" className="block w-full rounded-md bg-[#14532d] px-4 py-3 text-center text-sm font-semibold text-white">Go to Dashboard</Link> : rejected ? <Link href="/kyc" className="block w-full rounded-md bg-[#14532d] px-4 py-3 text-center text-sm font-semibold text-white">Correct details & try again</Link> : <button onClick={() => void loadStatus()} disabled={refreshing} className="block w-full rounded-md bg-[#14532d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{refreshing ? 'Checking…' : 'Check status now'}</button>}
        </div>
      </section>
    </main>
  )
}
