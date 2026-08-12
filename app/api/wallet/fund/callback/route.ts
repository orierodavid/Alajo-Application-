import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { verifyPaystackTransaction } from '@/lib/paystack'

function expectedPaystackEnvironment() {
  const key = process.env.PAYSTACK_SECRET_KEY ?? ''
  if (key.startsWith('sk_live_')) return 'live'
  if (key.startsWith('sk_test_')) return 'test'
  return process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live'
}

function metadataRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const reference = url.searchParams.get('reference')
  if (!reference) return NextResponse.redirect(new URL('/wallet/success?status=failed', url.origin))

  try {
    const verified = await verifyPaystackTransaction(reference)
    const admin = createAdminClient()
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .select('id,user_id,amount,currency,status,provider,provider_reference,metadata')
      .eq('provider', 'paystack')
      .eq('provider_reference', reference)
      .maybeSingle()

    if (paymentError || !payment) return NextResponse.redirect(new URL('/wallet/success?status=reconciliation', url.origin))
    const verifiedMetadata = metadataRecord(verified.metadata)
    const identityMatches = verifiedMetadata.user_id === payment.user_id && verifiedMetadata.payment_reference === payment.provider_reference
    const amountMatches = verified.amount === Math.round(Number(payment.amount) * 100)
    const currencyMatches = String(verified.currency).toUpperCase() === String(payment.currency).toUpperCase()
    const domainMatches = verified.domain === expectedPaystackEnvironment()
    if (!identityMatches || !amountMatches || !currencyMatches || !domainMatches || verified.reference !== payment.provider_reference) {
      await admin.from('payments').update({ metadata: { ...metadataRecord(payment.metadata), last_verification: { status: verified.status, reference: verified.reference, amount: verified.amount, currency: verified.currency, domain: verified.domain, identityMatches, amountMatches, currencyMatches, domainMatches }, verified_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', payment.id)
      return NextResponse.redirect(new URL('/wallet/success?status=reconciliation', url.origin))
    }

    if (verified.status !== 'success') {
      await admin.from('payments').update({ status: verified.status === 'reversed' ? 'reversed' : 'failed', updated_at: new Date().toISOString(), metadata: { ...metadataRecord(payment.metadata), provider_status: verified.status, provider_payload: verified } }).eq('id', payment.id)
      return NextResponse.redirect(new URL(`/wallet/success?status=${encodeURIComponent(verified.status)}`, url.origin))
    }

    const { data: result, error: creditError } = await admin.rpc('credit_wallet_from_paystack', { p_provider_reference: reference, p_verified_amount_kobo: verified.amount, p_currency: verified.currency, p_provider_payload: verified })
    if (creditError || !result?.success) {
      console.error('Paystack wallet credit error:', creditError)
      return NextResponse.redirect(new URL('/wallet/success?status=reconciliation', url.origin))
    }
    return NextResponse.redirect(new URL('/wallet/success?status=success', url.origin))
  } catch (error) {
    console.error('Paystack callback verification error:', error)
    return NextResponse.redirect(new URL('/wallet/success?status=reconciliation', url.origin))
  }
}
