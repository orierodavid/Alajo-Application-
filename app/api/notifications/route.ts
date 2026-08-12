import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })
    const { data, error } = await supabase.from('notifications').select('id,type,title,body,read_at,metadata,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return NextResponse.json({ authenticated: true, notifications: data ?? [] })
  } catch (error) {
    console.error('Notifications data error:', error)
    return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (body?.all === true) {
      const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Notification is required.' }, { status: 400 })
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json({ error: 'Unable to update notification.' }, { status: 500 })
  }
}
