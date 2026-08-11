import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function finishDateFor(startDate: string, months: number) {
  const [year, month] = startDate.split('-').map(Number)
  const finish = new Date(Date.UTC(year, month - 1 + months, 0))
  return finish.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
  if (roleError || !role) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 })

  const body = await request.json()
  const name = String(body.name || '').trim()
  const description = String(body.description || '').trim() || null
  const contributionAmount = Number(body.contribution_amount)
  const cycle = Number(body.cycle)
  const slotCount = Number(body.slot_count)
  const requestedStart = body.start_date ? String(body.start_date) : null

  if (!name || name.length > 120) return NextResponse.json({ error: 'Enter a valid group name.' }, { status: 400 })
  if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) return NextResponse.json({ error: 'Contribution amount must be greater than zero.' }, { status: 400 })
  if (![5, 10].includes(cycle)) return NextResponse.json({ error: 'Cycle must be 5 or 10 months.' }, { status: 400 })
  if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > 10) return NextResponse.json({ error: 'Slots must be between 1 and 10.' }, { status: 400 })

  let startDate = requestedStart
  if (!startDate) {
    const now = new Date()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    startDate = next.toISOString().slice(0, 10)
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return NextResponse.json({ error: 'Enter a valid start date.' }, { status: 400 })
  const start = new Date(`${startDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) return NextResponse.json({ error: 'Enter a valid start date.' }, { status: 400 })

  const finishDate = finishDateFor(startDate, cycle)
  const { data: group, error } = await supabase.from('groups').insert({
    name,
    description,
    cycle: cycle === 5 ? 'five_month' : 'ten_month',
    contribution_amount: contributionAmount,
    slot_count: slotCount,
    start_date: startDate,
    contribution_due_day: 29,
    finish_date: finishDate,
    status: 'open',
    created_by: user.id,
  }).select('id,name,description,cycle,contribution_amount,slot_count,start_date,contribution_due_day,finish_date,status').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ group }, { status: 201 })
}
