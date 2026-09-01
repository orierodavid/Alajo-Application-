import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { createPaystackTransferRecipient, initiatePaystackTransfer } from '@/lib/paystack'
import { withDistributedLock } from '@/src/lib/resilience/distributed-lock'
import { mutationGuard, requireIdempotencyKey } from '@/src/lib/security/request-guards'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const guard = mutationGuard(request, 'payout-request', 10)
  if (guard) return guard
  const idempotency = requireIdempotencyKey(request)
  if (idempotency.error) return idempotency.error

  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

    const idempotencyKey = idempotency.key!
    const claimed = await admin.rpc('claim_idempotency_key', {
      p_scope: 'payout_request', p_idempotency_key: idempotencyKey, p_user_id: user.id, p_ttl_seconds: 86400,
    })
    if (claimed.error) throw claimed.error
    const existing = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data
    if (!existing?.claimed) {
      if (existing?.status === 'COMPLETED' && existing.response) return NextResponse.json(existing.response, { status: existing.http_status ?? 200 })
      return NextResponse.json({ error: 'This withdrawal request is already being processed.' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const amount = Number(body.amount)
    const bankCode = String(body.bankCode ?? '').trim()
    const accountNumber = String(body.accountNumber ?? '').trim()
    const accountName = String(body.accountName ?? '').trim()
    const payoutId = body.payoutId ? String(body.payoutId) : null
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0 || amount > 10_000_000) return NextResponse.json({ error: 'INVALID_AMOUNT' }, { status: 400 })
    if (!/^\d{10}$/.test(accountNumber) || !/^\d{2,10}$/.test(bankCode) || accountName.length < 2 || accountName.length > 120) return NextResponse.json({ error: 'INVALID_DESTINATION' }, { status: 400 })

    const result = await withDistributedLock(`payout:request:${user.id}:${idempotencyKey}`, async () => {
      if (payoutId) {
        const { data: membership } = await admin.from('group_members').select('id').eq('user_id', user.id).limit(100)
        const memberIds = (membership ?? []).map((m) => m.id)
        const { data: payout } = await admin.from('payouts').select('id, scheduled_date, expected_amount, funded_amount, status').eq('id', payoutId).in('group_member_id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']).maybeSingle()
        const dueStatuses = ['pending', 'scheduled', 'processing']
        if (!payout || !dueStatuses.includes(String(payout.status).toLowerCase()) || new Date(payout.scheduled_date) > new Date()) throw new Error('PAYOUT_NOT_DUE')
        if (Number(payout.funded_amount ?? 0) < Number(payout.expected_amount ?? 0)) throw new Error('PAYOUT_NOT_FUNDED')
        if (amount > Number(payout.expected_amount ?? 0)) throw new Error('AMOUNT_EXCEEDS_PAYOUT')
      }

      const amountMinor = Math.round(amount * 100)
      const { data: market, error: marketError } = await admin.from('markets').select('id').eq('country_code', 'NG').eq('status', 'ACTIVE').limit(1).maybeSingle()
      if (marketError || !market) throw new Error('NG_MARKET_NOT_CONFIGURED')
      const destinationToken = JSON.stringify({ bankCode, accountNumber, accountName, payoutId })
      const { data: payout, error: reserveError } = await admin.rpc('reserve_payout_atomic', { p_market_id: market.id, p_user_id: user.id, p_currency: 'NGN', p_amount_minor: amountMinor, p_fee_minor: 0, p_idempotency_key: idempotencyKey, p_environment: process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live', p_destination_type: 'NG_NUBAN', p_destination_token: destinationToken })
      if (reserveError || !payout) throw new Error(reserveError?.message || 'PAYOUT_RESERVATION_FAILED')
      const currentStatus = String((payout as any).status || '').toUpperCase()
      if (['PROCESSING', 'COMPLETED'].includes(currentStatus)) return { ok: true, payout, status: (payout as any).status }

      const recipient = await createPaystackTransferRecipient({ name: accountName, accountNumber, bankCode })
      const transfer = await initiatePaystackTransfer({ amountKobo: amountMinor, recipientCode: recipient.recipient_code, reference: (payout as any).reference })
      const providerReference = transfer.reference || String(transfer.id)
      const { data: marked, error: markError } = await admin.rpc('mark_payout_processing', { p_payout_request_id: (payout as any).id, p_provider_reference: providerReference })
      if (markError) throw markError
      return { ok: true, payout: marked ?? { ...(payout as any), provider_reference: providerReference, status: 'PROCESSING' }, status: 'PROCESSING' }
    }, 120)

    if (!result.acquired || !result.value) return NextResponse.json({ error: 'This withdrawal request is already being processed.' }, { status: 409 })
    const response = result.value
    await admin.rpc('complete_idempotency_key', { p_scope: 'payout_request', p_idempotency_key: idempotencyKey, p_user_id: user.id, p_status: 'COMPLETED', p_response: response, p_http_status: 201 })
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('ZeePay payout request error:', error)
    return NextResponse.json({ error: error instanceof Error && ['PAYOUT_NOT_DUE','PAYOUT_NOT_FUNDED','AMOUNT_EXCEEDS_PAYOUT'].includes(error.message) ? error.message : 'Unable to process withdrawal.' }, { status: 400 })
  }
}
