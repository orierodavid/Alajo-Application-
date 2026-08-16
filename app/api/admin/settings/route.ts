import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, role: null }
  const { data: role } = await supabase.rpc('get_my_admin_role')
  if (!role) return { user: null, role: null }
  return { user, role }
}

async function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server configuration is incomplete.')
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET() {
  try {
    const { user } = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const client = await adminDb()
    const { data, error } = await client.from('system_settings').select('key,numeric_value,boolean_value,integer_value,text_value').order('key')
    if (error) throw error
    return NextResponse.json({ settings: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to load settings.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const allowed = new Set(['service_fee_percentage','delay_fee_percentage','auto_debit_enabled','reminder_before_days','reminder_after_days','reminder_repeat_days','max_reminders','auto_payout_enabled','default_grace_days','credit_bureau_notice_days'])
    const client = await adminDb()
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.has(key)) continue
      const patch = typeof value === 'boolean'
        ? { numeric_value: null, integer_value: null, boolean_value: value, updated_by: user.id, updated_at: new Date().toISOString() }
        : key.includes('percentage')
          ? { numeric_value: Number(value), integer_value: null, boolean_value: null, updated_by: user.id, updated_at: new Date().toISOString() }
          : { integer_value: Number(value), numeric_value: null, boolean_value: null, updated_by: user.id, updated_at: new Date().toISOString() }
      const { error } = await client.from('system_settings').update(patch).eq('key', key)
      if (error) throw error
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to update settings.' }, { status: 500 })
  }
}
