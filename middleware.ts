import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = new Set([
  '/admin/login', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/auth/callback', '/', '/kyc', '/kyc/status',
])

const PUBLIC_API_PATHS = [
  '/api/wallet/fund/callback', '/api/webhooks/paystack', '/api/kyc/verify', '/api/kyc/banks',
]

const USER_PROTECTED_PREFIXES = [
  '/dashboard', '/groups', '/join-group', '/contributions', '/payouts', '/wallet',
  '/transactions', '/notifications', '/settings', '/help-center', '/onboarding',
]

function isUserProtected(pathname: string) {
  return USER_PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
function isPublicApi(pathname: string) { return PUBLIC_API_PATHS.includes(pathname) }
function privateResponseHeaders(response: NextResponse) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()
  if (isPublicApi(pathname)) return privateResponseHeaders(NextResponse.next())
  if (pathname === '/api' || pathname.startsWith('/api/')) return privateResponseHeaders(NextResponse.next())

  const isAdmin = pathname.startsWith('/admin')
  const isUser = isUserProtected(pathname)
  if (!isAdmin && !isUser) return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return NextResponse.redirect(new URL(isAdmin ? '/admin/login' : '/login', request.url))

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
    return privateResponseHeaders(response)
  }

  // A Supabase Auth identity is not sufficient to be a ZeePay account.
  // Require an application profile before allowing any user-protected route.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, status, onboarding_step')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    // Do not allow orphaned Auth identities (for example, an Auth user with
    // no ZeePay profile) into KYC, onboarding, dashboard or financial pages.
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=account_not_found', request.url))
  }

  if (profile.status && !['active', 'pending'].includes(String(profile.status).toLowerCase())) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=account_inactive', request.url))
  }

  // KYC/DVA verification is the authoritative completion requirement.
  // onboarding_step is retained as UI progress, not as the security authority.
  const { data: kyc } = await supabase
    .from('user_kyc_profiles')
    .select('status')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const kycVerified = String(kyc?.status ?? '').toUpperCase() === 'VERIFIED'

  const { data: dva } = await supabase
    .from('user_virtual_accounts')
    .select('status')
    .eq('user_id', user.id)
    .eq('currency', 'NGN')
    .limit(1)
    .maybeSingle()

  const dvaActive = String(dva?.status ?? '').toUpperCase() === 'ACTIVE'
  const verificationComplete = kycVerified && dvaActive

  if (!verificationComplete) {
    const target = kycVerified ? '/kyc/status' : (kyc ? '/kyc/status' : '/kyc')
    if (pathname !== target) return NextResponse.redirect(new URL(target, request.url))
  }

  return privateResponseHeaders(response)
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/dashboard/:path*', '/groups/:path*', '/join-group/:path*', '/contributions/:path*', '/payouts/:path*', '/wallet/:path*', '/transactions/:path*', '/notifications/:path*', '/settings/:path*', '/help-center/:path*', '/onboarding/:path*'],
}
