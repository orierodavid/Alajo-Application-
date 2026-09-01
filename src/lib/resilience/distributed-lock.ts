import { createAdminClient } from '@/lib/supabase/admin'

/** Cross-instance lease used only to prevent duplicate expensive work. */
export async function withDistributedLock<T>(key: string, work: () => Promise<T>, leaseSeconds = 120): Promise<{ acquired: boolean; value?: T }> {
  const ownerId = crypto.randomUUID()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('try_acquire_work_lock', {
    p_lock_key: key,
    p_owner_id: ownerId,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throw error
  if (data !== true) return { acquired: false }
  try {
    return { acquired: true, value: await work() }
  } finally {
    await admin.rpc('release_work_lock', { p_lock_key: key, p_owner_id: ownerId }).catch(() => undefined)
  }
}
