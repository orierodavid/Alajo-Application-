'use client'

import Link from 'next/link'

export default function KycStatusPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-2xl">✓</div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">Verification submitted</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Your BVN and bank account details have been submitted for secure verification. We will update your account when Paystack confirms the result.
        </p>
        <div className="mt-6 space-y-3">
          <Link href="/kyc" className="block w-full rounded-md bg-[#14532d] px-4 py-3 text-sm font-semibold text-white">View verification</Link>
          <Link href="/" className="block w-full rounded-md border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">Return home</Link>
        </div>
      </section>
    </main>
  )
}
