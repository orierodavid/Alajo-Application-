import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePaystackAccount } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const accountNumber = String(body.accountNumber ?? '').replace(/\D/g, '')
    const bankCode = String(body.bankCode ?? '').trim()
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) return NextResponse.json({ error: 'INVALID_BANK_DETAILS' }, { status: 400 })
    const account = await resolvePaystackAccount({ accountNumber, bankCode })
    return NextResponse.json({ verified: true, accountNumber: account.account_number, accountName: account.account_name, bankCode })
  } catch (e) {
    console.error('Payout account verification failed:', e)
    return NextResponse.json({ verified: false, error: 'Unable to verify this bank account.' }, { status: 422 })
  }
}
