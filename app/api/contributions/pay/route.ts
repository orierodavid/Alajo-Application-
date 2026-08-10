import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAYABLE_STATUSES = ['pending', 'overdue']

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return errorResponse('Authentication required.', 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid request body.')
    }

    const scheduleId = typeof body === 'object' && body !== null && 'scheduleId' in body
      ? (body as { scheduleId?: unknown }).scheduleId
      : null

    if (typeof scheduleId !== 'string' || !scheduleId) {
      return errorResponse('Contribution schedule is required.')
    }

    // The browser supplies only the schedule ID. Amount, owner and payment state
    // are read from the database and never trusted from client input.
    const { data: schedule, error: scheduleError } = await supabase
      .from('contribution_schedules')
      .select('id, group_member_id, status')
      .eq('id', scheduleId)
      .maybeSingle()

    if (scheduleError) throw scheduleError
    if (!schedule) return errorResponse('CONTRIBUTION_NOT_FOUND', 404)
    if (!PAYABLE_STATUSES.includes(schedule.status)) return errorResponse('CONTRIBUTION_NOT_PAYABLE')

    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('id', schedule.group_member_id)
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (membershipError) throw membershipError
    if (!membership) return errorResponse('You do not have access to this contribution.', 403)

    // The database RPC is the authoritative financial operation. It must perform
    // the wallet debit, contribution transition and ledger/payment recording
    // atomically on the server/database side.
    const { data, error: rpcError } = await supabase.rpc('pay_contribution', {
      p_schedule_id: scheduleId,
    })

    if (rpcError) {
      console.error('Contribution payment RPC error:', rpcError)
      const message = String(rpcError.message || 'Payment could not be completed.')
      return errorResponse(message)
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success) {
      return errorResponse(result?.message || 'Payment could not be completed.')
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Contribution payment error:', error)
    return errorResponse('Payment could not be completed.', 500)
  }
}
