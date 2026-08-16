import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Signup configuration missing:', {
        hasUrl: Boolean(supabaseUrl),
        hasPublishableKey: Boolean(supabaseKey),
      })
      return NextResponse.json(
        { error: 'Deotech Finance account service is not configured on the production server.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
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
        data: { full_name: name, name, email },
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

    // Persist the registration into the application's profile table immediately.
    // This runs server-side and never exposes the service-role credential to the client.
    const adminSupabase = getServerSupabase()
    if (adminSupabase) {
      const { error: profileError } = await adminSupabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: name,
      }, { onConflict: 'id' })
      if (profileError) console.error('Profile creation after signup failed:', profileError.message)
    } else {
      console.error('SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY is not configured; profile persistence requires the database signup trigger migration.')
    }

    // Notify operations/admin without making registration fail if email delivery is unavailable.
    const adminRecipients = [
      process.env.ADMIN_NOTIFICATION_EMAIL,
      process.env.ADMIN_EMAIL,
    ].filter((value): value is string => Boolean(value?.trim()))

    if (adminRecipients.length) {
      const signupTime = new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Lagos',
      }).format(new Date())

      const emailResult = await sendEmail({
        to: [...new Set(adminRecipients)],
        subject: `New Deotech Finance user registered — ${name}`,
        text: `A new Deotech Finance user has registered.\n\nName: ${name}\nEmail: ${email}\nUser ID: ${data.user.id}\nRegistered: ${signupTime}\n\nEmail verification status: ${data.session ? 'verified/session issued' : 'verification pending'}.`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17251c"><h2 style="margin:0 0 16px;color:#123524">New Deotech Finance user</h2><p>A new user has registered on Deotech Finance.</p><table style="border-collapse:collapse"><tr><td style="padding:6px 16px 6px 0;font-weight:700">Name</td><td>${escapeHtml(name)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">Email</td><td>${escapeHtml(email)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">User ID</td><td>${escapeHtml(data.user.id)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">Registered</td><td>${escapeHtml(signupTime)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">Verification</td><td>${data.session ? 'Verified / session issued' : 'Verification pending'}</td></tr></table></div>`,
      })
      if (!emailResult.ok && !emailResult.skipped) console.error('New-user admin notification failed:', emailResult.error)
    } else {
      console.error('No ADMIN_NOTIFICATION_EMAIL or ADMIN_EMAIL configured; new-user email notification was not sent.')
    }

    return NextResponse.json({ userId: data.user.id, needsEmailConfirmation: !data.session })
  } catch (error) {
    console.error('Signup route failed:', error)
    return NextResponse.json({ error: 'Unable to create your account right now.' }, { status: 500 })
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}
