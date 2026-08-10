'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlajoIcon } from '@/components/ui/alajo-icon'

export default function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function signOut() {
    if (loading) return
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => {})

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label="Log out of Alajo"
    >
      <AlajoIcon name="logout" size={18} />
      <span>{loading ? 'Logging out…' : 'Logout'}</span>
    </button>
  )
}
