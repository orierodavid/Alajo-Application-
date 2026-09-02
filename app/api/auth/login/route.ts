import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mutationGuard } from '@/src/lib/security/request-guards'

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
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'ZeePay account service is temporarily unavailable.' }, { status: 503 })
    }

    const cookieStore = await cookies()
    const response = NextResponse.json({ success: true, redirectTo: '/dashboard' })
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid login credentials.' }, { status: 401 })
    }

    // The protected-route middleware is the single authoritative onboarding
    // gate. Avoid repeating KYC/virtual-account reads during login; this keeps
    // sign-in fast and prevents a slow secondary lookup from making login look
    // broken on mobile or high-latency connections.
    return response
  } catch {
    return NextResponse.json({ error: 'Unable to log in right now. Please try again.' }, { status: 500 })
  }
}
