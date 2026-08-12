import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { paystackEnvironmentFromSecret, verifyPaystackTransaction } from '@/lib/paystack'

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Webhook unavailable.' }, { status: 503 })

  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex')
  const signatureBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let event: { event?: string; data?: { reference?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  if (event.event !== 'charge.success' || !event.data?.reference) return NextResponse.json({ received: true })

  try {
    const reference = event.data.reference
    const verified = await verifyPaystackTransaction(reference)
    const admin = createAdminClient()
    const { data: payment } = await admin
      .from('payments')
      .select('id,amount,currency,user_id,provider_reference,status')
      .eq('provider', 'paystack')
      .eq('provider_reference', reference)
      .maybeSingle()

    if (!payment) return NextResponse.json({ received: true })

    const requestedAmount = Number(verified.requested_amount ?? verified.amount)
    const expectedAmountKobo = Math.round(Number(payment.amount) * 100)
    if (
      verified.domain !== paystackEnvironmentFromSecret() ||
      verified.status !== 'success' ||
      verified.reference !== reference ||
      String(verified.currency).toUpperCase() !== String(payment.currency).toUpperCase() ||
      requestedAmount !== expectedAmountKobo
    ) {
      return NextResponse.json({ received: true })
    }

    const verifiedMetadata = verified.metadata && typeof verified.metadata === 'object'
      ? verified.metadata as Record<string, unknown>
      : {}
    if (verifiedMetadata.user_id !== payment.user_id || verifiedMetadata.payment_reference !== payment.provider_reference) {
      return NextResponse.json({ received: true })
    }

    const { data: result, error } = await admin.rpc('credit_wallet_from_paystack', {
      p_provider_reference: reference,
      p_verified_amount_kobo: expectedAmountKobo,
      p_currency: verified.currency,
      p_provider_payload: verified,
    })

    if (error || !result?.success) {
      console.error('Paystack webhook credit error:', error)
      return NextResponse.json({ error: 'Unable to process webhook.' }, { status: 500 })
    }
  } catch (error) {
    console.error('Paystack webhook processing error:', error)
    return NextResponse.json({ error: 'Unable to process webhook.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
