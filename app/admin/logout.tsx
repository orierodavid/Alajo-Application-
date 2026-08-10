'use client'

import { createClient } from '@/lib/supabase/client'

export default function AdminLogout({ compact = false }: { compact?: boolean }) {
  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/')
  }
  return <button type="button" onClick={logout} className={compact ? 'rounded-lg border border-gray-200 dark:border-white/15 px-3 py-2 text-xs font-semibold' : 'w-full rounded-xl border border-gray-200 dark:border-white/15 px-4 py-2.5 text-left text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5'}>Sign out</button>
}
