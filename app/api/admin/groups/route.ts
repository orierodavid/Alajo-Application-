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
  const launchDate = body.launch_date ? String(body.launch_date) : ''
  const cycle = body.cycle === 'five_month' ? 'five_month' : body.cycle === 'ten_month' ? 'ten_month' : ''

  if (!name || name.length > 120) return NextResponse.json({ error: 'Enter a valid group name.' }, { status: 400 })
  if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) return NextResponse.json({ error: 'Contribution amount must be greater than zero.' }, { status: 400 })
  if (!cycle) return NextResponse.json({ error: 'Choose a 5-month or 10-month cycle.' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(launchDate)) return NextResponse.json({ error: 'Enter a valid launch date.' }, { status: 400 })

  const launch = new Date(`${launchDate}T00:00:00Z`)
  if (Number.isNaN(launch.getTime()) || launch.toISOString().slice(0, 10) !== launchDate) return NextResponse.json({ error: 'Enter a valid launch date.' }, { status: 400 })
  if (launch.getUTCDate() !== 1) return NextResponse.json({ error: 'Groups must launch on the 1st of a month.' }, { status: 400 })

  const months = cycle === 'five_month' ? 5 : 10
  const finish = new Date(Date.UTC(launch.getUTCFullYear(), launch.getUTCMonth() + months, 0))
  if (finish.getUTCFullYear() !== launch.getUTCFullYear()) return NextResponse.json({ error: `${months}-month groups cannot cross into another calendar year.` }, { status: 400 })

  const { data: group, error } = await supabase.rpc('create_group_with_slots', {
    p_name: name,
    p_description: description,
    p_contribution_amount: contributionAmount,
    p_start_date: launchDate,
    p_cycle: cycle,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ group }, { status: 201 })
}
