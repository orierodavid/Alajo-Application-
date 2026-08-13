'use client'

import { useState } from 'react'

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    if (!confirm('Delete this group? This is only available before the group closes.')) return
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to delete group.')
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete group.')
      setLoading(false)
    }
  }
  return <div className="text-right"><button type="button" onClick={remove} disabled={loading} className="rounded-lg border border-red-900/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/30 disabled:opacity-50">{loading ? 'Deleting…' : 'Delete'}</button>{error&&<p className="mt-1 text-[10px] text-red-300">{error}</p>}</div>
}
