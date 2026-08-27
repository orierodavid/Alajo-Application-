import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { initializePaystackTransaction, paystackEnvironmentFromSecret } from '@/lib/paystack'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user?.email) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) return NextResponse.json({ error: 'Enter a valid funding amount.' }, { status: 400 })

    const userId = authData.user.id
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('country_code,market_id').eq('id', userId).single()
    const countryCode = String(profile?.country_code || 'NG').toUpperCase()
    const marketQuery = profile?.market_id ? admin.from('markets').select('id,country_code,default_currency,status').eq('id', profile.market_id).maybeSingle() : admin.from('markets').select('id,country_code,default_currency,status').eq('country_code', countryCode).maybeSingle()
    const { data: market } = await marketQuery
    if (!market || !['ACTIVE','CONFIGURING','TESTING'].includes(market.status)) return NextResponse.json({ error: 'Your market is not currently enabled for funding.' }, { status: 409 })

    const { data: providerConfig } = await admin.from('market_provider_configs').select('id,environment,status,provider_definitions!inner(provider_key,provider_type,status)').eq('market_id', market.id).eq('provider_type','PAYMENT').eq('environment','LIVE').eq('status','ACTIVE').eq('provider_definitions.provider_type','PAYMENT').eq('provider_definitions.status','ACTIVE').order('priority',{ascending:true}).limit(1).maybeSingle()
    const providerDefinition = Array.isArray(providerConfig?.provider_definitions) ? providerConfig.provider_definitions[0] : providerConfig?.provider_definitions
    const providerKey = providerDefinition?.provider_key
    if (!providerConfig || !providerKey) return NextResponse.json({ error: 'No payment provider is active for your market.' }, { status: 503 })
    if (providerKey !== 'paystack_payment') return NextResponse.json({ error: `The active payment provider (${providerKey}) does not have a ZeePay checkout adapter installed yet.` }, { status: 503, headers: { 'x-provider-adapter': 'missing' } })

    const reference = `zeepay-${countryCode.toLowerCase()}-${crypto.randomUUID()}`
    const paymentId = crypto.randomUUID()
    const environment = await paystackEnvironmentFromSecret('paystack_payment')
    const now = new Date().toISOString()
    const currency = market.default_currency
    const amountMinor = Math.round(amount * 100)

    const { error: insertError } = await admin.from('payments').insert({ id: paymentId, user_id: userId, group_id: null, contribution_id: null, amount, currency, provider: 'paystack', provider_reference: reference, status: 'pending', metadata: { source: 'wallet_funding', user_id: userId, market_id: market.id, country_code: countryCode, provider_config_id: providerConfig.id, environment }, created_at: now, updated_at: now })
    if (insertError) throw insertError

    const origin = new URL(request.url).origin
    let checkout
    try {
      checkout = await initializePaystackTransaction({ email: authData.user.email, amountKobo: amountMinor, currency, reference, callbackUrl: `${origin}/api/wallet/fund/callback`, metadata: { source: 'wallet_funding', user_id: userId, market_id: market.id, country_code: countryCode, payment_reference: reference, provider_config_id: providerConfig.id, environment } })
    } catch {
      await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', paymentId).eq('status', 'pending')
      return NextResponse.json({ error: 'Unable to start payment.' }, { status: 502 })
    }

    await admin.from('notifications').insert({ id: crypto.randomUUID(), user_id: userId, type: 'payment', title: 'Wallet funding started', body: `Your ${environment === 'live' ? 'Paystack' : 'Paystack test'} wallet funding of ${currency} ${amount.toLocaleString()} is awaiting payment verification.`, metadata: { payment_id: paymentId, provider_reference: reference, provider_config_id: providerConfig.id, status: 'pending', environment, country_code: countryCode }, created_at: now })
    return NextResponse.json({ authorizationUrl: checkout.authorization_url, reference, provider: providerKey, currency, countryCode })
  } catch (error) {
    console.error('Wallet funding initialization error:', error)
    return NextResponse.json({ error: 'Unable to start wallet funding.' }, { status: 500 })
  }
}
