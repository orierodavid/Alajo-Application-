import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: role } = await supabase.rpc('get_my_admin_role')
  if (!role) return null
  return { user, admin: createAdminClient() }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    const db = auth.admin
    const [{ data: cases, error: casesError }, { data: members, error: membersError }, { data: groups, error: groupsError }, { data: recovery, error: recoveryError }] = await Promise.all([
      db.from('default_cases').select('id,group_id,group_member_id,contribution_id,status,outstanding_amount,payout_received,grace_until,defaulted_at,last_notice_at,notice_count,deotech_covered_amount,recovered_amount,credit_bureau_notice_at,created_at,resolved_at').order('created_at', { ascending: false }),
      db.from('group_members').select('id,user_id,group_id,payout_position,payout_received_at,status'),
      db.from('groups').select('id,name,cycle,finalized_member_count,status'),
      db.from('recovery_transactions').select('id,default_case_id,amount,source,provider_reference,created_at').order('created_at', { ascending: false }),
    ])
    if (casesError || membersError || groupsError || recoveryError) throw casesError || membersError || groupsError || recoveryError
    const userIds = [...new Set((members || []).map((m: any) => m.user_id))]
    const { data: profiles, error: profilesError } = userIds.length ? await db.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [], error: null }
    if (profilesError) throw profilesError
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    const memberMap = new Map((members || []).map((m: any) => [m.id, m]))
    const groupMap = new Map((groups || []).map((g: any) => [g.id, g]))
    const rows = (cases || []).map((c: any) => {
      const m = memberMap.get(c.group_member_id); const p = m ? profileMap.get(m.user_id) : null; const g = groupMap.get(c.group_id)
      return { ...c, user: { id: m?.user_id || null, name: p?.full_name || 'User', email: p?.email || '' }, group: g ? { id: g.id, name: g.name, cycle: g.cycle, finalizedMemberCount: g.finalized_member_count, status: g.status } : null, payoutPosition: m?.payout_position ?? null, payoutReceivedAt: m?.payout_received_at ?? null, membershipStatus: m?.status ?? null }
    })
    return NextResponse.json({ cases: rows, recovery: recovery || [] })
  } catch (error) {
    console.error('Admin defaults GET failed:', error)
    return NextResponse.json({ error: 'Unable to load default and recovery cases.' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    const startedAt = new Date().toISOString()
    const { data: result, error } = await auth.admin.rpc('process_default_recovery')
    if (error) throw error
    const { data: protection, error: protectionError } = await auth.admin.rpc('protect_due_payouts')
    if (protectionError) throw protectionError

    const { data: newCases } = await auth.admin.from('default_cases').select('id,group_id,group_member_id,contribution_id,status,outstanding_amount,payout_received,grace_until,created_at').gte('created_at', startedAt)
    const memberIds = [...new Set((newCases || []).map((c: any) => c.group_member_id))]
    if (memberIds.length) {
      const { data: members } = await auth.admin.from('group_members').select('id,user_id,group_id').in('id', memberIds)
      const userIds = [...new Set((members || []).map((m: any) => m.user_id))]
      const { data: profiles } = userIds.length ? await auth.admin.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [] }
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
      const memberMap = new Map((members || []).map((m: any) => [m.id, m]))
      for (const c of newCases || []) {
        const m = memberMap.get(c.group_member_id); const p = m ? profileMap.get(m.user_id) : null
        if (!p?.email) continue
        const postPayout = Boolean(c.payout_received)
        const emailResult = await sendEmail({
          to: p.email,
          subject: postPayout ? 'Deotech Finance — contribution recovery notice' : 'Deotech Finance — contribution default notice',
          text: postPayout
            ? `Your contribution remains unpaid after the 30-day recovery window. Your savings group continues; the outstanding amount is now in recovery. Please settle the outstanding amount through Deotech Finance.`
            : `Your contribution remains unpaid after the 30-day recovery window. Because you have not received your payout, your membership has been removed from the active cycle and the group cycle has been recalculated.`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17251c"><h2 style="color:#123524">Deotech Finance — ${postPayout ? 'Recovery Notice' : 'Default Notice'}</h2><p>${postPayout ? 'Your contribution remains unpaid after the 30-day recovery window. Your savings group continues while the outstanding amount is placed into recovery.' : 'Your contribution remains unpaid after the 30-day recovery window. Because you have not received your payout, your membership has been removed from the active cycle and the group cycle has been recalculated.'}</p><p><strong>Outstanding amount:</strong> ₦${Number(c.outstanding_amount || 0).toLocaleString('en-NG')}</p><p>Please review your Deotech Finance dashboard for the full status and next steps.</p></div>`,
        })
        if (!emailResult.ok && !emailResult.skipped) console.error('Default notice email failed:', emailResult.error)
      }
    }
    return NextResponse.json({ success: true, result, protection, newCases: newCases?.length || 0 })
  } catch (error) {
    console.error('Admin defaults POST failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to process defaults.' }, { status: 500 })
  }
}
