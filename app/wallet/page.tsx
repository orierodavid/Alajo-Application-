'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'

const money = (value: number) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
const presets = [10000, 20000, 50000]

type DashboardResponse = { wallet?: { balance?: number } }

export default function WalletPage() {
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace('/login')
          return
        }
        const data: DashboardResponse = response.ok ? await response.json() : {}
        setBalance(Number(data.wallet?.balance ?? 0))
      })
      .catch(() => setBalance(0))
      .finally(() => setLoading(false))
  }, [])

  const selectedAmount = useMemo(() => {
    if (custom.trim()) return Number(custom) || 0
    return amount || 0
  }, [amount, custom])

  const choosePreset = (value: number) => {
    setAmount(value)
    setCustom('')
  }

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-gray-900">
      <aside className="hidden lg:flex w-[250px] min-h-screen bg-[#0b2313] text-white p-5 fixed inset-y-0 left-0 flex-col shadow-2xl shadow-black/10">
        <Link href="/dashboard" className="text-[26px] font-extrabold tracking-tight flex items-center gap-2">
          Alajo <span className="text-yellow-400 text-lg">✦</span>
        </Link>
        <nav className="mt-9 flex-1 space-y-1 text-[14px]">
          {[
            ['dashboard', 'Dashboard', '/dashboard'],
            ['groups', 'Groups', '/groups'],
            ['contributions', 'Contributions', '/contributions'],
            ['payouts', 'Payouts', '/payouts'],
            ['wallet', 'Wallet', '/wallet'],
            ['transactions', 'Transactions', '/transactions'],
            ['invite', 'Invite & Earn', '/invite-earn'],
            ['notifications', 'Notifications', '/notifications'],
            ['settings', 'Settings', '/settings'],
            ['help', 'Help Center', '/help-center'],
          ].map(([icon, label, href]) => (
            <Link key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${label === 'Wallet' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
              <AlajoIcon name={icon as any} size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/login" className="flex items-center gap-3 text-gray-300 px-3 py-2.5 rounded-xl hover:bg-white/5">
          <AlajoIcon name="logout" size={18} /> Logout
        </Link>
      </aside>

      <main className="lg:ml-[250px] p-5 sm:p-8">
        <header className="max-w-[1180px] flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[12px] uppercase tracking-[.16em] font-semibold">Wallet</p>
            <h1 className="font-bold text-[22px] mt-1">Fund Wallet</h1>
            <p className="text-gray-500 text-[14px] mt-1">Add money to your wallet for automatic contributions.</p>
          </div>
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-[#16a34a] transition" aria-label="Back to dashboard">
            <AlajoIcon name="dashboard" size={18} />
          </Link>
        </header>

        <section className="mt-6 max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7 shadow-sm">
            <div>
              <h2 className="font-semibold text-gray-900 text-[16px]">Choose Amount</h2>
              <p className="text-gray-500 text-[13px] mt-1">Select an amount to add to your Alajo wallet.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-5">
              {presets.map((value) => {
                const selected = amount === value && !custom
                return (
                  <button key={value} type="button" onClick={() => choosePreset(value)} className={`rounded-xl p-4 text-center border transition ${selected ? 'border-[#16a34a] bg-green-50 ring-1 ring-[#16a34a]/20' : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30'}`}>
                    <p className="text-gray-400 text-[12px]">Amount</p>
                    <p className="font-bold text-gray-900 mt-2">{money(value)}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-5">
              <label htmlFor="custom-amount" className="text-[13px] font-semibold text-gray-900">Enter Other Amount</label>
              <input id="custom-amount" type="number" min="1" inputMode="decimal" value={custom} onChange={(event) => { setCustom(event.target.value); setAmount(null) }} placeholder="₦ Enter amount" className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>

            <h2 className="font-semibold text-gray-900 text-[16px] mt-7">Payment Method</h2>
            <p className="text-gray-500 text-[13px] mt-1">Choose how you want to fund your wallet.</p>

            <div className="mt-4 space-y-3">
              <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3 opacity-60 cursor-not-allowed" aria-disabled="true">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center"><AlajoIcon name="wallet" size={18} className="text-[#16a34a]" /></div>
                <div className="flex-1"><p className="font-semibold text-gray-900 text-sm">Paystack</p><p className="text-gray-400 text-xs">Card, bank transfer and USSD</p></div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Coming soon</span>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3 opacity-60 cursor-not-allowed" aria-disabled="true">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center"><AlajoIcon name="wallet" size={18} className="text-blue-500" /></div>
                <div className="flex-1"><p className="font-semibold text-gray-900 text-sm">Flutterwave</p><p className="text-gray-400 text-xs">Card and bank payment</p></div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Coming soon</span>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3 opacity-60 cursor-not-allowed" aria-disabled="true">
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center"><AlajoIcon name="transactions" size={18} className="text-orange-500" /></div>
                <div className="flex-1"><p className="font-semibold text-gray-900 text-sm">Bank Transfer</p><p className="text-gray-400 text-xs">Transfer directly to Alajo account</p></div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Coming soon</span>
              </div>
            </div>

            <div className="mt-6 bg-green-50 rounded-xl p-4">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Wallet Balance</span><span className="font-semibold text-gray-900">{loading ? '—' : money(balance)}</span></div>
              <div className="flex justify-between text-sm mt-2"><span className="text-gray-500">New Balance</span><span className="font-semibold text-[#16a34a]">{loading ? '—' : money(balance + selectedAmount)}</span></div>
            </div>

            <button type="button" disabled className="w-full mt-6 bg-gray-300 text-gray-500 text-center py-3 rounded-xl font-semibold text-sm cursor-not-allowed">
              Continue
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-3">Wallet funding will be enabled when the payment provider is connected and server-side verification is in place.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
