export type KycType = 'bvn' | 'nin';
export type KycResult = { status: 'approved' | 'rejected' | 'under_review'; provider: 'mock'; reference: string; message: string };

/**
 * Development-only KYC provider.
 * Replace this adapter with a licensed BVN/NIMC provider before production KYC.
 * These values are deliberately synthetic and must never be treated as real identities.
 */
const TEST_BVN = '00000000000';
const TEST_NIN = '11111111111';

export async function verifyIdentity(type: KycType, value: string): Promise<KycResult> {
  const normalized = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(normalized)) {
    return {
      status: 'rejected',
      provider: 'mock',
      reference: `mock_${Date.now()}`,
      message: `${type.toUpperCase()} must contain exactly 11 digits.`,
    };
  }

  const approved = (type === 'bvn' && normalized === TEST_BVN) || (type === 'nin' && normalized === TEST_NIN);

  return approved
    ? {
        status: 'approved',
        provider: 'mock',
        reference: `mock_${type}_${Date.now()}`,
        message: 'Test identity verified successfully. This is a development-only KYC result.',
      }
    : {
        status: 'rejected',
        provider: 'mock',
        reference: `mock_${type}_${Date.now()}`,
        message: 'Development test identity did not match. Use the documented test value.',
      };
}

export const KYC_TEST_VALUES = {
  bvn: TEST_BVN,
  nin: TEST_NIN,
} as const;
