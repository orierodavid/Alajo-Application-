import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const body = await request.json()
    const name = String(body.name || '')
    const description = String(body.description || '')
    const contributionAmount = Number(body.contribution_amount)
    const startDate = String(body.start_date || '')
    const cycle = body.cycle === 'six_month' || body.cycle === 'ten_month' ? body.cycle : null
    if (!name || !Number.isFinite(contributionAmount) || contributionAmount <= 0 || !startDate || !cycle) {
      return NextResponse.json({ error: 'Group name, contribution amount, start date and a 6 or 10 month cycle are required.' }, { status: 400 })
    }
    const { data, error } = await supabase.rpc('create_private_group_request', {
      p_name: name.trim(),
      p_description: description.trim(),
      p_contribution_amount: contributionAmount,
      p_start_date: startDate,
      p_cycle: cycle,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, group: data })
  } catch {
    return NextResponse.json({ error: 'Unable to submit group for approval.' }, { status: 500 })
  }
}
