import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'

type KycType = 'bvn' | 'nin'

const TEST_VALUES: Record<KycType, string> = {
  bvn: '0000000000',
  nin: '1111111111',
}

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return jsonError('Your session has expired. Please sign in again.', 401, 'AUTH_REQUIRED')

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid verification request.', 400, 'INVALID_JSON')
    }

    const type = (body as { type?: unknown })?.type
    const rawValue = (body as { value?: unknown })?.value

    if (type !== 'bvn' && type !== 'nin') return jsonError('Select BVN or NIN.', 400, 'INVALID_TYPE')
    if (typeof rawValue !== 'string') return jsonError(`${type.toUpperCase()} is required.`, 400, 'VALUE_REQUIRED')

    const value = rawValue.replace(/\D/g, '')
    if (!/^\d{10}$/.test(value)) {
      return jsonError(`${type.toUpperCase()} must contain exactly 10 digits.`, 400, 'INVALID_LENGTH')
    }

    // Development-only synthetic identity verification. This is deliberately explicit
    // so test data can never be mistaken for a real BVN/NIN provider response.
    if (value !== TEST_VALUES[type]) {
      return jsonError(
        `Development test ${type.toUpperCase()} did not match. Use ${TEST_VALUES[type]} for this test environment.`,
        422,
        'IDENTITY_NOT_MATCHED',
      )
    }

    const reference = `mock_${type}_${Date.now()}`
    const admin = createAdminClient()
    const { data: existing, error: lookupError } = await admin
      .from('kyc_records')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (lookupError) {
      console.error('KYC lookup failed:', lookupError)
      return jsonError('We verified your identity but could not access your KYC record. Please try again.', 503, 'KYC_LOOKUP_FAILED')
    }

    const now = new Date().toISOString()
    const payload = {
      user_id: user.id,
      status: 'approved',
      verification_level: type,
      provider_reference: reference,
      submitted_at: now,
      reviewed_at: now,
    }

    const write = existing
      ? await admin.from('kyc_records').update(payload).eq('id', existing.id)
      : await admin.from('kyc_records').insert(payload)

    if (write.error) {
      console.error('KYC persistence failed:', write.error)
      return jsonError('Identity verification succeeded, but your KYC record could not be saved. Please try again.', 503, 'KYC_PERSIST_FAILED')
    }

    return NextResponse.json({
      status: 'approved',
      provider: 'mock',
      reference,
      message: 'Test identity verified successfully.',
      persisted: true,
    })
  } catch (error) {
    console.error('KYC verification request failed:', error)
    return jsonError('The verification service is temporarily unavailable. Please try again.', 503, 'KYC_SERVICE_UNAVAILABLE')
  }
}
