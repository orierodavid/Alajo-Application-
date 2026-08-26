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
    const { data: account, error } = await supabase.from('user_virtual_accounts').select('account_number,account_name,bank_name,currency,status').eq('user_id', user.id).eq('currency', 'NGN').maybeSingle()
    if (error) throw error
    return NextResponse.json({ authenticated: true, virtualAccount: account ?? null })
  } catch (error) {
    console.error('ZeePay virtual account API error:', error)
    return NextResponse.json({ error: 'Unable to load virtual account.' }, { status: 500 })
  }
}
