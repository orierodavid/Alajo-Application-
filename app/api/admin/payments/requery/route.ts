import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { verifyPaystackTransaction, paystackEnvironmentFromSecret } from '@/lib/paystack'
import { mutationGuard, requireIdempotencyKey } from '@/src/lib/security/request-guards'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
  const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
  if (roleError || !role) return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
  return { user, admin: createAdminClient() }
}

function metadataRecord(value: unknown) { return value && typeof value === 'object' ? value as Record<string, unknown> : {} }

export async function POST(request: Request) {
  const guard = mutationGuard(request, 'admin-payment-requery', 10)
  if (guard) return guard
  const idempotency = requireIdempotencyKey(request)
  if (idempotency.error) return idempotency.error

  let admin: ReturnType<typeof createAdminClient> | null = null
  let actorId: string | null = null
  let keyClaimed = false
  const key = idempotency.key!
  const finish = async (status: string, response: Record<string, unknown>, httpStatus: number) => {
    if (!admin || !actorId || !keyClaimed) return
    await admin.rpc('complete_idempotency_key', {
      p_scope: 'admin_payment_requery', p_idempotency_key: key, p_user_id: actorId,
      p_status: status, p_response: response, p_http_status: httpStatus,
    })
  }

  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error
    admin = auth.admin
    actorId = auth.user.id

    const claimed = await admin.rpc('claim_idempotency_key', {
      p_scope: 'admin_payment_requery', p_idempotency_key: key, p_user_id: actorId, p_ttl_seconds: 86400,
    })
    if (claimed.error) throw claimed.error
    const existing = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data
    if (!existing?.claimed) {
      if (existing?.status === 'COMPLETED' && existing.response) return NextResponse.json(existing.response, { status: existing.http_status ?? 200 })
      return NextResponse.json({ error: 'This payment requery is already being processed.' }, { status: 409 })
    }
    keyClaimed = true

    const body = await request.json().catch(() => null)
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId.trim() : ''
    const suppliedReference = typeof body?.paystackReference === 'string' ? body.paystackReference.trim() : ''
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(paymentId)) {
      const response = { error: 'Invalid payment.' }; await finish('FAILED', response, 400); return NextResponse.json(response, { status: 400 })
    }
    const { data: payment, error: paymentError } = await admin.from('payments').select('id,user_id,amount,currency,provider,provider_reference,status,metadata').eq('id', paymentId).maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) { const response = { error: 'Payment not found.' }; await finish('FAILED', response, 404); return NextResponse.json(response, { status: 404 }) }
    if (payment.provider !== 'paystack') { const response = { error: 'Only Paystack payments can be requeried.' }; await finish('FAILED', response, 400); return NextResponse.json(response, { status: 400 }) }
    if (!['pending', 'processing'].includes(payment.status)) { const response = { error: `Payment is already ${payment.status}.`, status: payment.status }; await finish('COMPLETED', response, 409); return NextResponse.json(response, { status: 409 }) }

    const reference = suppliedReference || payment.provider_reference
    if (!reference || reference.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(reference)) { const response = { error: 'Invalid Paystack reference.' }; await finish('FAILED', response, 400); return NextResponse.json(response, { status: 400 }) }
    if (suppliedReference && suppliedReference !== payment.provider_reference) { const response = { error: 'Supplied reference does not match the payment record.' }; await finish('FAILED', response, 422); return NextResponse.json(response, { status: 422 }) }

    const verified = await verifyPaystackTransaction(payment.provider_reference)
    const expectedEnvironment = await paystackEnvironmentFromSecret()
    const expectedAmountKobo = Math.round(Number(payment.amount) * 100)
    const requestedAmount = Number(verified.requested_amount ?? verified.amount)
    const amountMatches = requestedAmount === expectedAmountKobo
    const currencyMatches = String(verified.currency).toUpperCase() === String(payment.currency).toUpperCase()
    const referenceMatchesStored = verified.reference === payment.provider_reference
    const domainMatches = verified.domain === expectedEnvironment
    const verifiedMetadata = metadataRecord(verified.metadata)
    const metadataPaymentReference = typeof verifiedMetadata.payment_reference === 'string' ? verifiedMetadata.payment_reference : ''
    const metadataUserId = typeof verifiedMetadata.user_id === 'string' ? verifiedMetadata.user_id : ''
    const userIdentityMatches = metadataUserId === payment.user_id && metadataPaymentReference === payment.provider_reference

    await admin.from('audit_logs').insert({ id: crypto.randomUUID(), actor_user_id: actorId, action: 'payment_requery', entity_type: 'payment', entity_id: payment.id, previous_state: payment, new_state: { paystack_status: verified.status, amount: verified.amount, requested_amount: verified.requested_amount ?? null, currency: verified.currency, reference_matches_stored: referenceMatchesStored, metadata_identity_matches: userIdentityMatches }, reason: 'Admin manually requeried a Paystack payment.' })
    if (!amountMatches || !currencyMatches || !domainMatches || !userIdentityMatches || !referenceMatchesStored) {
      const response = { status: 'verification_failed', message: 'Paystack verification did not provide sufficient evidence to settle this payment.' }
      await finish('COMPLETED', response, 422); return NextResponse.json(response, { status: 422 })
    }

    if (verified.status === 'success') {
      const { data: result, error: creditError } = await admin.rpc('credit_wallet_from_paystack', { p_provider_reference: payment.provider_reference, p_verified_amount_kobo: expectedAmountKobo, p_currency: verified.currency, p_provider_payload: verified })
      if (creditError) throw creditError
      const response = { status: 'settled', result, paystackReference: verified.reference }
      await finish('COMPLETED', response, 200); return NextResponse.json(response)
    }
    if (verified.status === 'refunded') {
      const { error } = await admin.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString(), metadata: { ...metadataRecord(payment.metadata), paystack_status: verified.status, reconciled_at: new Date().toISOString() } }).eq('id', payment.id).eq('status', payment.status)
      if (error) throw error
      const response = { status: 'refunded', paystackStatus: verified.status }
      await finish('COMPLETED', response, 200); return NextResponse.json(response)
    }
    if (['failed', 'reversed'].includes(verified.status)) {
      const { error } = await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString(), metadata: { ...metadataRecord(payment.metadata), paystack_status: verified.status, reconciled_at: new Date().toISOString() } }).eq('id', payment.id).eq('status', payment.status)
      if (error) throw error
      const response = { status: 'not_credited', paystackStatus: verified.status }
      await finish('COMPLETED', response, 200); return NextResponse.json(response)
    }
    const response = { status: 'still_pending', paystackStatus: verified.status }
    await finish('COMPLETED', response, 200); return NextResponse.json(response)
  } catch (error) {
    console.error('Admin payment requery error:', error)
    const response = { error: 'Unable to verify this payment with Paystack.' }
    await finish('FAILED', response, 502)
    return NextResponse.json(response, { status: 502 })
  }
}
