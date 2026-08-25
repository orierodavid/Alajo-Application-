import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'
import { createPaystackCustomer, validatePaystackCustomer } from '@/lib/paystack'

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return jsonError('Your session has expired. Please sign in again.', 401, 'AUTH_REQUIRED')

    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const bvn = typeof body?.bvn === 'string' ? body.bvn.replace(/\D/g, '') : ''
    const bankCode = typeof body?.bankCode === 'string' ? body.bankCode.trim() : ''
    const accountNumber = typeof body?.accountNumber === 'string' ? body.accountNumber.replace(/\D/g, '') : ''
    const middleName = typeof body?.middleName === 'string' ? body.middleName.trim() : undefined

    if (!/^\d{11}$/.test(bvn)) return jsonError('BVN must contain exactly 11 digits.', 400, 'INVALID_BVN')
    if (!bankCode) return jsonError('Select your bank.', 400, 'BANK_REQUIRED')
    if (!/^\d{10}$/.test(accountNumber)) return jsonError('Account number must contain exactly 10 digits.', 400, 'INVALID_ACCOUNT_NUMBER')

    const admin = createAdminClient()
    const [{ data: profile, error: profileError }, { data: market, error: marketError }] = await Promise.all([
      admin.from('profiles').select('full_name, phone, email').eq('id', user.id).single(),
      admin.from('markets').select('id, country_code, default_currency, status').eq('country_code', 'NG').single(),
    ])

    if (profileError || !profile) return jsonError('Complete your profile before verification.', 400, 'PROFILE_INCOMPLETE')
    if (marketError || !market || market.status !== 'ACTIVE') return jsonError('Nigeria onboarding is not currently active.', 409, 'MARKET_NOT_ACTIVE')

    const { data: kycConfig, error: kycConfigError } = await admin
      .from('market_provider_configs')
      .select('id, provider_definitions!inner(provider_key, provider_type, status)')
      .eq('market_id', market.id).eq('provider_type', 'KYC').eq('environment', 'LIVE').eq('status', 'ACTIVE')
      .eq('provider_definitions.provider_type', 'KYC').eq('provider_definitions.status', 'ACTIVE')
      .order('priority', { ascending: true }).limit(1).maybeSingle()
    if (kycConfigError || !kycConfig) return jsonError('KYC provider is not configured.', 503, 'KYC_PROVIDER_NOT_CONFIGURED')

    const providerKey = Array.isArray(kycConfig.provider_definitions) ? null : kycConfig.provider_definitions?.provider_key
    if (!providerKey || !String(providerKey).startsWith('paystack')) return jsonError('The configured KYC provider has no installed adapter.', 503, 'KYC_PROVIDER_ADAPTER_UNAVAILABLE')

    const email = profile.email ?? user.email
    const phone = profile.phone
    if (!email || !phone || !profile.full_name) return jsonError('Complete your name, phone and email before verification.', 400, 'PROFILE_INCOMPLETE')

    const parts = profile.full_name.trim().split(/\s+/)
    const firstName = parts[0]
    const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0]

    let { data: providerCustomer } = await admin.from('provider_customers')
      .select('id, provider_customer_code, provider_key')
      .eq('market_id', market.id).eq('user_id', user.id).eq('provider_key', providerKey).maybeSingle()

    if (!providerCustomer?.provider_customer_code) {
      const customer = await createPaystackCustomer({ email, firstName, lastName, phone, metadata: { alajo_user_id: user.id, market: 'NG' } })
      const { data: created, error: customerError } = await admin.from('provider_customers').upsert({
        market_id: market.id, user_id: user.id, provider_key: providerKey, provider_customer_id: String(customer.id), provider_customer_code: customer.customer_code, status: 'PENDING', metadata: { source: 'kyc' },
      }, { onConflict: 'market_id,user_id,provider_key' }).select('id, provider_customer_code, provider_key').single()
      if (customerError || !created) throw new Error('PROVIDER_CUSTOMER_PERSIST_FAILED')
      providerCustomer = created
    }

    const { data: bankConfig } = await admin.from('market_provider_configs')
      .select('id, provider_definitions!inner(provider_key, provider_type, status)')
      .eq('market_id', market.id).eq('provider_type', 'BANK_VERIFICATION').eq('environment', 'LIVE').eq('status', 'ACTIVE')
      .eq('provider_definitions.provider_type', 'BANK_VERIFICATION').eq('provider_definitions.status', 'ACTIVE')
      .order('priority', { ascending: true }).limit(1).maybeSingle()

    const { data: kycProfile, error: kycPersistError } = await admin.from('user_kyc_profiles').upsert({
      market_id: market.id, user_id: user.id, provider_config_id: kycConfig.id, provider_customer_ref: providerCustomer.provider_customer_code,
      status: 'PENDING', country_code: 'NG', verification_type: 'bank_account', metadata: { provider: providerKey }, updated_at: new Date().toISOString(),
    }, { onConflict: 'market_id,user_id' }).select('id').single()
    if (kycPersistError || !kycProfile) throw new Error('KYC_PROFILE_PERSIST_FAILED')

    const { data: existingBank } = await admin.from('user_bank_accounts').select('id')
      .eq('market_id', market.id).eq('user_id', user.id).eq('bank_code', bankCode).eq('account_number_last4', accountNumber.slice(-4)).maybeSingle()

    const bankPayload = {
      market_id: market.id, user_id: user.id, kyc_profile_id: kycProfile.id, provider_config_id: bankConfig?.id ?? null,
      provider_customer_ref: providerCustomer.provider_customer_code, bank_code: bankCode, account_number_last4: accountNumber.slice(-4), status: 'PENDING', is_default: true,
      metadata: { provider: providerKey }, updated_at: new Date().toISOString(),
    }
    const bankWrite = existingBank ? await admin.from('user_bank_accounts').update(bankPayload).eq('id', existingBank.id) : await admin.from('user_bank_accounts').insert(bankPayload)
    if (bankWrite.error) throw new Error('BANK_ACCOUNT_PERSIST_FAILED')

    await validatePaystackCustomer({ customerCode: providerCustomer.provider_customer_code, firstName, lastName, middleName, country: 'NG', bvn, bankCode, accountNumber })

    await admin.from('provider_customers').update({ status: 'ACTIVE', updated_at: new Date().toISOString() }).eq('id', providerCustomer.id)
    return NextResponse.json({ status: 'pending', provider: providerKey, message: 'Your identity and bank details are being verified. Your dedicated funding account will be created after verification succeeds.' }, { status: 202 })
  } catch (error) {
    console.error('KYC verification request failed:', error)
    return jsonError(error instanceof Error ? error.message : 'KYC verification is temporarily unavailable. Please try again.', 503, 'KYC_SERVICE_UNAVAILABLE')
  }
}
