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
      .from('kyc_records')
      .select('status,verification_level,submitted_at,reviewed_at,rejection_reason')
      .eq('user_id', user.id)
      .maybeSingle()
    if (kycError) throw kycError

    return NextResponse.json({
      kyc: kyc ?? { status: 'not_started', verification_level: null, submitted_at: null, reviewed_at: null, rejection_reason: null },
    })
  } catch (error) {
    console.error('Settings summary error:', error)
    return NextResponse.json({ error: 'Unable to load settings summary.' }, { status: 500 })
  }
}
