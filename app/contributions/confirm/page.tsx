'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { createClient } from '@/lib/supabase/client'

type Contribution = { id: string; amount: number; due_date: string; period_number: number; status: string; groupName: string }

const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

function friendlyPaymentError(error: any) {
  const message = String(error?.message || '')
  if (message.includes('INSUFFICIENT_WALLET_BALANCE')) return 'Insufficient wallet balance for this contribution.'
  if (message.includes('CONTRIBUTION_NOT_PAYABLE')) return 'This contribution is no longer available for payment.'
  if (message.includes('CONTRIBUTION_NOT_FOUND')) return 'This contribution could not be found.'
  if (message.includes('PARTIAL_PAYMENT_NOT_SUPPORTED')) return 'This contribution has a partial payment and cannot be settled through this wallet flow.'
  return message || 'Payment could not be completed.'
}

function ConfirmationContent() {
  const params = useSearchParams()
  const id = params.get('id') || ''
  const [item, setItem] = useState<Contribution | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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
        const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', auth.user.id).maybeSingle()
        if (active) { setWalletBalance(Number(wallet?.balance || 0)); setItem({ id: schedule.id, amount: Number(schedule.amount || 0), due_date: schedule.due_date, period_number: Number(schedule.period_number), status: schedule.status, groupName: group?.name || 'Savings Group' }) }
      } catch (e: any) { if (active) setError(friendlyPaymentError(e)) }
      finally { if (active) setLoading(false) }
    }
    load(); return () => { active = false }
  }, [id])

  async function confirmPayment() {
    if (!item || paying) return
    setError(''); setMessage('')
    if (walletBalance < item.amount) { setError(`Insufficient wallet balance. You need ${money(item.amount - walletBalance)} more.`); return }
    setPaying(true)
    const supabase = createClient()
    try {
      const { data, error: rpcError } = await supabase.rpc('pay_contribution', { p_schedule_id: item.id })
      if (rpcError) throw rpcError
      const result = Array.isArray(data) ? data[0] : data
      if (!result?.success) throw new Error(result?.message || 'Payment could not be completed.')
      setWalletBalance(Number(result.wallet_balance))
      setItem(prev => prev ? { ...prev, status: 'paid' } : prev)
      setMessage('Contribution payment confirmed successfully.')
    } catch (e: any) {
      setError(friendlyPaymentError(e))
    } finally { setPaying(false) }
  }

  if (loading) return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading payment confirmation…</main>
  if (error && !item) return <main className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-6"><div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center"><div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><AlajoIcon name="info" /></div><h1 className="font-bold text-xl mt-4">Payment unavailable</h1><p className="text-sm text-gray-500 mt-2">{error}</p><Link href="/contributions" className="mt-6 inline-block text-[#16a34a] font-semibold">Return to Contributions</Link></div></main>

  const insufficient = walletBalance < (item?.amount || 0)
  return <main className="min-h-screen bg-[#f8faf9] text-gray-900"><header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center"><Link href={`/contributions/make?id=${encodeURIComponent(item!.id)}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><AlajoIcon name="arrow-up" size={18} className="rotate-[-90deg]" /> Back</Link></header><section className="max-w-2xl mx-auto p-5 sm:p-8"><div className="text-center mb-8"><div className="mx-auto w-12 h-12 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center"><AlajoIcon name="wallet" size={22} /></div><h1 className="text-2xl font-bold mt-4">Payment Confirmation</h1><p className="text-sm text-gray-500 mt-2">Review your contribution before confirming payment.</p></div><div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7"><div className="text-center pb-6 border-b border-gray-100"><p className="text-sm text-gray-400">Amount to pay</p><p className="text-4xl font-bold mt-1">{money(item!.amount)}</p></div><div className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-gray-500">Savings Group</span><span className="font-semibold text-right">{item!.groupName}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Contribution Period</span><span className="font-semibold">Month {item!.period_number}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Due Date</span><span className="font-semibold">{date(item!.due_date)}</span></div><div className="flex justify-between gap-4"><span className="text-gray-500">Wallet Balance</span><span className="font-semibold">{money(walletBalance)}</span></div></div>{message && <div className="mt-6 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-800">{message}</div>}{error && <div className="mt-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">{error}</div>}{insufficient && !message ? <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-4"><p className="text-sm text-amber-900">Your wallet balance is insufficient for this contribution.</p><Link href="/wallet" className="mt-3 inline-flex rounded-lg bg-[#14532d] text-white px-4 py-2 font-semibold text-sm">Fund Wallet</Link></div> : !message ? <button type="button" onClick={confirmPayment} disabled={paying} className="mt-6 w-full rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed">{paying ? 'Processing Payment…' : `Confirm Payment — ${money(item!.amount)}`}</button> : <Link href="/contributions" className="mt-6 block w-full rounded-xl bg-[#14532d] text-white text-center py-3 font-semibold">Back to Contributions</Link>}<Link href="/contributions" className="mt-3 block w-full border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-50">Cancel</Link></div></section></main>
}

export default function PaymentConfirmationPage() { return <Suspense fallback={<main className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading payment confirmation…</main>}><ConfirmationContent /></Suspense> }
