import 'server-only'

import { createAdminClient } from '@/src/lib/supabase/admin'

const cache = new Map<string, { value: string | null; expiresAt: number }>()
const inflight = new Map<string, Promise<string | null>>()
const TTL_MS = 60_000

async function loadProviderCredential(providerKey: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('server_get_provider_secret', { p_provider_key: providerKey })
  if (error) throw new Error(`PROVIDER_SECRET_LOOKUP_FAILED: ${error.message}`)
  if (typeof data === 'string' && data.trim()) return data.trim()
  return null
}

export async function getProviderCredential(providerKey: string) {
  const cached = cache.get(providerKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  const existing = inflight.get(providerKey)
  if (existing) return existing
  const request = loadProviderCredential(providerKey).then((value) => {
    cache.set(providerKey, { value, expiresAt: Date.now() + TTL_MS + Math.floor(Math.random() * 15_000) })
    return value
  }).finally(() => inflight.delete(providerKey))
  inflight.set(providerKey, request)
  return request
}

export async function getPaystackSecretKey(providerKey: 'paystack_payment' | 'paystack_kyc' | 'paystack_payout' = 'paystack_payment') {
  const managed = await getProviderCredential(providerKey)
  if (managed) return managed
  const fallback = process.env.PAYSTACK_SECRET_KEY
  if (!fallback) throw new Error(`Paystack server credentials are not configured for ${providerKey}`)
  return fallback
}
