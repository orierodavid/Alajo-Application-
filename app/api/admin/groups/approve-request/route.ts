import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const body = await request.json()
    if (!body.group_id) return NextResponse.json({ error: 'Group is required.' }, { status: 400 })
    const { data: role } = await supabase.rpc('get_my_admin_role')
    if (!role) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    const { data, error } = await supabase.rpc('admin_approve_group_request', { p_group_id: body.group_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, group: data })
  } catch {
    return NextResponse.json({ error: 'Unable to approve group.' }, { status: 500 })
  }
}
