export type PayoutProviderRequest = {
  payoutId: string
  amountKobo: number
  beneficiaryId: string
}

export type PayoutProviderResult = {
  success: boolean
  providerReference: string | null
  failureReason: string | null
}

/**
 * Temporary provider adapter. It deliberately does not move real money.
 * Replace this implementation when the production transfer provider is selected.
 */
export async function processPayout(_request: PayoutProviderRequest): Promise<PayoutProviderResult> {
  return {
    success: false,
    providerReference: null,
    failureReason: 'Payout provider is not configured yet.',
  }
}
