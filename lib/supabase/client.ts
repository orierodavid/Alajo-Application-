import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Prefer the project's established anon key. Keep the publishable key only as
// a backwards-compatible fallback so one misconfigured public key cannot take
// authentication down when the other valid key is present.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
