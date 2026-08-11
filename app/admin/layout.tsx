import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminLogout from './logout'

const nav = [
  ['Dashboard', '/admin'], ['Users', '/admin/users'], ['KYC', '/admin/kyc'], ['Groups', '/admin/groups'],
  ['Contributions', '/admin/contributions'], ['Payouts', '/admin/payouts'], ['Transactions', '/admin/transactions'],
  ['Wallets', '/admin/wallets'], ['Notifications', '/admin/notifications'], ['Administration', '/admin/settings'],
] as const

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: role } = user ? await supabase.rpc('get_my_admin_role') : { data: null }
  if (!user || !role) return children

  return <div className="min-h-screen bg-[#f5f7f5] text-[#111814] lg:flex dark:bg-[#08150d] dark:text-[#f4f8f5]">
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-40 bg-white border-r border-[#e6ebe8] shadow-[6px_0_24px_rgba(12,49,28,.035)] dark:bg-[#0d1d13] dark:border-[#1d3324] dark:shadow-[6px_0_28px_rgba(0,0,0,.20)]">
      <div className="h-[72px] px-5 flex items-center border-b border-[#edf1ee] dark:border-[#1d3324] bg-white dark:bg-[#0d1d13]">
        <div className="w-9 h-9 rounded-xl bg-[#16a34a] text-white flex items-center justify-center font-black shadow-[0_4px_16px_rgba(22,163,74,.18)]">A</div>
        <div className="ml-3"><p className="font-bold tracking-tight text-[#17231c] dark:text-white">Alajo</p><p className="text-[9px] tracking-[.24em] text-[#168447]">ADMIN</p></div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(([label, href]) => <Link key={href} href={href} className="group relative flex items-center rounded-lg px-3.5 py-2.5 text-[12px] font-semibold text-[#66736b] dark:text-[#9eafa3] border border-transparent hover:border-[#dbe8df] hover:bg-[#f1f7f3] hover:text-[#163c27] dark:hover:border-[#294533] dark:hover:bg-[#14291d] dark:hover:text-white hover:translate-x-0.5 transition-all duration-200"><span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#16a34a] opacity-0 group-hover:opacity-100 transition-opacity" />{label}</Link>)}
      </nav>
      <div className="m-3 p-3.5 rounded-xl border border-[#e6ebe8] bg-[#f7faf8] dark:border-[#203b2a] dark:bg-[#112419]">
        <p className="text-[11px] text-[#66736b] dark:text-[#9eafa3] truncate mb-1.5">{user.email || 'Administrator'}</p>
        <p className="text-[9px] uppercase tracking-[.18em] text-[#168447] mb-3">{role}</p>
        <AdminLogout />
      </div>
    </aside>
    <main className="admin-workspace w-full lg:pl-64 min-h-screen bg-[#f5f7f5] dark:bg-[#08150d]">
      <div className="lg:hidden h-16 px-4 flex items-center justify-between border-b border-[#e6ebe8] bg-white sticky top-0 z-20 dark:border-[#1d3324] dark:bg-[#0d1d13]"><Link href="/admin" className="font-bold text-[#17231c] dark:text-white">Alajo <span className="text-[#168447] text-[9px] tracking-[.2em] ml-1">ADMIN</span></Link><AdminLogout compact /></div>
      {children}
    </main>
  </div>
}
