import { NextResponse } from 'next/server'
import { listPaystackBanks } from '@/lib/paystack'

export const revalidate = 86400

export async function GET() {
  try {
    const banks = await listPaystackBanks()
    return NextResponse.json({ banks })
  } catch (error) {
    console.error('ZeePay banks API error:', error)
    return NextResponse.json({ error: 'Unable to load banks.' }, { status: 502 })
  }
}
