'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { createClient } from '@/lib/supabase/client'

type Contribution = {
  id: string
  amount: number
  due_date: string
  status: string
  period_number: number
  groupName: string
}

const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

function MakeContributionContent() {
  const params = useSearchParams()
  const id = params.get('id') || ''
  const [contribution, setContribution] = useState<Contribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      const supabase = createClient()

      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) {
          if (active) setError('Please sign in to make a contribution.')
          return
        }

        if (!id) {
          if (active) setError('This contribution could not be found.')
          return
        }

        const { data: schedule, error: scheduleError } = await supabase
          .from('contribution_schedules')
          .select('id,group_member_id,period_number,amount,due_date,status')
          .eq('id', id)
          .maybeSingle()

        if (scheduleError) throw scheduleError
        if (!schedule) {
          if (active) setError('This contribution could not be found.')
          return
        }

        // Never trust the URL alone: verify that this schedule belongs to the signed-in member.
        const { data: membership, error: membershipError } = await supabase
          .from('group_members')
          .select('id,user_id,group_id')
          .eq('id', schedule.group_member_id)
          .eq('user_id', auth.user.id)
          .maybeSingle()

        if (membershipError) throw membershipError
        if (!membership) {
          if (active) setError('You do not have access to this contribution.')
          return
        }

        const { data: group, error: groupError } = await supabase
          .from('groups')
          .select('name')
          .eq('id', membership.group_id)
          .maybeSingle()

        if (groupError) throw groupError

        if (schedule.status !== 'pending' && schedule.status !== 'overdue') {
          if (active) setError(`This contribution is currently ${schedule.status} and cannot be paid.`)
          return
        }

        if (active) {
          setContribution({
            id: schedule.id,
            amount: Number(schedule.amount || 0),
            due_date: schedule.due_date,
            status: schedule.status,
            period_number: Number(schedule.period_number),
            groupName: group?.name || 'Savings Group',
          })
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Unable to load this contribution.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [id])

  if (loading) {
    return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading contribution…</main>
  }

  if (error || !contribution) {
    return (
      <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
            <AlajoIcon name="info" />
          </div>
          <h1 className="font-bold text-xl mt-4">Contribution unavailable</h1>
          <p className="text-sm text-gray-500 mt-2">{error || 'This contribution could not be found.'}</p>
          <Link href="/contributions" className="mt-6 inline-block text-[#16a34a] font-semibold">Return to Contributions</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8faf9] text-gray-900">
      <header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center">
        <Link href="/contributions" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <AlajoIcon name="arrow-up" size={18} className="rotate-[-90deg]" />
          Contributions
        </Link>
      </header>

      <section className="max-w-3xl mx-auto p-5 sm:p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center">
            <AlajoIcon name="wallet" size={22} />
          </div>
          <h1 className="text-2xl font-bold mt-4">Make Contribution</h1>
          <p className="text-sm text-gray-500 mt-2">Review the contribution created by your administrator.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-5 border-b border-gray-100 pb-6">
            <div>
              <p className="text-sm text-gray-400">Contribution Amount</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{money(contribution.amount)}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold whitespace-nowrap">
              {contribution.status === 'overdue' ? 'Overdue' : `Due ${date(contribution.due_date)}`}
            </span>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#f9fafb] border border-gray-100 p-4">
              <p className="text-xs text-gray-400">Savings Group</p>
              <p className="font-semibold text-gray-900 mt-1">{contribution.groupName}</p>
            </div>
            <div className="rounded-xl bg-[#f9fafb] border border-gray-100 p-4">
              <p className="text-xs text-gray-400">Contribution Period</p>
              <p className="font-semibold text-gray-900 mt-1">Month {contribution.period_number}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Payment source</span>
              <span className="font-semibold">Alajo Wallet</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Amount to pay</span>
              <span className="font-semibold">{money(contribution.amount)}</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-green-50 border border-green-100 p-4 flex gap-3">
            <AlajoIcon name="info" size={19} className="text-[#16a34a] shrink-0" />
            <p className="text-sm text-green-900 leading-6">
              This amount and contribution period were created by the administrator. Alajo will not recalculate them from the group settings.
            </p>
          </div>

          <Link
            href={`/contributions/confirm?id=${encodeURIComponent(contribution.id)}`}
            className="mt-6 block w-full bg-[#14532d] hover:bg-[#123f24] text-white text-center py-3 rounded-xl font-semibold transition"
          >
            Continue to Payment Confirmation
          </Link>

          <Link href="/contributions" className="mt-3 block w-full border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
            Cancel
          </Link>
        </div>
      </section>
    </main>
  )
}

export default function MakeContributionClient() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading contribution…</main>}>
      <MakeContributionContent />
    </Suspense>
  )
}
