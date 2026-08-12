import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { verifyPaystackTransaction } from '@/lib/paystack'

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
    if (verified.domain !== 'test' || verified.status !== 'success' || verified.reference !== reference || verified.currency !== 'NGN') {
      return NextResponse.json({ received: true })
    }

    const admin = createAdminClient()
    const { data: result, error } = await admin.rpc('credit_wallet_from_paystack', {
      p_provider_reference: reference,
      p_verified_amount_kobo: verified.amount,
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
