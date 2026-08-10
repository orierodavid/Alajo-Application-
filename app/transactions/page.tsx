'use client'

import { useEffect, useMemo, useState } from 'react'

type Transaction = { id: string; type: 'contribution' | 'payout'; amount: number; currency: string; status: string; provider: string | null; reference: string | null; date: string; groupId: string | null; contributionId: string | null }

const naira = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount)

export default function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<'all' | 'contribution' | 'payout'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/transactions', { cache: 'no-store' }).then(async (r) => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Unable to load transactions')
      setRows(data.transactions ?? [])
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => filter === 'all' ? rows : rows.filter((r) => r.type === filter), [rows, filter])
  const paid = rows.filter((r) => r.status === 'paid' || r.status === 'successful' || r.status === 'completed')
  const total = paid.reduce((sum, r) => sum + r.amount, 0)

  return <main className="min-h-screen bg-[#f7f8f9] p-8 text-gray-900">
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Transactions</h1><p className="text-sm text-gray-500 mt-1">Your wallet, contribution and payout activity.</p></div>
        <a href="/wallet" className="rounded-lg bg-[#14532d] px-4 py-2 text-sm font-semibold text-white">Fund Wallet</a>
      </div>

      <section className="grid gap-4 md:grid-cols-3 mt-6">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Transactions</p><p className="mt-2 text-2xl font-bold">{rows.length}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Recorded successful value</p><p className="mt-2 text-2xl font-bold">{naira(total)}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Contributions</p><p className="mt-2 text-2xl font-bold">{rows.filter(r => r.type === 'contribution').length}</p></div>
      </section>

      <section className="mt-6 rounded-xl border bg-white overflow-hidden">
        <div className="flex gap-2 border-b p-4">
          {(['all', 'contribution', 'payout'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${filter === item ? 'bg-[#14532d] text-white' : 'bg-gray-100 text-gray-600'}`}>{item}</button>)}
        </div>
        {loading ? <div className="p-8 text-sm text-gray-500">Loading transactions…</div> : error ? <div className="p-8 text-sm text-red-600">{error}</div> : filtered.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">No transactions recorded yet.</div> : <div className="divide-y">
          {filtered.map((tx) => <div key={`${tx.type}-${tx.id}`} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">{tx.type === 'payout' ? '↗' : '↘'}</div><div><p className="font-semibold capitalize">{tx.type}</p><p className="text-xs text-gray-500">{new Date(tx.date).toLocaleString('en-NG')}</p></div></div>
            <div className="text-left md:text-right"><p className="font-bold">{naira(tx.amount)}</p><p className="text-xs capitalize text-gray-500">{tx.status.replaceAll('_', ' ')}</p></div>
          </div>)}
        </div>}
      </section>
    </div>
  </main>
}
