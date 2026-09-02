import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { mutationGuard, requireIdempotencyKey } from '@/src/lib/security/request-guards'

const PAYABLE_STATUSES = ['pending', 'due', 'overdue', 'late', 'missed', 'grace']
function errorResponse(message: string, status = 400) { return NextResponse.json({ success: false, error: message }, { status }) }

function isCurrentMonth(value: string) {
  const due = new Date(`${value.slice(0, 10)}T00:00:00`)
  const now = new Date()
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth()
}

export async function POST(request: Request) {
  const guard = mutationGuard(request, 'contribution-pay', 20); if (guard) return guard
  const idempotency = requireIdempotencyKey(request); if (idempotency.error) return idempotency.error
  try {
    const supabase = await createClient(); const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) return errorResponse('Authentication required.', 401)
    let body: unknown; try { body = await request.json() } catch { return errorResponse('Invalid request body.') }
    const scheduleId = typeof body === 'object' && body !== null && 'scheduleId' in body ? (body as { scheduleId?: unknown }).scheduleId : null
    if (typeof scheduleId !== 'string' || !/^[0-9a-f-]{36}$/i.test(scheduleId)) return errorResponse('Contribution schedule is required.')
    const admin = createAdminClient(); const key = idempotency.key!
    const claimed = await admin.rpc('claim_idempotency_key', { p_scope:'contribution_payment', p_idempotency_key:key, p_user_id:authData.user.id, p_ttl_seconds:86400 })
    if (claimed.error) throw claimed.error
    const existing = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data
    if (!existing?.claimed) { if (existing?.status === 'COMPLETED' && existing.response) return NextResponse.json(existing.response,{status:existing.http_status??200}); return errorResponse('This contribution payment is already being processed.',409) }

    const { data: schedule, error: scheduleError } = await supabase.from('contribution_schedules').select('id,group_member_id,status,due_date').eq('id',scheduleId).maybeSingle()
    if (scheduleError) throw scheduleError
    if (!schedule) return errorResponse('CONTRIBUTION_NOT_FOUND',404)
    if (!PAYABLE_STATUSES.includes(schedule.status)) return errorResponse('CONTRIBUTION_NOT_PAYABLE')
    if (!isCurrentMonth(schedule.due_date)) return errorResponse('CURRENT_MONTH_ONLY',400)

    const { data: membership, error: membershipError } = await supabase.from('group_members').select('id').eq('id',schedule.group_member_id).eq('user_id',authData.user.id).maybeSingle()
    if (membershipError) throw membershipError
    if (!membership) return errorResponse('You do not have access to this contribution.',403)

    const { data, error: rpcError } = await supabase.rpc('pay_contribution_from_wallet',{p_schedule_id:scheduleId,p_idempotency_key:key})
    if (rpcError) {
      console.error('Contribution wallet RPC error:',rpcError)
      const message = rpcError.message || ''
      if (message.includes('CURRENT_MONTH_ONLY')) return errorResponse('CURRENT_MONTH_ONLY',400)
      if (message.includes('CONTRIBUTION_NOT_PAYABLE')) return errorResponse('CONTRIBUTION_NOT_PAYABLE',400)
      return errorResponse('Payment could not be completed.',400)
    }
    const result = Array.isArray(data) ? data[0] : data
    if (result?.code === 'INSUFFICIENT_FUNDS') return NextResponse.json({success:false,code:'INSUFFICIENT_FUNDS',required:result.required,balance:result.balance,action:'FUND_WALLET'},{status:402})
    if (!result?.success) return errorResponse(result?.message || 'Payment could not be completed.')
    const response={success:true,result}; await admin.rpc('complete_idempotency_key',{p_scope:'contribution_payment',p_idempotency_key:key,p_user_id:authData.user.id,p_status:'COMPLETED',p_response:response,p_http_status:200})
    return NextResponse.json(response)
  } catch (error) { console.error('Contribution payment error:',error); return errorResponse('Payment could not be completed.',500) }
}
