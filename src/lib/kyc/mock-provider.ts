export type KycType = 'bvn' | 'nin';
export type KycResult = { status: 'approved' | 'rejected' | 'under_review'; provider: 'mock'; reference: string; message: string };

/** Development-only KYC provider. Replace with a licensed provider before production. */
const TEST_BVN = '0000000000';
const TEST_NIN = '1111111111';

export async function verifyIdentity(type: KycType, value: string): Promise<KycResult> {
  const normalized = value.replace(/\D/g, '');
  if (!/^\d{10}$/.test(normalized)) {
    return { status: 'rejected', provider: 'mock', reference: `mock_${Date.now()}`, message: `${type.toUpperCase()} must contain exactly 10 digits in development test mode.` };
  }
  const approved = (type === 'bvn' && normalized === TEST_BVN) || (type === 'nin' && normalized === TEST_NIN);
  return approved
    ? { status: 'approved', provider: 'mock', reference: `mock_${type}_${Date.now()}`, message: 'Test identity verified successfully. Development-only KYC result.' }
    : { status: 'rejected', provider: 'mock', reference: `mock_${type}_${Date.now()}`, message: 'Development test identity did not match. Use the documented test value.' };
}

export const KYC_TEST_VALUES = { bvn: TEST_BVN, nin: TEST_NIN } as const;
