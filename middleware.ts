import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Refreshes the Supabase session and protects authenticated routes.
 *
 * Important: middleware must never crash the entire application when the
 * Supabase environment variables are temporarily missing. In that case we
 * allow the request through; protected pages should still enforce auth at
 * the server/page level.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const protectedRoute =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/groups' ||
    pathname.startsWith('/groups/')

  const authRoute = [
    '/login',
    '/signup-personal',
    '/forgot-password',
    '/reset-password',
  ].includes(pathname)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Never allow a missing Vercel environment variable to turn every request
  // into a 500/MIDDLEWARE_INVOCATION_FAILED response.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (protectedRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (authRoute && user && pathname !== '/reset-password') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    // Do not crash the entire deployment because an auth/session refresh
    // failed. Public routes remain available; protected pages can enforce
    // authentication independently.
    console.error('Supabase middleware session refresh failed:', error)

    if (protectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)',
  ],
}
