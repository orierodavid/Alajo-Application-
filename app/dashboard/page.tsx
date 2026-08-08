import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import SignOutButton from './sign-out-button'

export const dynamic = 'force-dynamic'

const navItems = [
  ['🏠', 'Dashboard', '/dashboard'],
  ['👥', 'Groups', '/groups'],
  ['📄', 'Contributions', '/contributions'],
  ['💰', 'Payouts', '/payouts'],
  ['💳', 'Wallet', '/wallet'],
  ['📊', 'Transactions', '/transactions'],
  ['🎁', 'Invite & Earn', '/invite-earn'],
  ['🔔', 'Notifications', '/notifications'],
  ['⚙️', 'Settings', '/settings'],
  ['❓', 'Help Center', '/help-center'],
] as const

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) redirect('/login?error=config')

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login?error=session')

  const user = data.user
  const name = (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) || user.email?.split('@')[0] || 'David'

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 flex">
      <aside className="hidden lg:flex w-[250px] shrink-0 min-h-screen bg-[#0b2313] text-white p-5 flex-col fixed inset-y-0 left-0">
        <div className="flex items-center gap-1 px-2">
          <span className="text-[26px] font-extrabold tracking-tight">Alajo</span>
          <svg width="20" height="20" viewBox="0 0 20 20" className="mt-1">
            <circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/>
            <path d="M10 2 A8 8 0 0 1 17 8" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M17 8 A8 8 0 0 1 14.5 16" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">
          {navItems.map(([icon, label, href]) => (
            <a key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label === 'Dashboard' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}>
              <span>{icon}</span><span>{label}</span>{label === 'Notifications' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#eab308]" />}
            </a>
          ))}
          <SignOutButton />
        </nav>
        <div className="bg-[#123524] rounded-xl p-4 text-white relative overflow-hidden">
          <p className="font-semibold text-[14px]">Grow your savings with Alajo</p>
          <p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p>
          <a href="/invite-earn" className="mt-3 inline-block bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends →</a>
          <div className="absolute -bottom-2 -right-2 text-3xl opacity-80">🪙</div>
        </div>
      </aside>

      <main className="lg:ml-[250px] flex-1 min-w-0">
        <header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center justify-between">
          <div><p className="text-gray-400 text-[13px]">Dashboard</p><h1 className="font-semibold text-[18px]">Good morning, {name} 👋</h1></div>
          <div className="flex items-center gap-4"><span className="text-lg">🔔</span><div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold">{name.charAt(0).toUpperCase()}</div></div>
        </header>

        <section className="p-5 sm:p-8 max-w-[1250px]">
          <p className="text-gray-500 text-[14px]">Here's what's happening with your savings today</p>
          <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              ['💳','bg-green-50','text-[#16a34a]','Total Contributions','₦250,000.00','Across all groups'],
              ['👥','bg-orange-50','text-orange-500','Active Groups','3',"Groups you're part of"],
              ['💰','bg-indigo-50','text-indigo-500','Total Payouts','₦180,000.00','Total received'],
              ['🕐','bg-purple-50','text-purple-500','Pending Payouts','₦70,000.00','Awaiting your turn'],
            ].map(([icon,bg,color,label,value,sub]) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${color}`}>{icon}</div>
                <p className="mt-3 text-gray-500 text-[13px]">{label}</p><p className="text-[20px] font-bold text-gray-900">{value}</p><p className="text-[12px] text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between"><h2 className="font-semibold text-gray-900">Recent Activity</h2><a href="/transactions" className="text-[#16a34a] text-[13px] font-medium">View All</a></div>
              <div className="mt-4 space-y-4 text-[14px]">
                {[
                  ['↓','Contribution Made','You made a contribution of ₦20,000','May 15, 2025','-₦20,000.00','text-red-500'],
                  ['👥','Group Joined','You joined the ₦50,000 Group','May 10, 2025','›','text-gray-300'],
                  ['↑','Payout Received','You received a payout of ₦100,000','May 1, 2025','+₦100,000.00','text-[#16a34a]'],
                  ['➕','Invited a Friend','You invited John D.','Apr 28, 2025','+₦1,000.00','text-[#16a34a]'],
                ].map(([icon,title,desc,date,amount,amountColor]) => (
                  <div key={title} className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="w-9 h-9 shrink-0 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a]">{icon}</div><div><p className="font-medium text-gray-900">{title}</p><p className="text-gray-400 text-[12px]">{desc}<br/>{date}</p></div></div><span className={`${amountColor} font-semibold whitespace-nowrap`}>{amount}</span></div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between"><h2 className="font-semibold text-gray-900">My Active Groups</h2><a href="/groups" className="text-[#16a34a] text-[13px] font-medium">View All Groups</a></div>
              <div className="mt-4 space-y-4">
                {[
                  ['₦50,000 Group','6 Months Cycle','May 15, 2025','70%','text-[#16a34a]','70,100'],
                  ['₦20,000 Group','6 Months Cycle','May 28, 2025','30%','text-[#eab308]','30,100'],
                  ['₦100,000 Group','10 Months Cycle','Jun 1, 2025','10%','text-[#3b82f6]','10,100'],
                ].map(([group,cycle,date,percent,color,dash]) => (
                  <div key={group} className="flex items-center justify-between border border-gray-100 rounded-lg p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a]">👥</div><div><p className="font-semibold text-gray-900 text-[14px]">{group}</p><p className="text-gray-400 text-[12px]">{cycle}</p><p className="text-[12px] text-gray-400">Next Contribution <span className="text-[#16a34a] font-medium">{date}</span></p></div></div><div className="relative w-10 h-10"><svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90"><circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3"/><circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" className={color} strokeWidth="3" strokeDasharray={`${dash},100`}/></svg><span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-900">{percent}</span></div></div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
