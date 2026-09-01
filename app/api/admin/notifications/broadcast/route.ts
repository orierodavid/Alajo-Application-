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

  try {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const message = typeof body?.body === 'string' ? body.body.trim() : ''
    if (!title || !message) return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 })
    if (title.length > 120 || message.length > 2000) return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })

    const admin = auth.admin
    const userIds: string[] = []
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      const users = data?.users ?? []
      userIds.push(...users.map(u => u.id))
      if (users.length < 1000) break
      if (userIds.length >= 10_000) return NextResponse.json({ error: 'Broadcast audience exceeds the safety limit.' }, { status: 413 })
    }
    if (!userIds.length) return NextResponse.json({ sent: 0 })

    let sent = 0
    for (let offset = 0; offset < userIds.length; offset += 500) {
      const rows = userIds.slice(offset, offset + 500).map(user_id => ({
        user_id, type: 'admin_broadcast', title, body: message, read_at: null,
        metadata: { source: 'admin_broadcast', sender_user_id: auth.user.id },
      }))
      const { error } = await admin.from('notifications').insert(rows)
      if (error) throw error
      sent += rows.length
    }
    return NextResponse.json({ sent })
  } catch (error) {
    console.error('Admin broadcast notification error:', error)
    return NextResponse.json({ error: 'Unable to send notification.' }, { status: 500 })
  }
}
