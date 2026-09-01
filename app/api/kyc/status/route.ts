import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'
import { createDedicatedVirtualAccount, fetchPaystackCustomer, paystackEnvironmentFromSecret } from '@/lib/paystack'
import { singleFlight } from '@/lib/resilience/single-flight'
import { withDistributedLock } from '@/lib/resilience/distributed-lock'

export const dynamic = 'force-dynamic'

async function reconcileKyc(userId: string) {
  const admin = createAdminClient()
  const { data: kycSeed } = await admin.from('user_kyc_profiles').select('market_id,provider_customer_ref').eq('user_id', userId).maybeSingle()
  let { data: providerCustomer } = await admin.from('provider_customers').select('id,market_id,provider_customer_code,status,provider_key').eq('user_id', userId).like('provider_key','paystack%').maybeSingle()
  if (!providerCustomer && kycSeed?.provider_customer_ref && kycSeed.market_id) {
    const { data: recovered } = await admin.from('provider_customers').upsert({ market_id: kycSeed.market_id, user_id: userId, provider_key: 'paystack_kyc', provider_customer_code: kycSeed.provider_customer_ref, status: 'ACTIVE', metadata: { source: 'kyc_reconciliation' }, updated_at: new Date().toISOString() }, { onConflict: 'market_id,user_id,provider_key' }).select('id,market_id,provider_customer_code,status,provider_key').single()
    providerCustomer = recovered
  }
  if (!providerCustomer?.provider_customer_code) return
  const customer = await fetchPaystackCustomer(providerCustomer.provider_customer_code)
  const dedicated = customer.dedicated_account ?? null
  if (!(customer.identified === true || dedicated?.account_number)) return
  const now = new Date().toISOString()
  await Promise.all([
    admin.from('user_kyc_profiles').update({ status:'VERIFIED', verified_at:now, rejection_reason:null, updated_at:now }).eq('user_id', userId).eq('market_id', providerCustomer.market_id),
    admin.from('provider_customers').update({ status:'VERIFIED', updated_at:now }).eq('id',providerCustomer.id),
  ])
  if (dedicated?.account_number) {
    await admin.from('user_virtual_accounts').upsert({ market_id:providerCustomer.market_id,user_id:userId,provider_customer_ref:providerCustomer.provider_customer_code,provider_account_ref:String(dedicated.id),bank_name:dedicated.bank?.name ?? null,account_number:dedicated.account_number,account_name:dedicated.account_name,currency:String(dedicated.currency ?? 'NGN').toUpperCase(),status:dedicated.active && dedicated.assigned ? 'ACTIVE' : 'PENDING',metadata:{provider:'paystack',bank_slug:dedicated.bank?.slug ?? null},updated_at:now },{onConflict:'market_id,user_id,currency'})
  } else {
    const environment = await paystackEnvironmentFromSecret()
    const { data: dvaConfig } = await admin.from('market_provider_configs').select('id').eq('market_id',providerCustomer.market_id).eq('provider_type','VIRTUAL_ACCOUNT').eq('environment',environment==='test'?'TEST':'LIVE').eq('status','ACTIVE').order('priority',{ascending:true}).limit(1).maybeSingle()
    if (dvaConfig) {
      const dva = await createDedicatedVirtualAccount({ customerCode:providerCustomer.provider_customer_code })
      if (dva?.account_number) await admin.from('user_virtual_accounts').upsert({ market_id:providerCustomer.market_id,user_id:userId,provider_config_id:dvaConfig.id,provider_customer_ref:providerCustomer.provider_customer_code,provider_account_ref:String(dva.id),bank_name:dva.bank?.name ?? null,account_number:dva.account_number,account_name:dva.account_name,currency:String(dva.currency ?? 'NGN').toUpperCase(),status:dva.active && dva.assigned ? 'ACTIVE' : 'PENDING',metadata:{provider:'paystack',bank_slug:dva.bank?.slug ?? null},updated_at:now},{onConflict:'market_id,user_id,currency'})
    }
  }
  const { data: activeAccount } = await admin.from('user_virtual_accounts').select('status').eq('user_id',userId).eq('currency','NGN').maybeSingle()
  if (activeAccount?.status === 'ACTIVE') await admin.from('profiles').update({ onboarding_step:'complete' }).eq('id',userId)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  try {
    await singleFlight(`kyc:reconcile:${user.id}`, async () => {
      const lock = await withDistributedLock(`kyc:reconcile:${user.id}`, () => reconcileKyc(user.id), 180)
      return lock.acquired ? lock.value : undefined
    }, 15_000)
  } catch (reconcileError) {
    console.error('Paystack status reconciliation failed:', reconcileError)
  }
  const admin = createAdminClient()
  const [{ data: kyc, error: kycError }, { data: account, error: accountError }] = await Promise.all([
    admin.from('user_kyc_profiles').select('status,rejection_reason,verified_at').eq('user_id', user.id).maybeSingle(),
    admin.from('user_virtual_accounts').select('bank_name,account_number,account_name,currency,status').eq('user_id', user.id).eq('currency', 'NGN').maybeSingle(),
  ])
  if (kycError || accountError) return NextResponse.json({ error: 'Unable to load verification status.' }, { status: 503 })
  const kycStatus = kyc?.status ?? 'NOT_STARTED'
  const accountStatus = account?.status ?? 'NOT_ACTIVE'
  return NextResponse.json({ kycStatus,accountStatus,rejectionReason:kyc?.rejection_reason ?? null,verifiedAt:kyc?.verified_at ?? null,account:account ?? null,complete:kycStatus === 'VERIFIED' && accountStatus === 'ACTIVE' })
}
