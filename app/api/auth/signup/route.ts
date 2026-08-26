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
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'ZeePay account service is not configured on the production server.' }, { status: 503 })

    const body = await request.json()
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim().replace(/\s+/g, ' ') : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim().replace(/\s+/g, ' ') : ''
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const fullName = `${firstName} ${lastName}`.trim()

    if (!firstName || !lastName || !/^0\d{10}$/.test(phone) || !email || !password) return NextResponse.json({ error: 'First name, last name, valid Nigerian phone number, email and password are required.' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const origin = request.headers.get('origin') || new URL(request.url).origin
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName, full_name: fullName, name: fullName, phone, email }, emailRedirectTo: `${origin}/auth/callback?next=/dashboard` } })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data.user) return NextResponse.json({ error: 'Supabase did not return a user.' }, { status: 502 })

    const adminSupabase = getServerSupabase()
    if (adminSupabase) {
      const { error: profileError } = await adminSupabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName, phone }, { onConflict: 'id' })
      if (profileError) console.error('Profile creation after signup failed:', profileError.message)
    } else console.error('Supabase service-role configuration missing; profile persistence requires the database signup trigger migration.')

    const adminRecipients = [process.env.ADMIN_NOTIFICATION_EMAIL, process.env.ADMIN_EMAIL].filter((value): value is string => Boolean(value?.trim()))
    if (adminRecipients.length) {
      const signupTime = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date())
      const emailResult = await sendEmail({ to: [...new Set(adminRecipients)], subject: `New ZeePay user registered — ${fullName}`, text: `A new ZeePay user has registered.\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nUser ID: ${data.user.id}\nRegistered: ${signupTime}\n\nEmail verification status: ${data.session ? 'verified/session issued' : 'verification pending'}.`, html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17251c"><h2 style="margin:0 0 16px;color:#123524">New ZeePay user</h2><p>A new user has registered on ZeePay.</p><table style="border-collapse:collapse"><tr><td style="padding:6px 16px 6px 0;font-weight:700">Name</td><td>${escapeHtml(fullName)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">Email</td><td>${escapeHtml(email)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">Phone</td><td>${escapeHtml(phone)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">User ID</td><td>${escapeHtml(data.user.id)}</td></tr><tr><td style="padding:6px 16px 6px 0;font-weight:700">Registered</td><td>${escapeHtml(signupTime)}</td></tr></table></div>` })
      if (!emailResult.ok && !emailResult.skipped) console.error('New-user admin notification failed:', emailResult.error)
    } else console.error('Admin signup notification skipped: ADMIN_NOTIFICATION_EMAIL/ADMIN_EMAIL is not configured.')

    return NextResponse.json({ userId: data.user.id, needsEmailConfirmation: !data.session })
  } catch (error) {
    console.error('Signup route failed:', error)
    return NextResponse.json({ error: 'Unable to create your account right now.' }, { status: 500 })
  }
}

function escapeHtml(value: string) { return value.replace(/[&<>'\"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' })[character] || character) }
