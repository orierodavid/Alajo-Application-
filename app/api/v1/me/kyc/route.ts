import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ authenticated: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 403 })
    const { data: kyc, error } = await supabase.from('user_kyc_profiles').select('status').eq('user_id', user.id).limit(1).maybeSingle()
    if (error) throw error
    return NextResponse.json({ authenticated: true, kyc: { status: kyc?.status ?? null } })
  } catch (error) {
    console.error('ZeePay KYC API error:', error)
    return NextResponse.json({ error: 'Unable to load KYC status.' }, { status: 500 })
  }
}
