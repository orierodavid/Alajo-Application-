'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import GroupsClient from './groups-client'

export default function GroupsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key) throw new Error('Supabase configuration is missing.')
        const supabase = createBrowserClient(url, key)
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData.user) {
          router.replace('/login?error=session')
          return
        }
        if (!cancelled) setUserEmail(authData.user.email ?? '')

        await supabase.rpc('finalize_due_groups')
        await supabase.rpc('activate_due_groups')

        const [{ data: groupRows, error: groupsError }, { data: membershipRows, error: membershipError }] = await Promise.all([
          supabase.from('groups').select('id,name,description,cycle,contribution_amount,slot_count,start_date,close_date,finalized_member_count,finalized_at,status,lifecycle_managed').in('status', ['open', 'full', 'closed', 'active']).order('created_at', { ascending: true }),
          supabase.from('group_members').select('id,group_id,status,joined_at,slot_id').eq('user_id', authData.user.id),
        ])
        if (groupsError) throw new Error(groupsError.message)
        if (membershipError) throw new Error(membershipError.message)
        const rows = groupRows ?? []
        const groupIds = rows.map((g) => g.id)
        let slotRows: Array<{ group_id: string; status: string }> = []
        if (groupIds.length) {
          const { data, error: slotsError } = await supabase.from('group_slots').select('group_id,status').in('group_id', groupIds)
          if (slotsError) throw new Error(slotsError.message)
          slotRows = data ?? []
        }
        const counts = new Map<string, number>()
        for (const slot of slotRows) {
          if (slot.status === 'assigned' || slot.status === 'reserved') counts.set(slot.group_id, (counts.get(slot.group_id) ?? 0) + 1)
        }
        const normalized = rows.map((group) => ({ ...group, memberCount: counts.get(group.id) ?? 0 }))
        if (!cancelled) {
          setGroups(normalized)
          setMemberships(membershipRows ?? [])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load groups.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  if (loading) return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#16a34a] animate-spin" /><p className="mt-3 text-sm text-gray-500">Loading your groups…</p></div></main>
  if (error) return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><div className="bg-white border border-red-100 rounded-xl p-6 max-w-md w-full"><h1 className="font-bold text-gray-900">Unable to load Groups</h1><p className="mt-2 text-sm text-gray-500">{error}</p><button onClick={() => window.location.reload()} className="mt-4 bg-[#14532d] text-white rounded-lg px-4 py-2 text-sm font-semibold">Try Again</button></div></main>
  return <GroupsClient groups={groups} memberships={memberships} userEmail={userEmail} />
}
