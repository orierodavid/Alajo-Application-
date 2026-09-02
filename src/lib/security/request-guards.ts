import { NextResponse } from 'next/server'

const buckets = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_BUCKETS = 5_000

function clientIp(request: Request) {
  // Vercel supplies the forwarding chain. Take only the first hop and never
  // accept application-provided identity headers such as user IDs for limits.
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function rateLimit(key: string, limit: number) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
      if (buckets.size >= MAX_BUCKETS) buckets.clear()
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }
  if (current.count >= limit) return Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  current.count += 1
  return null
}

function trustedOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) {
    try { return new URL(configured).origin } catch { /* fall through */ }
  }
  return new URL(request.url).origin
}

export function mutationGuard(request: Request, scope: string, limit = 30) {
  const method = request.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null

  // Cookie-authenticated mutations must originate from ZeePay itself. When
  // Origin is absent, require Fetch Metadata to indicate a non-cross-site
  // request; this blocks common CSRF and autonomous-browser cross-site abuse.
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (origin !== trustedOrigin(request)) {
        return NextResponse.json({ error: 'CROSS_ORIGIN_REQUEST_BLOCKED' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'INVALID_REQUEST_ORIGIN' }, { status: 400 })
    }
  } else {
    const fetchSite = request.headers.get('sec-fetch-site')
    if (fetchSite === 'cross-site' || fetchSite === 'none') {
      return NextResponse.json({ error: 'REQUEST_ORIGIN_REQUIRED' }, { status: 403 })
    }
  }

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site') {
    return NextResponse.json({ error: 'CROSS_SITE_REQUEST_BLOCKED' }, { status: 403 })
  }

  const retryAfter = rateLimit(`${scope}:ip:${clientIp(request)}`, limit)
  if (retryAfter !== null) {
    return new NextResponse(JSON.stringify({ error: 'TOO_MANY_REQUESTS' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
    })
  }
  return null
}

export function requireIdempotencyKey(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim()
  if (!value || value.length < 8 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    return { error: NextResponse.json({ error: 'A valid Idempotency-Key is required.' }, { status: 400 }) }
  }
  return { key: value }
}
