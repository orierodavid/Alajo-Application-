import 'server-only'

const PAYSTACK_API = 'https://api.paystack.co'

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('Paystack server credentials are not configured')
  return key
}

export function paystackEnvironmentFromSecret() {
  const key = getSecretKey()
  if (key.startsWith('sk_live_')) return 'live'
  if (key.startsWith('sk_test_')) return 'test'
  return process.env.PAYSTACK_ENVIRONMENT === 'test' ? 'test' : 'live'
}

export async function initializePaystackTransaction(input: {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amountKobo),
      currency: 'NGN',
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      channels: ['card', 'bank_transfer', 'ussd'],
    }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status || !payload?.data?.authorization_url) {
    throw new Error('PAYSTACK_INITIALIZATION_FAILED')
  }

  return payload.data as { authorization_url: string; access_code: string; reference: string }
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${getSecretKey()}` },
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status || !payload?.data) throw new Error('PAYSTACK_VERIFICATION_FAILED')
  return payload.data as {
    id: number
    domain: string
    status: string
    reference: string
    amount: number
    requested_amount?: number
    currency: string
    metadata?: unknown
    customer?: { email?: string | null }
    gateway_response?: string | null
    paid_at?: string | null
  }
}
