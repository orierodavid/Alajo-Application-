import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/src/lib/supabase/admin'

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, key }
}

export async function GET() {
  try {
    const { url, key } = getSupabaseConfig()
    if (!url || !key) return NextResponse.json({ configured: false, authenticated: false }, { status: 503 })
    const cookieStore = await cookies()
    const supabase = createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } })
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return NextResponse.json({ configured: true, authenticated: false }, { status: 401 })

    const fullName = data.user.user_metadata?.full_name
    let phone = typeof data.user.phone === 'string' ? data.user.phone : ''
    let profileName = ''
    try {
      const admin = createAdminClient()
      const { data: profile } = await admin.from('profiles').select('full_name,phone').eq('id', data.user.id).maybeSingle()
      if (profile?.full_name) profileName = profile.full_name
      if (profile?.phone) phone = profile.phone
    } catch {}

    return NextResponse.json({
      configured: true,
      authenticated: true,
      name: profileName || (typeof fullName === 'string' && fullName.trim()) || data.user.email?.split('@')[0] || 'User',
      email: data.user.email || '',
      phone,
    })
  } catch {
    return NextResponse.json({ configured: false, authenticated: false }, { status: 503 })
  }
}
