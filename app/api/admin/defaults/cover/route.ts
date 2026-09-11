import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: role } = await supabase.rpc('get_my_admin_role')
  if (!role) return null
  return { supabase, user, role }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const defaultCaseId = typeof body.default_case_id === 'string' ? body.default_case_id : ''
    if (!defaultCaseId) {
      return NextResponse.json({ error: 'Default case ID is required.' }, { status: 400 })
    }

    const { data, error } = await auth.supabase.rpc('admin_cover_default_case', {
      p_default_case_id: defaultCaseId,
    })

    if (error) {
      const message = error.message || 'Unable to cover default.'
      const status = /ALREADY_COVERED|CASE_ALREADY_CLOSED|NOT_FOUND|ONLY_ALLOWED/i.test(message) ? 409 : 400
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ success: true, result: data })
  } catch (error) {
    console.error('Admin manual default coverage failed:', error)
    return NextResponse.json({ error: 'Unable to cover default.' }, { status: 500 })
  }
}
