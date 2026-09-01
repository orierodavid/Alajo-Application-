import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPaystackTransaction } from '@/lib/paystack'
import { withDistributedLock } from '@/lib/resilience/distributed-lock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function expectedPaystackDomain() {
  return process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live'
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ success: false, error: 'Server configuration is incomplete.' }, { status: 500 })

  const owner = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const lock = await withDistributedLock('cron:contributions', async () => {
    const { data: finalized, error: finalizeError } = await owner.rpc('finalize_due_groups')
    if (finalizeError) throw finalizeError
    const { data: activated, error: activateError } = await owner.rpc('activate_due_groups')
    if (activateError) throw activateError
    const { data, error } = await owner.rpc('process_due_contributions')
    if (error) throw error

    let reconciled = 0
    let failed = 0
    const expectedDomain = expectedPaystackDomain()
    const now = new Date().toISOString()
    const { data: pendingPayments, error: pendingError } = await owner.from('payments').select('id,amount,currency,status,provider,provider_reference,metadata').eq('provider','paystack').in('status',['pending','processing']).filter('metadata->>source','eq','wallet_funding').filter('metadata->>environment','eq',expectedDomain).order('created_at',{ascending:true}).limit(25)
    if (pendingError) console.error('Paystack reconciliation lookup failed:', pendingError)
    else for (const payment of pendingPayments ?? []) {
      try {
        const verified = await verifyPaystackTransaction(payment.provider_reference)
        const referenceMatches = verified.reference === payment.provider_reference
        const amountMatches = verified.amount === Math.round(Number(payment.amount) * 100)
        const currencyMatches = String(verified.currency).toUpperCase() === String(payment.currency).toUpperCase()
        const domainMatches = verified.domain === expectedDomain
        if (!referenceMatches || !amountMatches || !currencyMatches || !domainMatches) continue
        if (verified.status === 'success') {
          const { data: result, error: creditError } = await owner.rpc('credit_wallet_from_paystack', { p_provider_reference: payment.provider_reference, p_verified_amount_kobo: verified.amount, p_currency: verified.currency, p_provider_payload: verified })
          if (creditError || !result?.success) console.error('Paystack reconciliation credit failed:', creditError)
          else reconciled += 1
        } else if (verified.status === 'failed' || verified.status === 'reversed') {
          const { error: updateError } = await owner.from('payments').update({ status: verified.status, updated_at: now, metadata: { ...(payment.metadata as Record<string, unknown> ?? {}), provider_status: verified.status, provider_payload: verified, reconciled_at: now } }).eq('id',payment.id).in('status',['pending','processing'])
          if (!updateError) failed += 1
        }
      } catch (e) { console.error(`Paystack reconciliation failed for ${payment.provider_reference}:`, e) }
    }
    return { finalized, activated, result: data, paystackReconciliation: { reconciled, failed } }
  }, 600)

  if (!lock.acquired) return NextResponse.json({ success: true, skipped: true, reason: 'Another contribution worker is already running.' }, { status: 200 })
  return NextResponse.json({ success: true, ...lock.value })
}
