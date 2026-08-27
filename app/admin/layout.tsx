import './admin.css'
import { createClient } from '@/lib/supabase/server'
import AdminShell from './admin-shell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: role } = user ? await supabase.rpc('get_my_admin_role') : { data: null }
  if (!user || !role) return children

  return <AdminShell email={user.email || 'Administrator'} role={role}>{children}</AdminShell>
}
