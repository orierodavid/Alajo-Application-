import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('retry_payout', { p_payout_id: id })
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Payout retry failed:', error)
    return NextResponse.json({ error: 'Unable to retry payout.' }, { status: 400 })
  }
}
