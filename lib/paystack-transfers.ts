import 'server-only'

const PAYSTACK_API = 'https://api.paystack.co'

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('Paystack server credentials are not configured')
  return key
}

async function paystackTransferRequest<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status) throw new Error(payload?.message || `PAYSTACK_TRANSFER_FAILED_${response.status}`)
  return payload.data as T
}

export type PaystackTransferRecipient = { active: boolean; recipient_code: string; name: string; details?: { account_number?: string; account_name?: string; bank_code?: string } }
export type PaystackTransfer = { id: number; domain: string; amount: number; currency: string; reference: string; status: string; transfer_code?: string; recipient?: string; reason?: string }

export async function createPaystackTransferRecipient(input: { name: string; accountNumber: string; bankCode: string; currency?: 'NGN' }) {
  return paystackTransferRequest<PaystackTransferRecipient>('/transferrecipient', {
    type: 'nuban',
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: input.currency ?? 'NGN',
  })
}

export async function initiatePaystackTransfer(input: { amountKobo: number; recipientCode: string; reference: string; reason?: string; currency?: 'NGN' }) {
  if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) throw new Error('INVALID_TRANSFER_AMOUNT')
  return paystackTransferRequest<PaystackTransfer>('/transfer', {
    source: 'balance',
    amount: input.amountKobo,
    recipient: input.recipientCode,
    reference: input.reference,
    reason: input.reason,
    currency: input.currency ?? 'NGN',
  })
}
