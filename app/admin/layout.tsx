import './admin.css'
import { createClient } from '@/lib/supabase/server'
import AdminShell from './admin-shell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already authenticates and authorizes every /admin request.
  // Avoid a second admin-role RPC here; it was causing the admin shell to wait twice.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return children

  return <AdminShell email={user.email || 'Administrator'} role="Administrator">{children}</AdminShell>
}
