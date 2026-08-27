import 'server-only'

import { createAdminClient } from '@/src/lib/supabase/admin'

export async function getProviderCredential(providerKey: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('server_get_provider_secret', { p_provider_key: providerKey })
  if (error) throw new Error(`PROVIDER_SECRET_LOOKUP_FAILED: ${error.message}`)
  if (typeof data === 'string' && data.trim()) return data.trim()
  return null
}

export async function getPaystackSecretKey(providerKey: 'paystack_payment' | 'paystack_kyc' | 'paystack_payout' = 'paystack_payment') {
  const managed = await getProviderCredential(providerKey)
  if (managed) return managed
  const fallback = process.env.PAYSTACK_SECRET_KEY
  if (!fallback) throw new Error(`Paystack server credentials are not configured for ${providerKey}`)
  return fallback
}
