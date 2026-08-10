'use client'

import { createClient } from '@/lib/supabase/client'

export default function AdminLogout({ compact = false }: { compact?: boolean }) {
  async function logout() {
    const supabase = createClient()
    try {
      // Clear the browser session first and ask the server to clear its auth
      // cookies as well. Global scope prevents this session from remaining
      // valid on another browser/device through the same Supabase session.
      await supabase.auth.signOut({ scope: 'global' })
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' })
    } finally {
      window.location.replace('/')
    }
  }

  return <button type="button" onClick={logout} className={compact ? 'rounded-lg border border-gray-200 dark:border-white/15 px-3 py-2 text-xs font-semibold' : 'w-full rounded-xl border border-gray-200 dark:border-white/15 px-4 py-2.5 text-left text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5'}>Sign out</button>
}
