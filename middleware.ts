import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The admin login page is deliberately public. It must render without
  // initializing Supabase so a missing auth environment variable cannot turn
  // the login screen itself into a 500 middleware failure.
  if (pathname === '/admin/login') return NextResponse.next()
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Fail closed for protected admin routes, but never crash middleware.
  // A missing configuration means the request is unauthenticated from the
  // application's perspective; send it to the public admin login instead.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
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
  if (error || !user) return NextResponse.redirect(new URL('/admin/login', request.url))

  const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
  if (roleError || !role) return NextResponse.redirect(new URL('/', request.url))

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
