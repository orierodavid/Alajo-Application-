import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const [{ data: profile }, { data: kyc }, { data: dva }, { data: wallet }] = await Promise.all([
      supabase.from('profiles').select('id,email,first_name,last_name,phone,country,status,onboarding_step').eq('id', user.id).maybeSingle(),
      supabase.from('user_kyc_profiles').select('status').eq('user_id', user.id).limit(1).maybeSingle(),
      supabase.from('user_virtual_accounts').select('account_number,account_name,bank_name,currency,status').eq('user_id', user.id).eq('currency', 'NGN').limit(1).maybeSingle(),
      supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).maybeSingle(),
    ])

    if (!profile) return NextResponse.json({ authenticated: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 403 })

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, email: user.email, profile },
      verification: { kycStatus: kyc?.status ?? null, virtualAccountStatus: dva?.status ?? null },
      virtualAccount: dva ?? null,
      wallet: wallet ?? null,
    })
  } catch (error) {
    console.error('ZeePay bootstrap error:', error)
    return NextResponse.json({ error: 'Unable to load account bootstrap data.' }, { status: 500 })
  }
}
