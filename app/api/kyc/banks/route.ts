import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { listPaystackBanks } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  try {
    const banks = await listPaystackBanks()
    return NextResponse.json({ banks: banks.filter(bank => bank.active).map(bank => ({ code: bank.code, name: bank.name, slug: bank.slug })) })
  } catch (error) {
    console.error('Paystack bank directory failed:', error)
    return NextResponse.json({ error: 'Unable to load banks.' }, { status: 503 })
  }
}
