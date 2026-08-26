import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const [{ data: kyc, error: kycError }, { data: account, error: accountError }] = await Promise.all([
    supabase.from('user_kyc_profiles').select('status,rejection_reason,verified_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_virtual_accounts').select('bank_name,account_number,account_name,currency,status').eq('user_id', user.id).eq('currency', 'NGN').maybeSingle(),
  ])

  if (kycError || accountError) return NextResponse.json({ error: 'Unable to load verification status.' }, { status: 503 })

  const kycStatus = kyc?.status ?? 'NOT_STARTED'
  const accountStatus = account?.status ?? 'NOT_ACTIVE'
  return NextResponse.json({
    kycStatus,
    accountStatus,
    rejectionReason: kyc?.rejection_reason ?? null,
    verifiedAt: kyc?.verified_at ?? null,
    account: account ?? null,
    complete: kycStatus === 'VERIFIED' && accountStatus === 'ACTIVE',
  })
}
