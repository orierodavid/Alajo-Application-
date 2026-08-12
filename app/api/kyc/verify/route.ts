import { NextResponse } from 'next/server'
import { verifyIdentity, type KycType } from '../../../../src/lib/kyc/mock-provider'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const type = body?.type as KycType
    const value = typeof body?.value === 'string' ? body.value : ''
    if (type !== 'bvn' && type !== 'nin') return NextResponse.json({ error: 'Invalid verification type.' }, { status: 400 })

    const normalized = value.replace(/\D/g, '')
    if (!/^\d{10}$/.test(normalized)) return NextResponse.json({ error: `${type.toUpperCase()} must contain exactly 10 digits in development test mode.` }, { status: 400 })

    const result = await verifyIdentity(type, normalized)
    if (result.status !== 'approved') return NextResponse.json(result, { status: 422 })

    const admin = createAdminClient()
    const { data: existing, error: lookupError } = await admin
      .from('kyc_records')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (lookupError) throw lookupError

    const now = new Date().toISOString()
    // Keep this payload limited to the fields required by the current KYC record contract.
    // This avoids failing a valid verification because an optional/legacy column is absent.
    const payload = {
      user_id: user.id,
      status: 'approved',
      verification_level: type,
      provider_reference: result.reference,
      submitted_at: now,
      reviewed_at: now,
    }

    const write = existing
      ? await admin.from('kyc_records').update(payload).eq('id', existing.id)
      : await admin.from('kyc_records').insert(payload)

    if (write.error) {
      console.error('KYC record persistence failed:', write.error)
      return NextResponse.json({ error: 'Identity was verified but could not be saved. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ...result, persisted: true })
  } catch (error) {
    console.error('KYC verification error:', error)
    return NextResponse.json({ error: 'Unable to process verification request.' }, { status: 500 })
  }
}
