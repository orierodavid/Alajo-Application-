import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const [{ data: profile }, { data: wallet }] = await Promise.all([
      supabase.from('profiles').select('id,status').eq('id', user.id).maybeSingle(),
      supabase.from('wallets').select('id,balance,currency,status,updated_at').eq('user_id', user.id).limit(1).maybeSingle(),
    ])

    if (!profile) return NextResponse.json({ authenticated: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 403 })
    if (profile.status !== 'active') return NextResponse.json({ authenticated: false, error: 'ACCOUNT_INACTIVE' }, { status: 403 })

    return NextResponse.json({
      authenticated: true,
      wallet: wallet ?? null,
    })
  } catch (error) {
    console.error('ZeePay wallet API error:', error)
    return NextResponse.json({ error: 'Unable to load wallet.' }, { status: 500 })
  }
}
