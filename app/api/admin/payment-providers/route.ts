import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const providerTypes = new Set(['PAYMENT','KYC','BANK_VERIFICATION','VIRTUAL_ACCOUNT','PAYOUT','NOTIFICATION'])

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

export async function POST(req: Request) {
  try {
    const { s, user, role } = await session()
    if (!user || role !== 'super_admin') return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 })
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    const providerKey = typeof body?.providerKey === 'string' ? body.providerKey.trim().toLowerCase() : ''
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : ''
    const providerType = typeof body?.providerType === 'string' ? body.providerType.trim().toUpperCase() : ''
    const countryCode = typeof body?.countryCode === 'string' ? body.countryCode.trim().toUpperCase() : ''
    const environment = body?.environment === 'TEST' ? 'TEST' : 'LIVE'
    const priority = Number.isInteger(body?.priority) ? Number(body?.priority) : 100
    const capabilities = body?.capabilities && typeof body.capabilities === 'object' ? body.capabilities : {}
    if (!/^[a-z0-9_:-]{3,80}$/.test(providerKey)) return NextResponse.json({ error: 'Provider key must use letters, numbers, underscore, colon or hyphen.' }, { status: 400 })
    if (!displayName || !providerTypes.has(providerType) || !/^[A-Z]{2}$/.test(countryCode)) return NextResponse.json({ error: 'Provider name, provider type and country are required.' }, { status: 400 })
    if (!Number.isInteger(priority) || priority < 1 || priority > 10000) return NextResponse.json({ error: 'Priority must be between 1 and 10000.' }, { status: 400 })

    const { data: market, error: marketError } = await s.from('markets').select('id').eq('country_code', countryCode).maybeSingle()
    if (marketError) throw marketError
    if (!market) return NextResponse.json({ error: `Market ${countryCode} is not configured yet.` }, { status: 400 })

    const { data: provider, error: providerError } = await s.from('provider_definitions').upsert({ provider_key: providerKey, provider_type: providerType, display_name: displayName, status: 'ACTIVE', capabilities }, { onConflict: 'provider_key' }).select('id,provider_key,provider_type,display_name,status,capabilities').single()
    if (providerError || !provider) throw providerError || new Error('PROVIDER_CREATE_FAILED')

    const { data: config, error: configError } = await s.from('market_provider_configs').upsert({ market_id: market.id, provider_id: provider.id, provider_type: providerType, environment, status: 'DISABLED', priority, public_config: {} }, { onConflict: 'market_id,provider_id,environment' }).select('id,market_id,provider_id,provider_type,environment,status,priority').single()
    if (configError || !config) throw configError || new Error('PROVIDER_CONFIG_CREATE_FAILED')
    return NextResponse.json({ success: true, provider, config, note: 'Provider created disabled. Install/verify its server adapter before enabling production traffic.' }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to create provider.' }, { status: 500 })
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
