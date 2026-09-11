import { NextResponse } from 'next/server'
import { createAdminClient } from '@/src/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const userId = typeof body?.user_id === 'string' ? body.user_id : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
    const countryCode = typeof body?.country_code === 'string' ? body.country_code.trim() : ''

    if (!userId || !email) {
      return NextResponse.json({ error: 'Registration details are required.' }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: userResult, error: userError } = await db.auth.admin.getUserById(userId)
    if (userError || !userResult.user || (userResult.user.email || '').toLowerCase() !== email) {
      return NextResponse.json({ error: 'Unable to verify registration.' }, { status: 400 })
    }

    const [{ data: admins, error: adminsError }, { data: emailSetting, error: settingError }] = await Promise.all([
      db.from('user_roles').select('user_id').in('role', ['super_admin', 'admin']),
      db.from('system_settings').select('boolean_value').eq('key', 'email_notifications_enabled').maybeSingle(),
    ])

    if (adminsError) throw adminsError
    if (settingError) throw settingError
    if (emailSetting?.boolean_value === false) {
      return NextResponse.json({ success: true, skipped: true, reason: 'EMAIL_NOTIFICATIONS_DISABLED' })
    }

    const adminIds = [...new Set((admins || []).map((row: { user_id: string }) => row.user_id))]
    if (!adminIds.length) {
      return NextResponse.json({ success: true, skipped: true, reason: 'NO_CONFIGURED_ADMIN_RECIPIENT' })
    }

    const { data: adminUsers, error: adminUsersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (adminUsersError) throw adminUsersError

    const adminEmails = (adminUsers.users || [])
      .filter((user) => adminIds.includes(user.id) && user.email)
      .map((user) => user.email as string)

    if (!adminEmails.length) {
      return NextResponse.json({ success: true, skipped: true, reason: 'NO_CONFIGURED_ADMIN_EMAIL' })
    }

    const safeName = fullName || userResult.user.user_metadata?.full_name || 'New user'
    const safeCountry = countryCode || userResult.user.user_metadata?.country_code || '—'

    const result = await sendEmail({
      to: adminEmails,
      subject: 'New ZeePay User Registered',
      text: `A new user has registered on ZeePay.\n\nName: ${safeName}\nEmail: ${email}\nCountry: ${safeCountry}\nUser ID: ${userId}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2 style="margin-bottom:8px">New ZeePay User Registered</h2><p>A new user has successfully registered on ZeePay.</p><table cellpadding="8" cellspacing="0" style="border-collapse:collapse"><tr><td><strong>Name</strong></td><td>${escapeHtml(safeName)}</td></tr><tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr><tr><td><strong>Country</strong></td><td>${escapeHtml(safeCountry)}</td></tr><tr><td><strong>User ID</strong></td><td>${escapeHtml(userId)}</td></tr></table></div>`,
    })

    if (!result.ok) {
      console.error('ZeePay registration notification email failed:', result.error)
      return NextResponse.json({ success: false, skipped: Boolean(result.skipped), error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, sent: true })
  } catch (error) {
    console.error('ZeePay registration notification failed:', error)
    return NextResponse.json({ success: false, error: 'Unable to send registration notification.' }, { status: 500 })
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#39;',
  }[character] || character))
}
