export type KycType = 'bvn' | 'nin';
export type KycResult = { status: 'approved' | 'rejected' | 'under_review'; provider: 'mock'; reference: string; message: string };

/** Free development provider. Replace this adapter with a licensed provider before production. */
export async function verifyIdentity(type: KycType, value: string): Promise<KycResult> {
  const normalized = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(normalized)) return { status: 'rejected', provider: 'mock', reference: `mock_${Date.now()}`, message: `${type.toUpperCase()} must contain exactly 11 digits.` };
  const approved = (type === 'bvn' && normalized === '22222222222') || (type === 'nin' && normalized === '70123456789');
  return approved ? { status: 'approved', provider: 'mock', reference: `mock_${type}_${Date.now()}`, message: 'Identity verified successfully in development mode.' } : { status: 'rejected', provider: 'mock', reference: `mock_${type}_${Date.now()}`, message: 'Development test identity did not match. Use the documented sandbox test value.' };
}
