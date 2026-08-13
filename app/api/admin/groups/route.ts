import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
  if (roleError || !role) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

  const body = await request.json()
  const name = String(body.name || '').trim()
  const description = String(body.description || '').trim()
  const contributionAmount = Number(body.contribution_amount)
  const requestedStart = body.start_date ? String(body.start_date) : null

  if (!name || name.length > 120) return NextResponse.json({ error: 'Enter a valid group name.' }, { status: 400 })
  if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) return NextResponse.json({ error: 'Contribution amount must be greater than zero.' }, { status: 400 })

  let startDate = requestedStart
  if (!startDate) {
    const now = new Date()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    startDate = next.toISOString().slice(0, 10)
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return NextResponse.json({ error: 'Enter a valid start date.' }, { status: 400 })
  const start = new Date(`${startDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) return NextResponse.json({ error: 'Enter a valid start date.' }, { status: 400 })
  if (start <= new Date()) return NextResponse.json({ error: 'Contribution start must be a future date.' }, { status: 400 })

  const { data: group, error } = await supabase.rpc('create_group_with_slots', {
    p_name: name,
    p_description: description,
    p_contribution_amount: contributionAmount,
    p_start_date: startDate,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ group }, { status: 201 })
}
