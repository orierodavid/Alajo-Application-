import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'
import { createPaystackCustomer, resolvePaystackAccount, validatePaystackCustomer } from '@/lib/paystack'

type ProviderDefinition = { provider_key: string; provider_type: string; status: string }
type KycConfigRow = { id: string; provider_definitions: ProviderDefinition | ProviderDefinition[] | null }

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
    const firstNameInput = typeof body?.firstName === 'string' ? body.firstName.trim() : ''
    const lastNameInput = typeof body?.lastName === 'string' ? body.lastName.trim() : ''
    const phoneInput = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : ''
    const emailInput = typeof body?.email === 'string' ? body.email.trim() : ''
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

    const authMeta = (user.user_metadata ?? {}) as Record<string, unknown>
    const metadataFirstName = typeof authMeta.first_name === 'string' ? authMeta.first_name.trim() : ''
    const metadataLastName = typeof authMeta.last_name === 'string' ? authMeta.last_name.trim() : ''
    const metadataName = typeof authMeta.full_name === 'string' ? authMeta.full_name.trim() : (typeof authMeta.name === 'string' ? authMeta.name.trim() : '')
    const profileName = typeof profile.full_name === 'string' ? profile.full_name.trim() : ''
    const fullName = profileName || metadataName
    const nameParts = fullName.split(/\s+/).filter(Boolean)
    const firstName = firstNameInput || metadataFirstName || nameParts[0] || ''
    const lastName = lastNameInput || metadataLastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '')
    const email = emailInput || ((typeof profile.email === 'string' && profile.email.trim()) ? profile.email.trim() : (user.email?.trim() || ''))
    const phone = phoneInput || ((typeof profile.phone === 'string' && profile.phone.trim()) ? profile.phone.trim() : (typeof authMeta.phone === 'string' ? authMeta.phone.replace(/\D/g, '') : ''))

    if (!email || !phone || !firstName || !lastName) {
      console.error('KYC profile data incomplete', { userId: user.id, hasEmail: Boolean(email), hasPhone: Boolean(phone), hasFirstName: Boolean(firstName), hasLastName: Boolean(lastName) })
      return jsonError('Enter your first name, last name, phone and email before verification.', 400, 'PROFILE_INCOMPLETE')
    }
    if (!/^\d{11}$/.test(phone)) return jsonError('Phone number must contain exactly 11 digits.', 400, 'INVALID_PHONE')
    if (!/^\S+@\S+\.\S+$/.test(email)) return jsonError('Enter a valid email address.', 400, 'INVALID_EMAIL')

    await admin.from('profiles').update({ full_name: `${firstName} ${lastName}`, phone, email }).eq('id', user.id)

    const { data: rawKycConfig, error: kycConfigError } = await admin.from('market_provider_configs')
      .select('id, provider_definitions!inner(provider_key, provider_type, status)')
      .eq('market_id', market.id).eq('provider_type', 'KYC').eq('environment', 'LIVE').eq('status', 'ACTIVE')
      .eq('provider_definitions.provider_type', 'KYC').eq('provider_definitions.status', 'ACTIVE')
      .order('priority', { ascending: true }).limit(1).maybeSingle()
    const kycConfig = rawKycConfig as KycConfigRow | null
    if (kycConfigError || !kycConfig) return jsonError('KYC provider is not configured.', 503, 'KYC_PROVIDER_NOT_CONFIGURED')
    const providerDefinition = Array.isArray(kycConfig.provider_definitions) ? kycConfig.provider_definitions[0] : kycConfig.provider_definitions
    const providerKey = providerDefinition?.provider_key
    if (!providerKey || !providerKey.startsWith('paystack')) return jsonError('The configured KYC provider has no installed adapter.', 503, 'KYC_PROVIDER_ADAPTER_UNAVAILABLE')

    let resolvedAccount
    try { resolvedAccount = await resolvePaystackAccount({ accountNumber, bankCode }) }
    catch { return jsonError('We could not verify that account number with the selected bank. Check the bank and account number and try again.', 400, 'BANK_ACCOUNT_NOT_RESOLVED') }

    let { data: providerCustomer } = await admin.from('provider_customers').select('id, provider_customer_code, provider_key').eq('market_id', market.id).eq('user_id', user.id).eq('provider_key', providerKey).maybeSingle()
    if (!providerCustomer?.provider_customer_code) {
      const customer = await createPaystackCustomer({ email, firstName, lastName, phone, metadata: { alajo_user_id: user.id, market: 'NG' } })
      const { data: created, error: customerError } = await admin.from('provider_customers').upsert({ market_id: market.id, user_id: user.id, provider_key: providerKey, provider_customer_id: String(customer.id), provider_customer_code: customer.customer_code, status: 'PENDING', metadata: { source: 'kyc' } }, { onConflict: 'market_id,user_id,provider_key' }).select('id, provider_customer_code, provider_key').single()
      if (customerError || !created) throw new Error('PROVIDER_CUSTOMER_PERSIST_FAILED')
      providerCustomer = created
    }

    const { data: bankConfig } = await admin.from('market_provider_configs').select('id, provider_definitions!inner(provider_key, provider_type, status)').eq('market_id', market.id).eq('provider_type', 'BANK_VERIFICATION').eq('environment', 'LIVE').eq('status', 'ACTIVE').eq('provider_definitions.provider_type', 'BANK_VERIFICATION').eq('provider_definitions.status', 'ACTIVE').order('priority', { ascending: true }).limit(1).maybeSingle()
    const { data: kycProfile, error: kycPersistError } = await admin.from('user_kyc_profiles').upsert({ market_id: market.id, user_id: user.id, provider_config_id: kycConfig.id, provider_customer_ref: providerCustomer.provider_customer_code, status: 'PENDING', country_code: 'NG', verification_type: 'bank_account', metadata: { provider: providerKey, resolved_account_name: resolvedAccount.account_name }, updated_at: new Date().toISOString() }, { onConflict: 'market_id,user_id' }).select('id').single()
    if (kycPersistError || !kycProfile) throw new Error('KYC_PROFILE_PERSIST_FAILED')
    const { data: existingBank } = await admin.from('user_bank_accounts').select('id').eq('market_id', market.id).eq('user_id', user.id).eq('bank_code', bankCode).eq('account_number_last4', accountNumber.slice(-4)).maybeSingle()
    const bankPayload = { market_id: market.id, user_id: user.id, kyc_profile_id: kycProfile.id, provider_config_id: bankConfig?.id ?? null, provider_customer_ref: providerCustomer.provider_customer_code, bank_code: bankCode, account_number_last4: accountNumber.slice(-4), status: 'PENDING', is_default: true, metadata: { provider: providerKey, resolved_account_name: resolvedAccount.account_name }, updated_at: new Date().toISOString() }
    const bankWrite = existingBank ? await admin.from('user_bank_accounts').update(bankPayload).eq('id', existingBank.id) : await admin.from('user_bank_accounts').insert(bankPayload)
    if (bankWrite.error) throw new Error('BANK_ACCOUNT_PERSIST_FAILED')

    await validatePaystackCustomer({ customerCode: providerCustomer.provider_customer_code, firstName, lastName, middleName, country: 'NG', bvn, bankCode, accountNumber })
    await admin.from('provider_customers').update({ status: 'ACTIVE', updated_at: new Date().toISOString() }).eq('id', providerCustomer.id)
    return NextResponse.json({ status: 'pending', provider: providerKey, message: 'Your BVN and bank account are being verified. After Paystack confirms the BVN-linked account, your dedicated funding account will be created.' }, { status: 202 })
  } catch (error) {
    console.error('KYC verification request failed:', error)
    return jsonError(error instanceof Error ? error.message : 'KYC verification is temporarily unavailable. Please try again.', 503, 'KYC_SERVICE_UNAVAILABLE')
  }
}
