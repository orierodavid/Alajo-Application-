import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, key }
}

export async function GET() {
  try {
    const { url, key } = getSupabaseConfig()
    if (!url || !key) {
      return NextResponse.json({ configured: false, authenticated: false }, { status: 503 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    })

    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      return NextResponse.json({ configured: true, authenticated: false }, { status: 401 })
    }

    const fullName = data.user.user_metadata?.full_name
    return NextResponse.json({
      configured: true,
      authenticated: true,
      name: (typeof fullName === 'string' && fullName.trim()) || data.user.email?.split('@')[0] || 'User',
    })
  } catch {
    return NextResponse.json({ configured: false, authenticated: false }, { status: 503 })
  }
}
