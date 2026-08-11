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

  return <div className="min-h-screen bg-[#06130b] text-white lg:flex">
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-40 border-r border-[#22c55e]/10 bg-[#081a10]/92 backdrop-blur-3xl shadow-[18px_0_70px_rgba(0,0,0,.28)]">
      <div className="h-20 px-5 flex items-center border-b border-white/[0.07] bg-white/[0.02]">
        <div className="w-10 h-10 rounded-2xl bg-[#16a34a] text-white flex items-center justify-center font-black shadow-[0_0_28px_rgba(34,197,94,.20)]">A</div>
        <div className="ml-3"><p className="font-bold tracking-tight">Alajo</p><p className="text-[9px] tracking-[.24em] text-[#86efac]/55">ADMIN OS</p></div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(([label, href]) => <Link key={href} href={href} className="group relative flex items-center rounded-xl px-4 py-3 text-[13px] font-medium text-white/65 border border-transparent hover:border-[#22c55e]/10 hover:bg-white/[0.05] hover:text-white hover:translate-x-1 transition-all duration-200"><span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#22c55e] opacity-0 group-hover:opacity-100 transition-opacity" />{label}</Link>)}
      </nav>
      <div className="m-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl">
        <p className="text-xs text-white/45 truncate mb-2">{user.email || 'Administrator'}</p>
        <p className="text-[10px] uppercase tracking-[.18em] text-[#86efac] mb-3">{role}</p>
        <AdminLogout />
      </div>
    </aside>
    <main className="w-full lg:pl-64 min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(34,197,94,.10),transparent_30%),linear-gradient(135deg,#06130b,#0a2115)]">
      <div className="lg:hidden h-16 px-4 flex items-center justify-between border-b border-white/[0.08] bg-[#06130b]/85 backdrop-blur-2xl sticky top-0 z-20"><Link href="/admin" className="font-bold">Alajo <span className="text-[#86efac] text-[9px] tracking-[.2em] ml-1">ADMIN OS</span></Link><AdminLogout compact /></div>
      {children}
    </main>
  </div>
}
