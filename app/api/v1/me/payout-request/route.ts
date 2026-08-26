import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
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
    const { data, error } = await supabase.rpc('create_wallet_payout_request_atomic', { p_user_id: user.id, p_amount_minor: amountMinor, p_currency: 'NGN', p_market_id: body.marketId ?? null, p_destination_bank_code: bankCode, p_destination_account_number: accountNumber, p_destination_account_name: accountName, p_idempotency_key: idempotencyKey })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, payout: data, status: 'AUTHORIZED' }, { status: 201 })
  } catch (error) {
    console.error('ZeePay payout request error:', error)
    return NextResponse.json({ error: 'Unable to create withdrawal request.' }, { status: 500 })
  }
}
