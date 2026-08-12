import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { verifyPaystackTransaction } from '@/lib/paystack'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
  const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
  if (roleError || !role) return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
  return { user, admin: createAdminClient() }
}

function expectedPaystackEnvironment() {
  const key = process.env.PAYSTACK_SECRET_KEY ?? ''
  if (key.startsWith('sk_live_')) return 'live'
  if (key.startsWith('sk_test_')) return 'test'
  return process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live'
}

function metadataRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error
    const body = await request.json().catch(() => null)
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : ''
    const suppliedReference = typeof body?.paystackReference === 'string' ? body.paystackReference.trim() : ''
    if (!paymentId) return NextResponse.json({ error: 'Payment is required.' }, { status: 400 })

    const { admin, user } = auth
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .select('id,user_id,amount,currency,provider,provider_reference,status,metadata')
      .eq('id', paymentId)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    if (payment.provider !== 'paystack') return NextResponse.json({ error: 'Only Paystack payments can be requeried.' }, { status: 400 })
    if (!['pending', 'processing'].includes(payment.status)) return NextResponse.json({ error: `Payment is already ${payment.status}.`, status: payment.status }, { status: 409 })

    const reference = suppliedReference || payment.provider_reference
    const verified = await verifyPaystackTransaction(reference)
    const expectedEnvironment = expectedPaystackEnvironment()
    const amountMatches = Number(verified.amount) === Math.round(Number(payment.amount) * 100)
    const currencyMatches = String(verified.currency).toUpperCase() === String(payment.currency).toUpperCase()
    const referenceMatchesStored = verified.reference === payment.provider_reference
    const domainMatches = verified.domain === expectedEnvironment
    const verifiedMetadata = metadataRecord(verified.metadata)
    const metadataPaymentReference = typeof verifiedMetadata.payment_reference === 'string' ? verifiedMetadata.payment_reference : ''
    const metadataUserId = typeof verifiedMetadata.user_id === 'string' ? verifiedMetadata.user_id : ''
    const userIdentityMatches = metadataUserId === payment.user_id && metadataPaymentReference === payment.provider_reference

    await admin.from('audit_logs').insert({
      id: crypto.randomUUID(),
      actor_user_id: user.id,
      action: 'payment_requery',
      entity_type: 'payment',
      entity_id: payment.id,
      previous_state: payment,
      new_state: {
        paystack_reference_checked: reference,
        paystack_status: verified.status,
        domain: verified.domain,
        amount: verified.amount,
        currency: verified.currency,
        reference_matches_stored: referenceMatchesStored,
        metadata_identity_matches: userIdentityMatches,
      },
      reason: suppliedReference ? 'Admin manually requeried a supplied Paystack reference.' : 'Admin manually requeried the stored Paystack reference.',
    })

    if (!amountMatches || !currencyMatches || !domainMatches || !userIdentityMatches) {
      return NextResponse.json({
        status: 'verification_failed',
        message: 'Paystack verification did not provide sufficient evidence to settle this Alajo payment.',
        checks: {
          amountMatches,
          currencyMatches,
          domainMatches,
          metadataIdentityMatches: userIdentityMatches,
          storedReferenceMatches: referenceMatchesStored,
        },
        paystack: {
          reference: verified.reference,
          status: verified.status,
          amount: verified.amount,
          currency: verified.currency,
          domain: verified.domain,
          gatewayResponse: verified.gateway_response ?? null,
        },
      }, { status: 422 })
    }

    if (verified.status === 'success') {
      const { data: result, error: creditError } = await admin.rpc('credit_wallet_from_paystack', {
        p_provider_reference: payment.provider_reference,
        p_verified_amount_kobo: Number(verified.amount),
        p_currency: verified.currency,
        p_provider_payload: verified,
      })
      if (creditError) throw creditError
      return NextResponse.json({ status: 'settled', result, paystackReference: verified.reference })
    }

    if (verified.status === 'refunded') {
      const { error } = await admin.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString(), metadata: { ...metadataRecord(payment.metadata), paystack_status: verified.status, reconciled_at: new Date().toISOString() } }).eq('id', payment.id).eq('status', payment.status)
      if (error) throw error
      return NextResponse.json({ status: 'refunded', paystackStatus: verified.status })
    }

    if (['failed', 'reversed'].includes(verified.status)) {
      const { error } = await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString(), metadata: { ...metadataRecord(payment.metadata), paystack_status: verified.status, reconciled_at: new Date().toISOString() } }).eq('id', payment.id).eq('status', payment.status)
      if (error) throw error
      return NextResponse.json({ status: 'not_credited', paystackStatus: verified.status })
    }

    return NextResponse.json({ status: 'still_pending', paystackStatus: verified.status })
  } catch (error) {
    console.error('Admin payment requery error:', error)
    return NextResponse.json({ error: 'Unable to verify this payment with Paystack.' }, { status: 502 })
  }
}
