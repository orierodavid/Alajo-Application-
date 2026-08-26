import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set([
  '/admin/login', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/auth/callback', '/', '/kyc', '/kyc/status',
])

const PUBLIC_API_PATHS = new Set([
  '/api/wallet/fund/callback', '/api/webhooks/paystack', '/api/kyc/verify', '/api/kyc/banks',
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
  if (PUBLIC_API_PATHS.has(pathname)) return privateResponseHeaders(NextResponse.next())
  if (pathname === '/api' || pathname.startsWith('/api/')) return privateResponseHeaders(NextResponse.next())

  const isAdmin = pathname.startsWith('/admin')
  const isUser = isUserProtected(pathname)
  if (!isAdmin && !isUser) return NextResponse.next()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return NextResponse.redirect(new URL(isAdmin ? '/admin/login' : '/login', request.url))

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
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
    return privateResponseHeaders(response)
  }

  // A user who has completed KYC and has an ACTIVE virtual account is fully verified.
  // Do not make the legacy onboarding_step flag capable of sending an already-verified
  // customer back to KYC/status. The Paystack webhook sets onboarding_step to complete,
  // but the real financial access gates are the persisted VERIFIED + ACTIVE states.
  const { data: kyc } = await supabase
    .from('user_kyc_profiles').select('status').eq('user_id', user.id).eq('status', 'VERIFIED').limit(1).maybeSingle()
  const { data: virtualAccount } = await supabase
    .from('user_virtual_accounts').select('status').eq('user_id', user.id).eq('status', 'ACTIVE').limit(1).maybeSingle()

  const verificationComplete = !!kyc && !!virtualAccount
  if (!verificationComplete) {
    const target = kyc ? '/kyc/status' : '/kyc'
    if (pathname !== target) return NextResponse.redirect(new URL(target, request.url))
  }

  return privateResponseHeaders(response)
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/dashboard/:path*', '/groups/:path*', '/join-group/:path*', '/contributions/:path*', '/payouts/:path*', '/wallet/:path*', '/transactions/:path*', '/notifications/:path*', '/settings/:path*', '/help-center/:path*', '/onboarding/:path*'],
}
