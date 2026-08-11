'use client'

import { useEffect, useMemo, useState } from 'react'

const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

type Payout = { id: string; group_id: string; group_member_id: string; period_number: number; scheduled_date: string; expected_amount: number; funded_amount: number; shortfall_amount: number; status: string; provider_reference?: string | null; failure_reason?: string | null; paid_at?: string | null }
type Group = { id: string; name: string }

const tabs = ['All', 'Upcoming', 'Processing', 'Done', 'Failed'] as const

type Tab = typeof tabs[number]

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [tab, setTab] = useState<Tab>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/payouts?admin=true', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load payouts.')
      setPayouts(data.payouts || []); setGroups(data.groups || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load payouts.') }
    finally { setLoading(false) }
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

  const groupName = (id: string) => groups.find(g => g.id === id)?.name || 'Savings group'
  const filtered = useMemo(() => payouts.filter(p => {
    if (tab === 'Upcoming') return ['scheduled', 'upcoming'].includes(p.status)
    if (tab === 'Processing') return p.status === 'processing'
    if (tab === 'Done') return ['paid', 'completed'].includes(p.status)
    if (tab === 'Failed') return p.status === 'failed'
    return true
  }), [payouts, tab])
  const count = (name: Tab) => payouts.filter(p => name === 'All' ? true : name === 'Upcoming' ? ['scheduled','upcoming'].includes(p.status) : name === 'Processing' ? p.status === 'processing' : name === 'Done' ? ['paid','completed'].includes(p.status) : p.status === 'failed').length
  const statusClass = (status: string) => status === 'paid' || status === 'completed' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : status === 'failed' ? 'bg-red-500/15 text-red-700 dark:text-red-300' : status === 'processing' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-white/30 dark:bg-white/10 text-gray-700 dark:text-gray-200'

  return <main className="min-h-screen bg-gradient-to-br from-[#f5faf7] via-[#eef8f1] to-[#e8f5ec] dark:from-[#06130b] dark:via-[#081a10] dark:to-[#0a2115] text-gray-900 dark:text-gray-100 p-5 sm:p-8 lg:p-10">
    <div className="max-w-7xl mx-auto">
      <div className="mb-7"><p className="text-sm font-semibold text-[#16a34a] tracking-[.16em]">ADMINISTRATION</p><h1 className="text-3xl font-bold mt-1">Payouts</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Automatic payouts are processed when each member reaches their turn. Admin monitors results and retries failed transfers.</p></div>
      <div className="flex flex-wrap gap-2 mb-5">{tabs.map(name => <button key={name} onClick={() => setTab(name)} className={`rounded-xl border border-white/50 dark:border-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition duration-200 hover:-translate-y-0.5 active:scale-95 ${tab === name ? 'bg-[#16a34a]/20 text-[#15803d] dark:text-[#86efac] shadow-[0_8px_25px_rgba(22,163,74,.12)]' : 'bg-white/30 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300'}`}>{name} <span className="ml-1 opacity-60">{count(name)}</span></button>)}</div>
      {error && <div className="mb-5 rounded-xl border border-red-200/60 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 backdrop-blur p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-white/50 dark:border-white/15 bg-white/45 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_15px_45px_rgba(0,0,0,.07)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-white/30 dark:bg-white/[0.06] border-b border-white/50 dark:border-white/15"><tr>{['Status','User / Member','Group','Period','Payout date','Amount','Provider reference','Action'].map(h => <th key={h} className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/40 dark:divide-white/10">
              {loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading payouts…</td></tr> : filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No payouts in this view.</td></tr> : filtered.map(p => <tr key={p.id} className="transition duration-150 hover:bg-white/35 dark:hover:bg-white/[0.05]">
                <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(p.status)}`}>{p.status}</span></td>
                <td className="px-4 py-4 font-medium">{p.group_member_id.slice(0, 10)}…</td>
                <td className="px-4 py-4">{groupName(p.group_id)}</td>
                <td className="px-4 py-4">{p.period_number}</td>
                <td className="px-4 py-4 whitespace-nowrap">{p.scheduled_date}</td>
                <td className="px-4 py-4 font-semibold whitespace-nowrap">{money(p.expected_amount)}</td>
                <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{p.provider_reference || '—'}{p.failure_reason && <div className="mt-1 text-red-600 dark:text-red-300">{p.failure_reason}</div>}</td>
                <td className="px-4 py-4">{p.status === 'failed' ? <button onClick={() => retry(p.id)} disabled={retrying === p.id} className="rounded-lg border border-white/50 dark:border-white/15 bg-white/30 dark:bg-white/10 px-3 py-2 text-xs font-semibold transition duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50">{retrying === p.id ? 'Retrying…' : 'Retry'}</button> : <span className="text-gray-400">—</span>}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
}
