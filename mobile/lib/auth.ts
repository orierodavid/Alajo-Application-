import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Mobile authentication is not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}
