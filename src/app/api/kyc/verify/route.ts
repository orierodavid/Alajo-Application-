import { NextResponse } from 'next/server';
import { verifyIdentity, type KycType } from '../../../../lib/kyc/mock-provider';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = body?.type as KycType;
    const value = typeof body?.value === 'string' ? body.value : '';
    if (type !== 'bvn' && type !== 'nin') return NextResponse.json({ error: 'Invalid verification type.' }, { status: 400 });
    const result = await verifyIdentity(type, value);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Unable to process verification request.' }, { status: 400 });
  }
}
