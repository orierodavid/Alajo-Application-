import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { mutationGuard, requireIdempotencyKey } from '@/src/lib/security/request-guards'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null
  const { data: role, error } = await supabase.rpc('get_my_admin_role')
  if (error || !role) return null
  return { user, admin: createAdminClient() }
}

export async function POST(request: Request) {
  const guard = mutationGuard(request, 'admin-broadcast', 3)
  if (guard) return guard
  const idempotency = requireIdempotencyKey(request)
  if (idempotency.error) return idempotency.error

  let admin: ReturnType<typeof createAdminClient> | null = null
  let actorId: string | null = null
  let keyClaimed = false
  const key = idempotency.key!

  const finish = async (status: string, response: Record<string, unknown>, httpStatus: number) => {
    if (!admin || !actorId || !keyClaimed) return
    await admin.rpc('complete_idempotency_key', {
      p_scope: 'admin_broadcast', p_idempotency_key: key, p_user_id: actorId,
      p_status: status, p_response: response, p_http_status: httpStatus,
    })
  }

  try {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    admin = auth.admin
    actorId = auth.user.id

    const claimed = await admin.rpc('claim_idempotency_key', {
      p_scope: 'admin_broadcast', p_idempotency_key: key, p_user_id: actorId, p_ttl_seconds: 86400,
    })
    if (claimed.error) throw claimed.error
    const existing = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data
    if (!existing?.claimed) {
      if (existing?.status === 'COMPLETED' && existing.response) return NextResponse.json(existing.response, { status: existing.http_status ?? 200 })
      return NextResponse.json({ error: 'This broadcast request is already being processed.' }, { status: 409 })
    }
    keyClaimed = true

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const message = typeof body?.body === 'string' ? body.body.trim() : ''
    if (!title || !message) {
      const response = { error: 'Title and message are required.' }
      await finish('FAILED', response, 400)
      return NextResponse.json(response, { status: 400 })
    }
    if (title.length > 120 || message.length > 2000) {
      const response = { error: 'Message is too long.' }
      await finish('FAILED', response, 400)
      return NextResponse.json(response, { status: 400 })
    }

    const userIds: string[] = []
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      const users = data?.users ?? []
      userIds.push(...users.map(u => u.id))
      if (users.length < 1000) break
      if (userIds.length >= 10_000) {
        const response = { error: 'Broadcast audience exceeds the safety limit.' }
        await finish('FAILED', response, 413)
        return NextResponse.json(response, { status: 413 })
      }
    }
    if (!userIds.length) {
      const response = { sent: 0 }
      await finish('COMPLETED', response, 200)
      return NextResponse.json(response)
    }

    let sent = 0
    for (let offset = 0; offset < userIds.length; offset += 500) {
      const rows = userIds.slice(offset, offset + 500).map(user_id => ({
        user_id, type: 'admin_broadcast', title, body: message, read_at: null,
        metadata: { source: 'admin_broadcast', sender_user_id: actorId, idempotency_key: key },
      }))
      const { error } = await admin.from('notifications').insert(rows)
      if (error) throw error
      sent += rows.length
    }

    const response = { sent }
    await finish('COMPLETED', response, 200)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Admin broadcast notification error:', error)
    const response = { error: 'Unable to send notification.' }
    await finish('FAILED', response, 500)
    return NextResponse.json(response, { status: 500 })
  }
}
