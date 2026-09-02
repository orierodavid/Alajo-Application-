import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { createDedicatedVirtualAccount, getPaystackSecretKey, paystackEnvironmentFromSecret, verifyPaystackTransaction } from '@/lib/paystack'

type ProviderDefinition = { provider_key: string; provider_type: string; status: string }
type ProviderConfig = { id: string; provider_definitions: ProviderDefinition | ProviderDefinition[] | null }
function jsonRecord(value: unknown): Record<string, any> { return value && typeof value === 'object' ? value as Record<string, any> : {} }
function webhookEventId(rawBody: string) { return createHash('sha256').update(rawBody).digest('hex') }
function providerKeyFromConfig(config: ProviderConfig | null) { const definition = Array.isArray(config?.provider_definitions) ? config?.provider_definitions[0] : config?.provider_definitions; return definition?.provider_key ?? null }

export async function POST(request: Request) {
  let secret: string
  try { secret = await getPaystackSecretKey() } catch { return NextResponse.json({ error: 'Webhook unavailable.' }, { status: 503 }) }
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex')
  const signatureBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  let event: { event?: string; data?: unknown }
  try { event = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 }) }
  const eventType = String(event.event ?? '')
  const data = jsonRecord(event.data)
  const admin = createAdminClient()
  const eventId = webhookEventId(rawBody)
  const { data: claimed, error: claimError } = await admin.rpc('claim_provider_webhook_event', { p_provider_key:'paystack', p_event_id:eventId, p_event_type:eventType, p_payload_hash:eventId, p_payload:event })
  if (claimError) return NextResponse.json({ error:'Webhook unavailable.' }, { status:503 })
  if (claimed !== true) return NextResponse.json({ received:true, duplicate:true })
  try {
    if (eventType === 'customeridentification.success' || eventType === 'customeridentification.failed') {
      const customerCode = String(data.customer_code ?? data.customer?.customer_code ?? '')
      if (!customerCode) throw new Error('CUSTOMER_CODE_MISSING')
      const { data: providerCustomer } = await admin.from('provider_customers').select('id,market_id,user_id,provider_customer_code').eq('provider_customer_code',customerCode).maybeSingle()
      if (!providerCustomer) throw new Error('PROVIDER_CUSTOMER_NOT_FOUND')
      const success = eventType === 'customeridentification.success'
      const now = new Date().toISOString()
      await admin.from('user_kyc_profiles').update({ status: success ? 'VERIFIED' : 'REJECTED', verified_at: success ? now : null, rejection_reason: success ? null : String(data.reason ?? data.message ?? 'Paystack customer validation failed'), updated_at: now }).eq('market_id',providerCustomer.market_id).eq('user_id',providerCustomer.user_id)
      await admin.from('user_bank_accounts').update({ status: success ? 'VERIFIED' : 'REJECTED', verified_at: success ? now : null, updated_at: now }).eq('market_id',providerCustomer.market_id).eq('user_id',providerCustomer.user_id)
      await admin.from('provider_customers').update({ status: success ? 'VERIFIED' : 'FAILED', updated_at: now }).eq('id',providerCustomer.id)
      const legacyKyc = { status: success ? 'approved' : 'rejected', verification_level: 'bvn', provider_reference: customerCode, reviewed_at: now }
      const { data: legacy } = await admin.from('kyc_records').select('id').eq('user_id',providerCustomer.user_id).maybeSingle()
      if (legacy) await admin.from('kyc_records').update(legacyKyc).eq('id',legacy.id)
      else await admin.from('kyc_records').insert({ user_id:providerCustomer.user_id, ...legacyKyc, submitted_at:now })
      if (success) {
        const environment = await paystackEnvironmentFromSecret()
        const { data: rawDvaConfig } = await admin.from('market_provider_configs').select('id,provider_definitions!inner(provider_key,provider_type,status)').eq('market_id',providerCustomer.market_id).eq('provider_type','VIRTUAL_ACCOUNT').eq('environment',environment==='test'?'TEST':'LIVE').eq('status','ACTIVE').eq('provider_definitions.provider_type','VIRTUAL_ACCOUNT').eq('provider_definitions.status','ACTIVE').order('priority',{ascending:true}).limit(1).maybeSingle()
        const dvaConfig = rawDvaConfig as ProviderConfig | null
        if (!dvaConfig) throw new Error('VIRTUAL_ACCOUNT_PROVIDER_NOT_CONFIGURED')
        const dvaProviderKey = providerKeyFromConfig(dvaConfig)
        if (!dvaProviderKey?.startsWith('paystack')) throw new Error('VIRTUAL_ACCOUNT_PROVIDER_ADAPTER_UNAVAILABLE')
        const dva = await createDedicatedVirtualAccount({ customerCode })
        if (dva?.account_number) {
          const currency = String(dva.currency ?? 'NGN').toUpperCase()
          await admin.from('user_virtual_accounts').upsert({ market_id:providerCustomer.market_id, user_id:providerCustomer.user_id, provider_config_id:dvaConfig.id, provider_customer_ref:customerCode, provider_account_ref:String(dva.id), bank_name:dva.bank?.name ?? null, account_number:dva.account_number, account_name:dva.account_name, currency, status:dva.active && dva.assigned ? 'ACTIVE' : 'PENDING', metadata:{provider:dvaProviderKey,bank_slug:dva.bank?.slug ?? null}, updated_at:now }, { onConflict:'market_id,user_id,currency' })
          if (dva.active && dva.assigned) await admin.from('profiles').update({ onboarding_step:'complete', updated_at:now }).eq('id',providerCustomer.user_id)
        }
      }
    }
    if (eventType === 'dedicatedaccount.assign.success' || eventType === 'assigndedicatedaccount.success') {
      const customerCode = String(data.customer_code ?? data.customer?.customer_code ?? '')
      const accountNumber = String(data.account_number ?? '')
      if (!customerCode || !accountNumber) throw new Error('DVA_EVENT_DATA_MISSING')
      const { data: providerCustomer } = await admin.from('provider_customers').select('market_id,user_id').eq('provider_customer_code',customerCode).maybeSingle()
      if (!providerCustomer) throw new Error('PROVIDER_CUSTOMER_NOT_FOUND')
      const environment = await paystackEnvironmentFromSecret()
      const { data: rawDvaConfig } = await admin.from('market_provider_configs').select('id,provider_definitions!inner(provider_key,provider_type,status)').eq('market_id',providerCustomer.market_id).eq('provider_type','VIRTUAL_ACCOUNT').eq('environment',environment==='test'?'TEST':'LIVE').eq('status','ACTIVE').eq('provider_definitions.provider_type','VIRTUAL_ACCOUNT').eq('provider_definitions.status','ACTIVE').order('priority',{ascending:true}).limit(1).maybeSingle()
      const dvaConfig = rawDvaConfig as ProviderConfig | null
      const providerKey = providerKeyFromConfig(dvaConfig)
      if (!dvaConfig || !providerKey?.startsWith('paystack')) throw new Error('VIRTUAL_ACCOUNT_PROVIDER_NOT_CONFIGURED')
      const currency = String(data.currency ?? 'NGN').toUpperCase()
      await admin.from('user_virtual_accounts').upsert({ market_id:providerCustomer.market_id, user_id:providerCustomer.user_id, provider_config_id:dvaConfig.id, provider_customer_ref:customerCode, provider_account_ref:data.id ? String(data.id) : null, bank_name:data.bank?.name ?? null, account_number:accountNumber, account_name:data.account_name ?? null, currency, status:data.active === false ? 'PENDING' : 'ACTIVE', metadata:{provider:providerKey,bank_slug:data.bank?.slug ?? null}, updated_at:new Date().toISOString() }, { onConflict:'market_id,user_id,currency' })
      if (data.active !== false) await admin.from('profiles').update({ onboarding_step:'complete', updated_at:new Date().toISOString() }).eq('id',providerCustomer.user_id)
    }
    if (eventType === 'dedicatedaccount.assign.failed' || eventType === 'assigndedicatedaccount.failed') {
      const customerCode = String(data.customer_code ?? data.customer?.customer_code ?? '')
      if (customerCode) {
        const { data: providerCustomer } = await admin.from('provider_customers').select('market_id,user_id').eq('provider_customer_code',customerCode).maybeSingle()
        if (providerCustomer) await admin.from('user_virtual_accounts').update({ status:'FAILED', metadata:{provider:'paystack',error:data.reason ?? data.message ?? null}, updated_at:new Date().toISOString() }).eq('market_id',providerCustomer.market_id).eq('user_id',providerCustomer.user_id)
      }
    }
    if (eventType === 'charge.success') {
      const authorization = jsonRecord(data.authorization)
      if (authorization.channel === 'dedicated_nuban') {
        const receiverAccount = String(authorization.receiver_bank_account_number ?? '')
        const reference = String(data.reference ?? data.id ?? '')
        const amount = Number(data.amount ?? 0)
        const currency = String(data.currency ?? 'NGN').toUpperCase()
        if (!receiverAccount || !reference || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('WALLET_FUNDING_EVENT_INVALID')
        const { error } = await admin.rpc('credit_wallet_from_virtual_account_atomic', { p_account_number:receiverAccount, p_provider_reference:reference, p_amount_minor:amount, p_currency:currency, p_event_id:eventId })
        if (error) throw error
      } else if (data.reference) {
        const reference = String(data.reference)
        const verified = await verifyPaystackTransaction(reference)
        const { data: payment } = await admin.from('payments').select('id,amount,currency,user_id,provider_reference,status').eq('provider','paystack').eq('provider_reference',reference).maybeSingle()
        if (payment) {
          const requestedAmount = Number(verified.requested_amount ?? verified.amount)
          const expectedAmountKobo = Math.round(Number(payment.amount) * 100)
          const environment = await paystackEnvironmentFromSecret()
          if (verified.domain === environment && verified.status === 'success' && verified.reference === reference && String(verified.currency).toUpperCase() === String(payment.currency).toUpperCase() && requestedAmount === expectedAmountKobo) {
            const metadata = verified.metadata && typeof verified.metadata === 'object' ? verified.metadata as Record<string, unknown> : {}
            if (metadata.user_id === payment.user_id && metadata.payment_reference === payment.provider_reference) {
              const { data: result, error } = await admin.rpc('credit_wallet_from_paystack', { p_provider_reference:reference, p_verified_amount_kobo:expectedAmountKobo, p_currency:verified.currency, p_provider_payload:verified })
              if (error || !result?.success) throw error ?? new Error('PAYMENT_WALLET_CREDIT_FAILED')
            }
          }
        }
      }
    }
    await admin.from('provider_webhook_events').update({ status:'PROCESSED', processed_at:new Date().toISOString(), error_message:null }).eq('provider_key','paystack').eq('event_id',eventId)
    return NextResponse.json({ received:true })
  } catch (error) {
    console.error('Paystack webhook processing error:', error)
    await admin.from('provider_webhook_events').update({ status:'FAILED', error_message:error instanceof Error ? error.message : 'WEBHOOK_PROCESSING_FAILED' }).eq('provider_key','paystack').eq('event_id',eventId)
    return NextResponse.json({ error:'Unable to process webhook.' }, { status:500 })
  }
}
