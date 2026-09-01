import { NextResponse } from 'next/server'

const buckets = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_BUCKETS = 5_000

function clientIp(request: Request) {
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
  if (current.count >= limit) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  }
  current.count += 1
  return null
}

export function mutationGuard(request: Request, scope: string, limit = 30) {
  const method = request.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null

  const origin = request.headers.get('origin')
  if (origin) {
    try {
      const requestOrigin = new URL(request.url).origin
      if (origin !== requestOrigin) {
        return NextResponse.json({ error: 'CROSS_ORIGIN_REQUEST_BLOCKED' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'INVALID_REQUEST_ORIGIN' }, { status: 400 })
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
