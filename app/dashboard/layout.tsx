import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/dashboard')

  const { data: kyc, error } = await supabase
    .from('kyc_records')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || kyc?.status !== 'approved') redirect('/kyc')

  return children
}
