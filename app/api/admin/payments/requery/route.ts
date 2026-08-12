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

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error
    const body = await request.json().catch(() => null)
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : ''
    if (!paymentId) return NextResponse.json({ error: 'Payment is required.' }, { status: 400 })
    const { admin, user } = auth
    const { data: payment, error: paymentError } = await admin.from('payments').select('id,user_id,amount,currency,provider,provider_reference,status,metadata').eq('id', paymentId).maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    if (payment.provider !== 'paystack') return NextResponse.json({ error: 'Only Paystack payments can be requeried.' }, { status: 400 })
    if (!['pending','processing'].includes(payment.status)) return NextResponse.json({ error: `Payment is already ${payment.status}.`, status: payment.status }, { status: 409 })

    const verified = await verifyPaystackTransaction(payment.provider_reference)
    const expectedEnvironment = process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live'
    const amountMatches = Number(verified.amount) === Math.round(Number(payment.amount) * 100)
    const currencyMatches = String(verified.currency).toUpperCase() === String(payment.currency).toUpperCase()
    const referenceMatches = verified.reference === payment.provider_reference
    const domainMatches = verified.domain === expectedEnvironment

    await admin.from('audit_logs').insert({ id: crypto.randomUUID(), actor_user_id: user.id, action: 'payment_requery', entity_type: 'payment', entity_id: payment.id, previous_state: payment, new_state: { paystack_status: verified.status, domain: verified.domain, amount: verified.amount, currency: verified.currency }, reason: 'Admin manually requeried Paystack transaction.' })

    if (!referenceMatches || !amountMatches || !currencyMatches || !domainMatches) {
      return NextResponse.json({ status: 'verification_failed', message: 'Paystack verification did not match the Alajo payment.', checks: { referenceMatches, amountMatches, currencyMatches, domainMatches } }, { status: 422 })
    }

    if (verified.status === 'success') {
      const { data: result, error: creditError } = await admin.rpc('credit_wallet_from_paystack', { p_provider_reference: payment.provider_reference, p_verified_amount_kobo: Number(verified.amount), p_currency: verified.currency, p_provider_payload: verified })
      if (creditError) throw creditError
      return NextResponse.json({ status: 'settled', result })
    }

    if (['failed','reversed'].includes(verified.status)) {
      const nextStatus = verified.status === 'reversed' ? 'failed' : 'failed'
      const { error } = await admin.from('payments').update({ status: nextStatus, updated_at: new Date().toISOString(), metadata: { ...(payment.metadata as Record<string, unknown> ?? {}), paystack_status: verified.status, reconciled_at: new Date().toISOString() } }).eq('id', payment.id).eq('status', payment.status)
      if (error) throw error
      return NextResponse.json({ status: 'not_credited', paystackStatus: verified.status })
    }

    return NextResponse.json({ status: 'still_pending', paystackStatus: verified.status })
  } catch (error) {
    console.error('Admin payment requery error:', error)
    return NextResponse.json({ error: 'Unable to verify this payment with Paystack.' }, { status: 502 })
  }
}
