import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: kyc, error: kycError } = await admin
      .from('user_kyc_profiles')
      .select('status,verification_type,verified_at,rejection_reason,created_at,updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (kycError) throw kycError

    if (!kyc) {
      return NextResponse.json({
        kyc: { status: 'not_started', verification_level: null, submitted_at: null, reviewed_at: null, rejection_reason: null },
      })
    }

    const statusMap: Record<string, string> = {
      VERIFIED: 'approved',
      PENDING: 'pending',
      REVIEW: 'pending',
      REJECTED: 'rejected',
      NOT_STARTED: 'not_started',
    }
    const normalizedStatus = statusMap[kyc.status] ?? 'pending'

    return NextResponse.json({
      kyc: {
        status: normalizedStatus,
        verification_level: kyc.verification_type || 'bank_account',
        submitted_at: kyc.created_at,
        reviewed_at: kyc.verified_at,
        rejection_reason: kyc.rejection_reason,
      },
    })
  } catch (error) {
    console.error('Settings summary error:', error)
    return NextResponse.json({ error: 'Unable to load settings summary.' }, { status: 500 })
  }
}
