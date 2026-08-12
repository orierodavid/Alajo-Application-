import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
  const { data: role, error: roleError } = await supabase.rpc('get_my_admin_role')
  if (roleError || !role) return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
  return { user, role, admin: createAdminClient() }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error
    const { admin } = auth
    const [{ data: wallets, error: walletsError }, { data: payments, error: paymentsError }, { data: ledger, error: ledgerError }, { data: notifications, error: notificationsError }] = await Promise.all([
      admin.from('wallets').select('id,user_id,balance,currency,created_at,updated_at').order('updated_at', { ascending: false }).limit(100),
      admin.from('payments').select('id,user_id,amount,currency,provider,provider_reference,status,metadata,created_at,updated_at').order('created_at', { ascending: false }).limit(100),
      admin.from('ledger_transactions').select('id,user_id,type,status,amount,currency,payment_id,payout_id,description,created_at').order('created_at', { ascending: false }).limit(100),
      admin.from('notifications').select('id,user_id,type,title,body,read_at,metadata,created_at').order('created_at', { ascending: false }).limit(100),
    ])
    if (walletsError) throw walletsError
    if (paymentsError) throw paymentsError
    if (ledgerError) throw ledgerError
    if (notificationsError) throw notificationsError
    const userIds = [...new Set([...(wallets ?? []), ...(payments ?? []), ...(ledger ?? []), ...(notifications ?? [])].map(x => x.user_id).filter(Boolean))]
    const { data: profiles } = userIds.length ? await admin.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] }
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
    const withUser = <T extends { user_id: string }>(row: T) => ({ ...row, user: profileMap.get(row.user_id) ?? null })
    return NextResponse.json({ wallets: (wallets ?? []).map(withUser), payments: (payments ?? []).map(withUser), ledger: (ledger ?? []).map(withUser), notifications: (notifications ?? []).map(withUser) })
  } catch (error) {
    console.error('Admin finance data error:', error)
    return NextResponse.json({ error: 'Unable to load financial data.' }, { status: 500 })
  }
}
