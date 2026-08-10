import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminLogout from './logout'

const nav = [
  ['Dashboard', '/admin'],
  ['Users', '/admin/users'],
  ['KYC', '/admin/kyc'],
  ['Groups', '/admin/groups'],
  ['Contributions', '/admin/contributions'],
  ['Payouts', '/admin/payouts'],
  ['Transactions', '/admin/transactions'],
  ['Wallets', '/admin/wallets'],
  ['Notifications', '/admin/notifications'],
  ['Administration', '/admin/settings'],
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: role } = user ? await supabase.rpc('get_my_admin_role') : { data: null }

  return <div className="min-h-screen bg-[#f5faf7] text-gray-900 dark:bg-[#07150c] dark:text-white lg:flex">
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#0b2113]">
      <div className="h-20 px-6 flex items-center border-b border-gray-100 dark:border-white/10"><div className="w-9 h-9 rounded-xl bg-[#16a34a] text-white flex items-center justify-center font-black">A</div><div className="ml-3"><p className="font-bold">Alajo</p><p className="text-[10px] tracking-[.18em] text-gray-400">ADMIN</p></div></div>
      <nav className="flex-1 p-4 space-y-1">{nav.map(([label, href]) => <Link key={href} href={href} className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white">{label}</Link>)}</nav>
      <div className="p-4 border-t border-gray-100 dark:border-white/10"><p className="text-xs text-gray-400 truncate mb-2">{user?.email || 'Administrator'}</p><p className="text-[11px] uppercase tracking-wider text-[#16a34a] mb-3">{role || 'authorized'}</p><AdminLogout /></div>
    </aside>
    <main className="w-full lg:pl-64 min-h-screen"><div className="lg:hidden h-16 px-5 flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0b2113] sticky top-0 z-20"><Link href="/admin" className="font-bold">Alajo <span className="text-[#16a34a] text-xs ml-1">ADMIN</span></Link><AdminLogout compact /></div>{children}</main>
  </div>
}
