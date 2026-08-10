import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const cards = [
  ['Users', 'users', '/admin/users'],
  ['KYC pending', 'kyc_pending', '/admin/kyc'],
  ['Active groups', 'groups_active', '/admin/groups'],
  ['Contributions due', 'contributions_due', '/admin/contributions'],
  ['Contributions paid', 'contributions_paid', '/admin/contributions'],
  ['Upcoming payouts', 'payouts_upcoming', '/admin/payouts'],
  ['Payouts paid', 'payouts_paid', '/admin/payouts'],
  ['Failed payments', 'failed_payments', '/admin/transactions'],
] as const

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: role } = await supabase.rpc('get_my_admin_role')
  if (!role) redirect('/admin/login')
  const { data, error } = await supabase.rpc('admin_dashboard_summary')
  const summary = data || {}

  return <div className="p-5 sm:p-8 max-w-7xl mx-auto">
    <header className="mb-8"><p className="text-xs font-bold tracking-[.2em] text-[#16a34a]">OPERATIONS</p><h1 className="text-3xl sm:text-4xl font-bold mt-2">Admin Dashboard</h1><p className="text-gray-500 dark:text-gray-400 mt-2">Real-time operational overview of Alajo.</p></header>
    {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">Unable to load live summary.</div>}
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label, key, href]) => <Link key={key} href={href} className="rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#102719] p-5 hover:-translate-y-0.5 transition"><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="text-3xl font-bold mt-2">{Number(summary[key] || 0).toLocaleString()}</p></Link>)}</section>
    <section className="mt-8 grid lg:grid-cols-3 gap-5"><Link href="/admin/payouts" className="rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#102719] p-6"><p className="text-xs font-bold tracking-wider text-[#16a34a]">PAYOUT OPERATIONS</p><h2 className="text-xl font-bold mt-2">Manage payout schedules</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Create and manage administrator-defined payout schedules without recalculating user schedules.</p></Link><Link href="/admin/contributions" className="rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#102719] p-6"><p className="text-xs font-bold tracking-wider text-[#16a34a]">CONTRIBUTIONS</p><h2 className="text-xl font-bold mt-2">Contribution schedules</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Review and manage contribution scheduling and exceptions.</p></Link><Link href="/admin/kyc" className="rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#102719] p-6"><p className="text-xs font-bold tracking-wider text-[#16a34a]">COMPLIANCE</p><h2 className="text-xl font-bold mt-2">Review KYC</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Monitor pending and under-review identity verification.</p></Link></section>
  </div>
}
