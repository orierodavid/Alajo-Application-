import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { randomUUID } from 'crypto'
import { createPaystackTransferRecipient, initiatePaystackTransfer } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const amount = Number(body.amount)
    const bankCode = String(body.bankCode ?? '').trim()
    const accountNumber = String(body.accountNumber ?? '').trim()
    const accountName = String(body.accountName ?? '').trim()
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'INVALID_AMOUNT' }, { status: 400 })
    if (!/^\d{10}$/.test(accountNumber) || !bankCode || !accountName) return NextResponse.json({ error: 'INVALID_DESTINATION' }, { status: 400 })
    const amountMinor = Math.round(amount * 100)
    const idempotencyKey = String(body.idempotencyKey || randomUUID())
    const { data: market, error: marketError } = await admin.from('markets').select('id').eq('country_code', 'NG').eq('status', 'ACTIVE').limit(1).maybeSingle()
    if (marketError || !market) return NextResponse.json({ error: 'NG_MARKET_NOT_CONFIGURED' }, { status: 503 })
    const destinationToken = JSON.stringify({ bankCode, accountNumber, accountName })
    const { data: payout, error: reserveError } = await admin.rpc('reserve_payout_atomic', { p_market_id: market.id, p_user_id: user.id, p_currency: 'NGN', p_amount_minor: amountMinor, p_fee_minor: 0, p_idempotency_key: idempotencyKey, p_environment: process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live', p_destination_type: 'NG_NUBAN', p_destination_token: destinationToken })
    if (reserveError || !payout) return NextResponse.json({ error: reserveError?.message || 'PAYOUT_RESERVATION_FAILED' }, { status: 400 })
    const currentStatus = String((payout as any).status || '').toUpperCase()
    if (['PROCESSING', 'COMPLETED'].includes(currentStatus)) return NextResponse.json({ ok: true, payout, status: (payout as any).status })
    try {
      const recipient = await createPaystackTransferRecipient({ name: accountName, accountNumber, bankCode })
      const transfer = await initiatePaystackTransfer({ amountKobo: amountMinor, recipientCode: recipient.recipient_code, reference: (payout as any).reference })
      const providerReference = transfer.reference || String(transfer.id)
      const { data: marked, error: markError } = await admin.rpc('mark_payout_processing', { p_payout_request_id: (payout as any).id, p_provider_reference: providerReference })
      if (markError) throw markError
      return NextResponse.json({ ok: true, payout: marked ?? { ...(payout as any), provider_reference: providerReference, status: 'PROCESSING' }, status: 'PROCESSING' }, { status: 201 })
    } catch (providerError) {
      const reason = providerError instanceof Error ? providerError.message : 'PAYSTACK_TRANSFER_FAILED'
      await admin.rpc('fail_payout_atomic', { p_payout_request_id: (payout as any).id, p_failure_code: 'PROVIDER_TRANSFER_FAILED', p_failure_reason: reason })
      return NextResponse.json({ error: 'WITHDRAWAL_FAILED', detail: reason }, { status: 502 })
    }
  } catch (error) {
    console.error('ZeePay wallet payout error:', error)
    return NextResponse.json({ error: 'Unable to process withdrawal.' }, { status: 500 })
  }
}
