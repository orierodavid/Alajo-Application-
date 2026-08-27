import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function session() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return { s, user: null, role: null as string | null }
  const { data: role } = await s.rpc('get_my_admin_role')
  return { s, user, role: role ? String(role) : null }
}

export async function GET() {
  try {
    const { s, user, role } = await session()
    if (!user || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data, error } = await s.rpc('admin_payment_provider_config')
    if (error) throw error
    return NextResponse.json({ ...(data ?? {}), role })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to load providers.' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { s, user, role } = await session()
    if (!user || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    if (body.action === 'rotate_credential') {
      if (role !== 'super_admin') return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 })
      const providerId = typeof body.providerId === 'string' ? body.providerId : ''
      const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
      if (!providerId || !secret) return NextResponse.json({ error: 'Provider and API key are required.' }, { status: 400 })
      const { data, error } = await s.rpc('admin_upsert_provider_credential', { p_provider_id: providerId, p_secret: secret })
      if (error) throw error
      return NextResponse.json({ success: true, credential: data })
    }

    const { configId, isActive } = body
    if (typeof configId !== 'string' || typeof isActive !== 'boolean') return NextResponse.json({ error: 'Invalid provider configuration.' }, { status: 400 })
    const { data, error } = await s.rpc('admin_set_market_provider', { p_config_id: configId, p_active: isActive })
    if (error) throw error
    return NextResponse.json({ success: true, config: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unable to update provider.'
    const status = message.includes('SUPER_ADMIN_REQUIRED') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
