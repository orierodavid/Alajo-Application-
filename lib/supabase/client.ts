import { createBrowserClient } from '@supabase/ssr'

// Next.js can type process.env.* as string | undefined even when the
// variables are configured in Vercel. The non-null assertions here are
// intentional: the browser client requires strings at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey)
}
