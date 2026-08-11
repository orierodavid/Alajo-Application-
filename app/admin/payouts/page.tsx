'use client'

import { useEffect, useMemo, useState } from 'react'

const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

type Payout = { id: string; group_id: string; group_member_id: string; period_number: number; scheduled_date: string; expected_amount: number; funded_amount: number; shortfall_amount: number; status: string; provider_reference?: string | null; failure_reason?: string | null; paid_at?: string | null }
type Group = { id: string; name: string }

const statusGroups = (payouts: Payout[]) => ({
  upcoming: payouts.filter(p => ['scheduled', 'upcoming'].includes(p.status)),
  processing: payouts.filter(p => p.status === 'processing'),
  done: payouts.filter(p => ['paid', 'completed'].includes(p.status)),
  failed: payouts.filter(p => p.status === 'failed'),
})

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/payouts?admin=true', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load payouts.')
      setPayouts(data.payouts || [])
      setGroups(data.groups || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load payouts.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function retry(id: string) {
    setRetrying(id); setError('')
    try {
      const response = await fetch(`/api/payouts/${id}/retry`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to retry payout.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to retry payout.') }
    finally { setRetrying(null) }
  }

  const sections = useMemo(() => statusGroups(payouts), [payouts])
  const groupName = (id: string) => groups.find(g => g.id === id)?.name || 'Savings group'
  const Card = ({ title, items, empty, allowRetry = false }: { title: string; items: Payout[]; empty: string; allowRetry?: boolean }) => (
    <section className="rounded-2xl border border-white/40 dark:border-white/15 bg-white/55 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,.06)] p-5">
      <div className="flex items-center justify-between mb-4"><h2 className="font-bold">{title}</h2><span className="rounded-full border border-white/50 dark:border-white/15 bg-white/30 dark:bg-white/10 px-3 py-1 text-xs font-semibold">{items.length}</span></div>
      {items.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 py-5">{empty}</p> : <div className="space-y-3">{items.map(p => <div key={p.id} className="rounded-xl border border-white/45 dark:border-white/15 bg-white/35 dark:bg-white/[0.04] p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-white/50 dark:hover:bg-white/[0.08]">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{groupName(p.group_id)}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Period {p.period_number} · {p.scheduled_date}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Beneficiary: {p.group_member_id.slice(0, 10)}…</p></div><p className="font-bold">{money(p.expected_amount)}</p></div>
        {p.failure_reason && <p className="text-xs text-red-600 dark:text-red-300 mt-3">{p.failure_reason}</p>}
        {p.provider_reference && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Reference: {p.provider_reference}</p>}
        {allowRetry && <button onClick={() => retry(p.id)} disabled={retrying === p.id} className="mt-3 rounded-lg border border-white/50 dark:border-white/15 bg-white/30 dark:bg-white/10 px-3 py-2 text-xs font-semibold transition duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50">{retrying === p.id ? 'Retrying…' : 'Retry payout'}</button>}
      </div>)}</div>}
    </section>
  )

  return <main className="min-h-screen bg-gradient-to-br from-[#f5faf7] via-[#eef8f1] to-[#e8f5ec] dark:from-[#06130b] dark:via-[#081a10] dark:to-[#0a2115] text-gray-900 dark:text-gray-100 p-5 sm:p-8 lg:p-10">
    <div className="max-w-7xl mx-auto">
      <div className="mb-8"><p className="text-sm font-semibold text-[#16a34a] tracking-[.16em]">ADMINISTRATION</p><h1 className="text-3xl font-bold mt-1">Payouts</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Payouts are processed automatically when a member reaches their turn. Admin monitors results and retries failed transfers.</p></div>
      {error && <div className="mb-5 rounded-xl border border-red-200/60 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 backdrop-blur p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
      {loading ? <div className="rounded-2xl border border-white/40 dark:border-white/15 bg-white/45 dark:bg-white/[0.06] backdrop-blur-xl p-8 text-sm text-gray-500">Loading payouts…</div> : <div className="space-y-5"><Card title="Upcoming" items={sections.upcoming} empty="No upcoming automatic payouts." /><Card title="Processing" items={sections.processing} empty="No payouts are currently processing." /><Card title="Done" items={sections.done} empty="No successful payouts yet." /><Card title="Failed" items={sections.failed} empty="No failed payouts." allowRetry /></div>}
    </div>
  </main>
}
