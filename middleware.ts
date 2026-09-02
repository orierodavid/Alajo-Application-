import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = new Set([
  '/admin/login', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/auth/callback', '/', '/kyc', '/kyc/status',
])
const PUBLIC_API_PATHS = ['/api/wallet/fund/callback', '/api/webhooks/paystack', '/api/kyc/verify', '/api/kyc/banks']
const USER_PROTECTED_PREFIXES = ['/dashboard', '/groups', '/join-group', '/contributions', '/payouts', '/wallet', '/transactions', '/notifications', '/settings', '/help-center', '/onboarding']
const edgeBuckets = new Map<string, { count: number; resetAt: number }>()

function isUserProtected(pathname: string) {
  return USER_PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PATHS.includes(pathname)
}

function securityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)')
  response.headers.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://*.paystack.co")
  if (process.env.NODE_ENV === 'production') response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
}

function privateResponseHeaders(response: NextResponse) {
  securityHeaders(response)
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

function edgeAbuseGuard(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return null
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown'
  const key = `${ip}:${request.nextUrl.pathname.split('/').slice(0, 4).join('/')}`
  const now = Date.now()
  const current = edgeBuckets.get(key)
  if (!current || current.resetAt <= now) {
    edgeBuckets.set(key, { count: 1, resetAt: now + 60_000 })
    return null
  }
  if (current.count >= 120) {
    return new NextResponse(JSON.stringify({ error: 'TOO_MANY_REQUESTS' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))), 'Cache-Control': 'no-store' },
    })
  }
  current.count++
  return null
}

export async function middleware(request: NextRequest) {
  const abuse = edgeAbuseGuard(request)
  if (abuse) return abuse

  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname)) return securityHeaders(NextResponse.next())
  if (isPublicApi(pathname)) return privateResponseHeaders(NextResponse.next())
  if (pathname === '/api' || pathname.startsWith('/api/')) return privateResponseHeaders(NextResponse.next())

  const isAdmin = pathname.startsWith('/admin')
  const isUser = isUserProtected(pathname)
  if (!isAdmin && !isUser) return securityHeaders(NextResponse.next())

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey) return securityHeaders(NextResponse.redirect(new URL(isAdmin ? '/admin/login' : '/login', request.url)))

  let response = NextResponse.next({ request })
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return securityHeaders(NextResponse.redirect(new URL(isAdmin ? '/admin/login' : '/login', request.url)))
  }

  // Middleware is an authentication gate only. Do not call application RPCs here.
  // Access/KYC/account-state checks belong to the page/API layer so one slow or
  // transient database RPC cannot block every navigation or sign the user out.
  return privateResponseHeaders(response)
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/dashboard/:path*', '/groups/:path*', '/join-group/:path*', '/contributions/:path*', '/payouts/:path*', '/wallet/:path*', '/transactions/:path*', '/notifications/:path*', '/settings/:path*', '/help-center/:path*', '/onboarding/:path*'],
}
