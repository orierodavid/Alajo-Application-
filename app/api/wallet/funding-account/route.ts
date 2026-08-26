import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data: account, error } = await supabase.from('user_virtual_accounts')
    .select('bank_name,account_number,account_name,currency,status,created_at')
    .eq('user_id', user.id).eq('currency', 'NGN').maybeSingle()

  if (error) return NextResponse.json({ error: 'Unable to load funding account.' }, { status: 503 })
  return NextResponse.json({ account: account ?? null })
}
