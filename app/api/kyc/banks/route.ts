import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { listPaystackBanks } from '@/lib/paystack'

const getCachedNigerianBanks = unstable_cache(
  async () => listPaystackBanks(),
  ['zeepay-paystack-banks-nigeria-v1'],
  { revalidate: 60 * 60 * 24 },
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  try {
    const banks = await getCachedNigerianBanks()
    return NextResponse.json({
      banks: banks.filter(bank => bank.active).map(bank => ({ code: bank.code, name: bank.name, slug: bank.slug })),
    })
  } catch (error) {
    console.error('Paystack bank directory failed:', error)
    return NextResponse.json({ error: 'Unable to load banks.' }, { status: 503 })
  }
}
