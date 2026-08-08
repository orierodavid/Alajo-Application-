import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Alajo account service is not configured on the production server.' }, { status: 503 })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const origin = request.headers.get('origin') || new URL(request.url).origin
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` } })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Resend verification failed:', error)
    return NextResponse.json({ error: 'Unable to resend the verification email.' }, { status: 500 })
  }
}
