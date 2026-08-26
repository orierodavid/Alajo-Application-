import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ authenticated: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 403 })

    const { data: memberships, error: membershipError } = await supabase.from('group_members').select('id, group_id, groups(id, name, cycle, contribution_amount)').eq('user_id', user.id)
    if (membershipError) throw membershipError
    const ids = memberships?.map((m) => m.id) ?? []
    if (!ids.length) return NextResponse.json({ authenticated: true, rows: [], summary: { totalExpected: 0, totalReceived: 0, pendingExpected: 0, failedCount: 0, paidCount: 0, pendingCount: 0 }, next: null })

    const { data: payouts, error } = await supabase.from('payouts').select('id, group_id, group_member_id, period_number, scheduled_date, expected_amount, funded_amount, shortfall_amount, status, provider, provider_reference, paid_at, failure_reason, created_at, updated_at').in('group_member_id', ids).order('scheduled_date', { ascending: true })
    if (error) throw error
    const groupByMember = new Map(memberships.map((m) => [m.id, Array.isArray(m.groups) ? m.groups[0] : m.groups]))
    const rows = (payouts ?? []).map((p) => { const g = groupByMember.get(p.group_member_id) as any; return { id:p.id, groupId:p.group_id, groupMemberId:p.group_member_id, periodNumber:p.period_number, scheduledDate:p.scheduled_date, expectedAmount:Number(p.expected_amount??0), fundedAmount:Number(p.funded_amount??0), shortfallAmount:Number(p.shortfall_amount??0), status:p.status, provider:p.provider, providerReference:p.provider_reference, paidAt:p.paid_at, failureReason:p.failure_reason, createdAt:p.created_at, updatedAt:p.updated_at, group:g?{id:g.id,name:g.name,cycle:g.cycle,contributionAmount:Number(g.contribution_amount??0)}:null } })
    const paid = rows.filter(r => ['paid','completed','successful'].includes(r.status)); const pending = rows.filter(r => ['pending','processing','scheduled'].includes(r.status)); const failed = rows.filter(r => ['failed','reversed','cancelled'].includes(r.status)); const start=new Date(); start.setHours(0,0,0,0); const next=pending.find(r=>new Date(r.scheduledDate)>=start)??null
    return NextResponse.json({ authenticated:true, rows, summary:{totalExpected:rows.reduce((s,r)=>s+r.expectedAmount,0),totalReceived:paid.reduce((s,r)=>s+r.fundedAmount,0),pendingExpected:pending.reduce((s,r)=>s+r.expectedAmount,0),failedCount:failed.length,paidCount:paid.length,pendingCount:pending.length}, next })
  } catch (error) { console.error('ZeePay payouts API error:', error); return NextResponse.json({ error:'Unable to load payouts.' }, { status:500 }) }
}
