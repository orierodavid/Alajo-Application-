import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server configuration is incomplete.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireAdmin(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  const client = await adminClient()
  const { data } = await client.auth.getUser(token)
  if (!data.user) return false
  const { data: role } = await client.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
  return role?.role === 'admin' || role?.role === 'super_admin'
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const client = await adminClient()
    const { data, error } = await client.from('system_settings').select('key,numeric_value,boolean_value,integer_value,text_value').order('key')
    if (error) throw error
    return NextResponse.json({ settings: data || [] })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to load settings.' }, { status: 500 }) }
}

export async function PATCH(request: Request) {
  try {
    if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const allowed = new Set(['service_fee_percentage','delay_fee_percentage','auto_debit_enabled','reminder_before_days','reminder_after_days','reminder_repeat_days','max_reminders','auto_payout_enabled'])
    const client = await adminClient()
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.has(key)) continue
      const patch = typeof value === 'boolean' ? { boolean_value: value } : Number.isInteger(value) ? { integer_value: value } : { numeric_value: Number(value) }
      const { error } = await client.from('system_settings').update(patch).eq('key', key)
      if (error) throw error
    }
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to update settings.' }, { status: 500 }) }
}
