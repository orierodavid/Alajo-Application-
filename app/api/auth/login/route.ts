import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mutationGuard } from '@/src/lib/security/request-guards'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const guard = mutationGuard(request, 'auth-login', 30)
  if (guard) return guard

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password || email.length > 254 || password.length > 256) {
      return NextResponse.json({ error: 'Invalid login credentials.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    const keys = [publishableKey, anonKey].filter((key, index, all): key is string => Boolean(key) && all.indexOf(key) === index)

    if (!supabaseUrl || keys.length === 0) {
      console.error('[auth/login] Supabase authentication configuration is incomplete')
      return NextResponse.json({ error: 'ZeePay account service is temporarily unavailable.' }, { status: 503 })
    }

    const cookieStore = await cookies()
    let lastError: { message?: string; code?: string; status?: number } | null = null

    for (const key of keys) {
      const response = NextResponse.json({ success: true, redirectTo: '/dashboard' })
      const supabase = createServerClient(supabaseUrl, key, {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, options)
            })
          },
        },
      })

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && data.user) return response

      lastError = { message: error?.message, code: error?.code, status: error?.status }

      const apiKeyFailure =
        error?.code === 'invalid_api_key' ||
        error?.message?.toLowerCase().includes('invalid api key') ||
        (error?.status === 401 && error?.message?.toLowerCase().includes('api key'))
      if (!apiKeyFailure) break
    }

    console.warn('[auth/login] Supabase sign-in rejected', {
      code: lastError?.code ?? null,
      status: lastError?.status ?? null,
      message: lastError?.message ?? null,
    })

    if (lastError?.status === 429) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a moment and try again.' }, { status: 429 })
    }
    if (lastError?.code === 'email_not_confirmed') {
      return NextResponse.json({ error: 'Please verify your email address before logging in.' }, { status: 403 })
    }
    if (lastError?.status === 401 && lastError?.message?.toLowerCase().includes('api key')) {
      return NextResponse.json({ error: 'ZeePay account service is temporarily unavailable.' }, { status: 503 })
    }

    return NextResponse.json({ error: 'Invalid login credentials.' }, { status: 401 })
  } catch (error) {
    console.error('[auth/login] Unexpected authentication failure', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Unable to log in right now. Please try again.' }, { status: 500 })
  }
}
