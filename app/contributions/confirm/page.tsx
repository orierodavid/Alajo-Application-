'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { createClient } from '@/lib/supabase/client'

type Contribution = { id: string; amount: number; due_date: string; period_number: number; status: string; groupName: string }

const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

function ConfirmationContent() {
  const params = useSearchParams()
  const id = params.get('id') || ''
  const [item, setItem] = useState<Contribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      const supabase = createClient()
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) throw new Error('Please sign in to continue.')
        if (!id) throw new Error('This contribution could not be found.')
        const { data: schedule, error: scheduleError } = await supabase.from('contribution_schedules').select('id,group_member_id,period_number,amount,due_date,status').eq('id', id).maybeSingle()
        if (scheduleError) throw scheduleError
        if (!schedule) throw new Error('This contribution could not be found.')
        const { data: membership, error: membershipError } = await supabase.from('group_members').select('id,user_id,group_id').eq('id', schedule.group_member_id).eq('user_id', auth.user.id).maybeSingle()
        if (membershipError) throw membershipError
        if (!membership) throw new Error('You do not have access to this contribution.')
        const { data: group, error: groupError } = await supabase.from('groups').select('name').eq('id', membership.group_id).maybeSingle()
        if (groupError) throw groupError
        if (!['pending','overdue'].includes(schedule.status)) throw new Error(`This contribution is currently ${schedule.status} and cannot be paid.`)
        if (active) setItem({ id: schedule.id, amount: Number(schedule.amount || 0), due_date: schedule.due_date, period_number: Number(schedule.period_number), status: schedule.status, groupName: group?.name || 'Savings Group' })
      } catch (e: any) { if (active) setError(e?.message || 'Unable to load payment confirmation.') }
      finally { if (active) setLoading(false) }
    }
    load(); return () => { active = false }
  }, [id])

  if (loading) return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading payment confirmation…</main>
  if (error || !item) return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-6"><div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center"><div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><AlajoIcon name="info" /></div><h1 className="font-bold text-xl mt-4">Payment unavailable</h1><p className="text-sm text-gray-500 mt-2">{error || 'This contribution could not be found.'}</p><Link href="/contributions" className="mt-6 inline-block text-[#16a34a] font-semibold">Return to Contributions</Link></div></main>

  return <main className="min-h-screen bg-[#f8faf9] text-gray-900"><header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center"><Link href={`/contributions/make?id=${encodeURIComponent(item.id)}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><AlajoIcon name="arrow-up" size={18} className="rotate-[-90deg]" /> Back</Link></header><section className="max-w-2xl mx-auto p-5 sm:p-8"><div className="text-center mb-8"><div className="mx-auto w-12 h-12 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center"><AlajoIcon name="wallet" size={22} /></div><h1 className="text-2xl font-bold mt-4">Payment Confirmation</h1><p className="text-sm text-gray-500 mt-2">Review your contribution before confirming payment.</p></div><div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7"><div className="text-center pb-6 border-b border-gray-100"><p className="text-sm text-gray-400">Amount to pay</p><p className="text-4xl font-bold mt-1">{money(item.amount)}</p></div><div className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-gray-500">Savings Group</span><span className="font-semibold text-right">{item.groupName}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Contribution Period</span><span className="font-semibold">Month {item.period_number}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Due Date</span><span className="font-semibold">{date(item.due_date)}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Payment Source</span><span className="font-semibold">Alajo Wallet</span></div></div><div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3"><AlajoIcon name="info" size={19} className="text-amber-600 shrink-0" /><p className="text-sm text-amber-900 leading-6">Your wallet will be charged only after you confirm this payment.</p></div><button type="button" disabled className="mt-6 w-full rounded-xl bg-[#14532d] text-white py-3 font-semibold opacity-60 cursor-not-allowed">Confirm Payment</button><Link href="/contributions" className="mt-3 block w-full border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-50">Cancel</Link></div></section></main>
}

export default function PaymentConfirmationPage() { return <Suspense fallback={<main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading payment confirmation…</main>}><ConfirmationContent /></Suspense> }
