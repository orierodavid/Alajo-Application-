type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

/**
 * Server-only Resend adapter.
 * Keep RESEND_API_KEY in Vercel environment variables; never put the key in source control.
 */
export async function sendEmail({ to, subject, html, text, from, replyTo }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const sender = from || process.env.RESEND_FROM_EMAIL || 'Alajo <onboarding@resend.dev>'

  if (!apiKey) {
    return { ok: false, skipped: true, error: 'RESEND_API_KEY is not configured.' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    cache: 'no-store',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { ok: false, skipped: false, error: data?.message || 'Resend email request failed.' }
  }

  return { ok: true, skipped: false, id: data?.id || null }
}
