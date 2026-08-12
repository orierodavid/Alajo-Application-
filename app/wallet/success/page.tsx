'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlajoIcon } from '@/components/ui/alajo-icon'

function WalletSuccessContent() {
  const params = useSearchParams()
  const status = params.get('status')
  const success = status === 'success'
  const pending = status === 'pending' || status === 'ongoing' || status === 'processing'
  const reconciliation = status === 'reconciliation'
  const title = success ? 'Wallet funded successfully' : reconciliation ? 'Wallet funding is being reconciled' : pending ? 'Payment is still processing' : 'Wallet funding was not completed'
  const message = success
    ? 'Your Paystack payment was verified server-side and the wallet credit has been recorded.'
    : reconciliation
      ? 'Paystack confirmed the payment, but Alajo has not yet recorded the wallet credit. The verified transaction is being reconciled automatically. Do not pay again for the same transaction.'
      : pending
        ? 'Your payment has not reached a final successful state yet. Check your wallet again shortly.'
        : 'No wallet credit was recorded. If you were charged, the payment will be reconciled from the verified Paystack transaction.'

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-gray-900 flex items-center justify-center p-5">
      <main className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${success ? 'bg-green-50 text-[#16a34a]' : reconciliation ? 'bg-blue-50 text-blue-600' : pending ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
            <AlajoIcon name={success ? 'check' : 'wallet'} size={30} />
          </div>
          <p className="text-gray-400 text-[12px] uppercase tracking-[.16em] font-semibold mt-6">Wallet</p>
          <h1 className="font-bold text-[25px] mt-2">{title}</h1>
          <p className="text-gray-500 text-[14px] leading-6 mt-3">{message}</p>
          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white text-[#16a34a] flex items-center justify-center"><AlajoIcon name="wallet" size={18}/></div>
              <div><p className="text-[12px] text-gray-500">Payment status</p><p className={`text-sm font-semibold ${success ? 'text-[#16a34a]' : reconciliation ? 'text-blue-600' : pending ? 'text-amber-600' : 'text-red-600'}`}>{success ? 'Verified' : reconciliation ? 'Reconciliation in progress' : pending ? 'Processing' : 'Not credited'}</p></div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/wallet" className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">View Wallet</Link>
            <Link href="/dashboard" className="rounded-xl bg-[#14532d] text-white py-3 text-sm font-semibold hover:bg-[#0f4022]">Go to Dashboard</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function WalletSuccessFallback() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] flex items-center justify-center p-5">
      <main className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
          <AlajoIcon name="wallet" size={24} />
        </div>
        <p className="text-gray-500 text-sm mt-4">Checking payment status…</p>
      </main>
    </div>
  )
}

export default function WalletSuccessPage() {
  return (
    <Suspense fallback={<WalletSuccessFallback />}>
      <WalletSuccessContent />
    </Suspense>
  )
}
