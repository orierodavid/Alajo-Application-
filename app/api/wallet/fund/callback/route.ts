import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { verifyPaystackTransaction } from '@/lib/paystack'

function expectedPaystackDomain() {
  return process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live'
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

    if (paymentError || !payment) return NextResponse.redirect(new URL('/wallet/success?status=failed', url.origin))
    if (verified.domain !== expectedPaystackDomain() || verified.reference !== reference || verified.currency !== payment.currency || verified.amount !== Math.round(Number(payment.amount) * 100)) {
      return NextResponse.redirect(new URL('/wallet/success?status=failed', url.origin))
    }

    if (verified.status !== 'success') {
      await admin.from('payments').update({ status: verified.status === 'reversed' ? 'reversed' : 'failed', updated_at: new Date().toISOString(), metadata: { ...(payment.metadata ?? {}), provider_status: verified.status, provider_payload: verified } }).eq('id', payment.id)
      return NextResponse.redirect(new URL(`/wallet/success?status=${encodeURIComponent(verified.status)}`, url.origin))
    }

    const { data: result, error: creditError } = await admin.rpc('credit_wallet_from_paystack', {
      p_provider_reference: reference,
      p_verified_amount_kobo: verified.amount,
      p_currency: verified.currency,
      p_provider_payload: verified,
    })

    if (creditError || !result?.success) {
      console.error('Paystack wallet credit error:', creditError)
      return NextResponse.redirect(new URL('/wallet/success?status=failed', url.origin))
    }

    return NextResponse.redirect(new URL('/wallet/success?status=success', url.origin))
  } catch (error) {
    console.error('Paystack callback verification error:', error)
    return NextResponse.redirect(new URL('/wallet/success?status=failed', url.origin))
  }
}
