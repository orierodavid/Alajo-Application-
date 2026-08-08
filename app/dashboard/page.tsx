import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const navItems = [
  ['Dashboard', '/dashboard'], ['Groups', '/groups'], ['Contributions', '/contributions'],
  ['Payouts', '/payouts'], ['Wallet', '/wallet'], ['Transactions', '/transactions'],
  ['Invite & Earn', '/invite-earn'], ['Notifications', '/notifications'],
  ['Settings', '/settings'], ['Help Center', '/help-center'],
] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login?error=session')

  const name = (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim())
    || user.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 flex">
      <aside className="hidden lg:flex w-[250px] shrink-0 min-h-screen bg-[#0b2313] text-white p-5 flex-col fixed inset-y-0 left-0">
        <div className="px-2 text-[26px] font-extrabold tracking-tight">Alajo</div>
        <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">
          {navItems.map(([label, href]) => (
            <a key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label === 'Dashboard' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}>
              <span>{label}</span>
              {label === 'Notifications' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#eab308]" />}
            </a>
          ))}
          <SignOutButton />
        </nav>
        <div className="bg-[#123524] rounded-xl p-4 text-white">
          <p className="font-semibold text-[14px]">Grow your savings with Alajo</p>
          <p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p>
          <a href="/invite-earn" className="mt-3 inline-block bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends →</a>
        </div>
      </aside>
      <main className="lg:ml-[250px] flex-1 min-w-0">
        <header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center justify-between">
          <div><p className="text-gray-400 text-[13px]">Dashboard</p><h1 className="font-semibold text-[18px]">Good morning, {name}</h1></div>
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold">{name.charAt(0).toUpperCase()}</div>
        </header>
        <section className="p-5 sm:p-8 max-w-[1250px]">
          <p className="text-gray-500 text-[14px]">Here's what's happening with your savings today</p>
          <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              ['Total Contributions','₦250,000.00','Across all groups'], ['Active Groups','3',"Groups you're part of"],
              ['Total Payouts','₦180,000.00','Total received'], ['Pending Payouts','₦70,000.00','Awaiting your turn'],
            ].map(([label,value,sub]) => <div key={label} className="bg-white rounded-xl border border-gray-100 p-5"><p className="text-gray-500 text-[13px]">{label}</p><p className="text-[20px] font-bold text-gray-900 mt-2">{value}</p><p className="text-[12px] text-gray-400 mt-1">{sub}</p></div>)}
          </div>
        </section>
      </main>
    </div>
  )
}
