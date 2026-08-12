import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = new Set([
  '/admin/login', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/auth/callback', '/',
])

const PUBLIC_API_PATHS = new Set([
  '/api/wallet/fund/callback',
  '/api/webhooks/paystack',
])

const USER_PROTECTED_PREFIXES = [
  '/dashboard', '/groups', '/join-group', '/contributions', '/payouts',
  '/wallet', '/transactions', '/notifications', '/settings', '/help-center', '/onboarding',
]

function isUserProtected(pathname: string) {
  return USER_PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function privateResponseHeaders(response: NextResponse) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  // Paystack callback/webhook must be reachable without a browser session.
  if (PUBLIC_API_PATHS.has(pathname)) {
    return privateResponseHeaders(NextResponse.next())
  }

  // API responses are never indexable, but API authentication remains route-specific.
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return privateResponseHeaders(NextResponse.next())
  }

  const isAdmin = pathname.startsWith('/admin')
  const isUser = isUserProtected(pathname)
  if (!isAdmin && !isUser) return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL(isAdmin ? '/admin/login' : '/login', request.url))
  }

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
  if (error || !user) return NextResponse.redirect(new URL(isAdmin ? '/admin/login' : '/login', request.url))

  if (isAdmin) {
    const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
    if (roleError || !role) return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return privateResponseHeaders(response)
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/dashboard/:path*', '/groups/:path*', '/join-group/:path*', '/contributions/:path*', '/payouts/:path*', '/wallet/:path*', '/transactions/:path*', '/notifications/:path*', '/settings/:path*', '/help-center/:path*', '/onboarding/:path*'],
}
