import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null
  const { data: role, error } = await supabase.rpc('get_my_admin_role')
  if (error || !role) return null
  return { user, admin: createAdminClient() }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const message = typeof body.body === 'string' ? body.body.trim() : ''
    if (!title || !message) return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 })
    if (title.length > 120 || message.length > 2000) return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })

    const { data: users, error: usersError } = await auth.admin.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) throw usersError
    const userIds = (users?.users ?? []).map(u => u.id)
    if (!userIds.length) return NextResponse.json({ sent: 0 })

    const rows = userIds.map(user_id => ({
      user_id,
      type: 'admin_broadcast',
      title,
      body: message,
      read_at: null,
      metadata: { source: 'admin_broadcast', sender_user_id: auth.user.id },
    }))
    const { error } = await auth.admin.from('notifications').insert(rows)
    if (error) throw error
    return NextResponse.json({ sent: rows.length })
  } catch (error) {
    console.error('Admin broadcast notification error:', error)
    return NextResponse.json({ error: 'Unable to send notification.' }, { status: 500 })
  }
}
