import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPaystackTransaction } from '@/lib/paystack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function expectedPaystackDomain() {
  return process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live'
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ success: false, error: 'Server configuration is incomplete.' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.rpc('process_due_contributions')
  if (error) {
    console.error('Contribution auto-debit runner failed:', error)
    return NextResponse.json({ success: false, error: 'Auto-debit processing failed.' }, { status: 500 })
  }

  let reconciled = 0
  let failed = 0
  const expectedDomain = expectedPaystackDomain()
  const now = new Date().toISOString()
  const { data: pendingPayments, error: pendingError } = await supabase
    .from('payments')
    .select('id,amount,currency,status,provider,provider_reference,metadata')
    .eq('provider', 'paystack')
    .in('status', ['pending', 'processing'])
    .filter('metadata->>source', 'eq', 'wallet_funding')
    .filter('metadata->>environment', 'eq', expectedDomain)
    .order('created_at', { ascending: true })
    .limit(25)

  if (pendingError) {
    console.error('Paystack reconciliation lookup failed:', pendingError)
  } else {
    for (const payment of pendingPayments ?? []) {
      try {
        const verified = await verifyPaystackTransaction(payment.provider_reference)
        const referenceMatches = verified.reference === payment.provider_reference
        const amountMatches = verified.amount === Math.round(Number(payment.amount) * 100)
        const currencyMatches = String(verified.currency).toUpperCase() === String(payment.currency).toUpperCase()
        const domainMatches = verified.domain === expectedDomain

        if (!referenceMatches || !amountMatches || !currencyMatches || !domainMatches) {
          console.warn('Paystack reconciliation verification mismatch', {
            paymentId: payment.id,
            referenceMatches,
            amountMatches,
            currencyMatches,
            domainMatches,
          })
          continue
        }

        if (verified.status === 'success') {
          const { data: result, error: creditError } = await supabase.rpc('credit_wallet_from_paystack', {
            p_provider_reference: payment.provider_reference,
            p_verified_amount_kobo: verified.amount,
            p_currency: verified.currency,
            p_provider_payload: verified,
          })
          if (creditError || !result?.success) {
            console.error('Paystack reconciliation credit failed:', creditError)
          } else {
            reconciled += 1
            console.log('Paystack wallet funding reconciled successfully', { paymentId: payment.id })
          }
        } else if (verified.status === 'failed' || verified.status === 'reversed') {
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: verified.status,
              updated_at: now,
              metadata: {
                ...(payment.metadata as Record<string, unknown> ?? {}),
                provider_status: verified.status,
                provider_payload: verified,
                reconciled_at: now,
              },
            })
            .eq('id', payment.id)
            .in('status', ['pending', 'processing'])
          if (!updateError) failed += 1
          else console.error('Paystack reconciliation status update failed:', updateError)
        }
      } catch (reconcileError) {
        console.error(`Paystack reconciliation failed for ${payment.provider_reference}:`, reconcileError)
      }
    }
  }

  return NextResponse.json({ success: true, result: data, paystackReconciliation: { reconciled, failed } })
}
