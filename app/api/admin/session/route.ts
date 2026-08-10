import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ authorized: false }, { status: 401 })

  const { data: role, error } = await supabase.rpc('get_my_admin_role')
  if (error || !role) return NextResponse.json({ authorized: false }, { status: 403 })

  return NextResponse.json({ authorized: true, role })
}
