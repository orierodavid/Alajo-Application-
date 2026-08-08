import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Signup configuration missing:', {
        hasUrl: Boolean(supabaseUrl),
        hasPublishableKey: Boolean(supabaseKey),
      })
      return NextResponse.json(
        { error: 'Alajo account service is not configured on the production server.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const origin = request.headers.get('origin') || new URL(request.url).origin
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      console.error('Supabase signup failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Supabase did not return a user.' }, { status: 502 })
    }

    return NextResponse.json({ userId: data.user.id, needsEmailConfirmation: !data.session })
  } catch (error) {
    console.error('Signup route failed:', error)
    return NextResponse.json({ error: 'Unable to create your account right now.' }, { status: 500 })
  }
}
