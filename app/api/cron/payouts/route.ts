import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withDistributedLock } from '@/src/lib/resilience/distributed-lock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ success: false, error: 'Server configuration is incomplete.' }, { status: 500 })
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const lock = await withDistributedLock('cron:payouts', async () => {
    const { data, error } = await supabase.rpc('process_due_payouts')
    if (error) throw error
    return data
  }, 600)
  if (!lock.acquired) return NextResponse.json({ success: true, skipped: true, reason: 'Another payout worker is already running.' }, { status: 200 })
  return NextResponse.json({ success: true, result: lock.value })
}
