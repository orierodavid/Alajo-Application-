import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ success: false, error: 'Server configuration is incomplete.' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.rpc('process_due_payouts')
  if (error) {
    console.error('Automatic payout runner failed:', error)
    return NextResponse.json({ success: false, error: 'Payout processing failed.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, result: data })
}
