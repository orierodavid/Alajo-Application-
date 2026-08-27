import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { createAdminClient } from '../../../../src/lib/supabase/admin'
import { listPaystackBanks } from '@/lib/paystack'

const getCachedBanks = (country: string) => unstable_cache(
  async () => listPaystackBanks(country),
  [`zeepay-paystack-banks-${country.toLowerCase()}-v1`],
  { revalidate: 60 * 60 * 24 },
)()

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('country_code').eq('id', user.id).maybeSingle()
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const country = ((profile?.country_code || (typeof meta.country_code === 'string' ? meta.country_code : 'NG')) as string).toUpperCase()

  try {
    if (country !== 'NG') return NextResponse.json({ banks: [], countryCode: country, available: false, message: 'Bank verification for this market must be configured with a market-specific provider.' })
    const banks = await getCachedBanks('nigeria')
    return NextResponse.json({ countryCode: country, banks: banks.filter(bank => bank.active).map(bank => ({ code: bank.code, name: bank.name, slug: bank.slug })), available: true })
  } catch (error) {
    console.error('Paystack bank directory failed:', error)
    return NextResponse.json({ error: 'Unable to load banks.' }, { status: 503 })
  }
}
