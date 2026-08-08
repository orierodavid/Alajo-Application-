import { NextRequest, NextResponse } from 'next/server'

/**
 * Route middleware.
 *
 * Supabase session/auth handling is intentionally not initialized here.
 * This keeps route rendering independent of browser/public Supabase
 * environment-variable injection. Authenticated pages should enforce their
 * own authorization when they perform protected data operations.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)',
  ],
}
