import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('full_name, phone, email, country_code, market_id').eq('id', user.id).maybeSingle()
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName = typeof profile?.full_name === 'string' ? profile.full_name.trim() : ''
  const firstName = (typeof meta.first_name === 'string' ? meta.first_name.trim() : '') || fullName.split(/\s+/)[0] || ''
  const lastName = (typeof meta.last_name === 'string' ? meta.last_name.trim() : '') || fullName.split(/\s+/).slice(1).join(' ') || ''
  const phone = (typeof profile?.phone === 'string' ? profile.phone.trim() : '') || (typeof meta.phone === 'string' ? meta.phone.trim() : '')
  const email = (typeof profile?.email === 'string' ? profile.email.trim() : '') || user.email || ''
  const countryCode = (typeof profile?.country_code === 'string' ? profile.country_code : '') || (typeof meta.country_code === 'string' ? meta.country_code : 'NG')

  if (!profile?.country_code && countryCode) await admin.from('profiles').update({ country_code: countryCode.toUpperCase() }).eq('id', user.id)

  const { data: market } = await admin.from('markets').select('id,country_code,name,default_currency,status').eq('country_code', countryCode.toUpperCase()).maybeSingle()

  return NextResponse.json({ firstName, lastName, phone, email, countryCode: countryCode.toUpperCase(), market: market ?? null })
}
