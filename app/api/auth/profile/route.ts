import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(request: Request) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 })

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Please provide a valid name.' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    const { error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, full_name: name, name } })
    if (error) return NextResponse.json({ error: 'Unable to update your profile right now.' }, { status: 400 })

    return NextResponse.json({ success: true, name })
  } catch {
    return NextResponse.json({ error: 'Unable to update your profile right now.' }, { status: 500 })
  }
}
