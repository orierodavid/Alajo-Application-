import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { initializePaystackTransaction } from '@/lib/paystack'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user?.email) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 100 || amount > 10_000_000) {
      return NextResponse.json({ error: 'Enter a valid amount between ₦100 and ₦10,000,000.' }, { status: 400 })
    }

    const userId = authData.user.id
    const reference = `alajo-wallet-${crypto.randomUUID()}`
    const admin = createAdminClient()

    const { error: insertError } = await admin.from('payments').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      group_id: null,
      contribution_id: null,
      amount,
      currency: 'NGN',
      provider: 'paystack',
      provider_reference: reference,
      status: 'pending',
      metadata: { source: 'wallet_funding', user_id: userId, environment: 'test' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertError) throw insertError

    const origin = new URL(request.url).origin
    let checkout
    try {
      checkout = await initializePaystackTransaction({
        email: authData.user.email,
        amountKobo: amount * 100,
        reference,
        callbackUrl: `${origin}/api/wallet/fund/callback`,
        metadata: { source: 'wallet_funding', user_id: userId, payment_reference: reference },
      })
    } catch {
      await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('provider', 'paystack').eq('provider_reference', reference).eq('user_id', userId)
      return NextResponse.json({ error: 'Unable to start payment.' }, { status: 502 })
    }

    return NextResponse.json({ authorizationUrl: checkout.authorization_url, reference })
  } catch (error) {
    console.error('Wallet funding initialization error:', error)
    return NextResponse.json({ error: 'Unable to start wallet funding.' }, { status: 500 })
  }
}
