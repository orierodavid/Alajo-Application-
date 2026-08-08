'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SignOutButton from './sign-out-button'

const navItems = [
  ['Dashboard', '/dashboard'], ['Groups', '/groups'], ['Contributions', '/contributions'],
  ['Payouts', '/payouts'], ['Wallet', '/wallet'], ['Transactions', '/transactions'],
  ['Invite & Earn', '/invite-earn'], ['Notifications', '/notifications'], ['Settings', '/settings'],
  ['Help Center', '/help-center'],
] as const

const Icon = ({ name }: { name: string }) => {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 10 4l7 6.5"/><path d="M5.5 9.5V16h9V9.5"/></>,
    users: <><circle cx="7" cy="7" r="2.5"/><circle cx="13" cy="7" r="2.5"/><path d="M2.5 16c.4-2.4 2-3.5 4.5-3.5S11.1 13.6 11.5 16M8.5 16c.4-2.4 2-3.5 4.5-3.5s4.1 1.1 4.5 3.5"/></>,
    card: <><rect x="3" y="5" width="14" height="10" rx="2"/><path d="M3 9h14"/></>,
    money: <><circle cx="10" cy="10" r="7"/><path d="M12.5 7.5c-.6-.6-1.4-.9-2.4-.9-1.4 0-2.4.7-2.4 1.8 0 2.5 5.2 1.1 5.2 3.6 0 1.1-1 1.8-2.5 1.8-1.1 0-2-.3-2.7-1"/></>,
    bell: <><path d="M5 8a5 5 0 0 1 10 0c0 4 2 4.5 2 6H3c0-1.5 2-2 2-6"/><path d="M8 17h4"/></>,
    settings: <><circle cx="10" cy="10" r="2.5"/><path d="m10 2 1 2 2 .5 1.8-1 1.2 1.7-1.2 1.8.5 2 2 1v2l-2 1-.5 2 1.2 1.8-1.2 1.7-1.8-1-2 .5-1 2H8l-1-2-2-.5-1.8 1L2 14.8 3.2 13l-.5-2-2-1V8l2-1 .5-2L2 3.2 3.2 1.5 5 2.5 7 2z"/></>,
    help: <><circle cx="10" cy="10" r="7"/><path d="M7.8 7.5a2.3 2.3 0 1 1 3.9 1.7c-.9.8-1.7 1-1.7 2.3M10 14.5h.01"/></>,
  }
  return <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function DashboardPage() {
  const router = useRouter()
  const [name, setName] = useState('User')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      if (!data.user) {
        router.replace('/login')
        return
      }
      const fullName = data.user.user_metadata?.full_name
      setName(typeof fullName === 'string' && fullName.trim() ? fullName.trim() : data.user.email?.split('@')[0] || 'User')
      setLoading(false)
    }).catch(() => router.replace('/login'))
    return () => { active = false }
  }, [router])

  if (loading) return <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center text-gray-500">Loading your dashboard...</div>

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 flex">
      <aside className="hidden lg:flex w-[250px] shrink-0 min-h-screen bg-[#0b2313] text-white p-5 flex-col fixed inset-y-0 left-0">
        <div className="px-2 text-[26px] font-extrabold tracking-tight flex items-center gap-2">Alajo <span className="text-yellow-400">◌</span></div>
        <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">
          {navItems.map(([label, href]) => <a key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label === 'Dashboard' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}><Icon name={label === 'Dashboard' ? 'home' : label === 'Groups' ? 'users' : label === 'Wallet' ? 'card' : label === 'Payouts' ? 'money' : label === 'Notifications' ? 'bell' : label === 'Settings' ? 'settings' : label === 'Help Center' ? 'help' : 'card'} /><span>{label}</span></a>)}
          <SignOutButton />
        </nav>
        <div className="bg-[#123524] rounded-xl p-4 text-white"><p className="font-semibold text-[14px]">Grow your savings with Alajo</p><p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p><a href="/invite-earn" className="mt-3 inline-block bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends</a></div>
      </aside>

      <main className="lg:ml-[250px] flex-1 min-w-0">
        <header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center justify-between"><div><p className="text-gray-400 text-[13px]">Dashboard</p><h1 className="font-semibold text-[18px]">Good morning, {name}</h1></div><div className="flex items-center gap-4"><Icon name="bell" /><div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold">{name.charAt(0).toUpperCase()}</div></div></header>
        <section className="p-5 sm:p-8 max-w-[1250px]">
          <p className="text-gray-500 text-[14px]">Here&apos;s what&apos;s happening with your savings today</p>
          <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[['card','bg-green-50','text-[#16a34a]','Total Contributions','₦250,000.00','Across all groups'],['users','bg-orange-50','text-orange-500','Active Groups','3','Groups you\'re part of'],['money','bg-indigo-50','text-indigo-500','Total Payouts','₦180,000.00','Total received'],['card','bg-purple-50','text-purple-500','Pending Payouts','₦70,000.00','Awaiting your turn']].map(([icon,bg,color,label,value,sub]) => <div key={label} className="bg-white rounded-xl border border-gray-100 p-5"><div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${color}`}><Icon name={icon}/></div><p className="mt-3 text-gray-500 text-[13px]">{label}</p><p className="text-[20px] font-bold text-gray-900">{value}</p><p className="text-[12px] text-gray-400 mt-1">{sub}</p></div>)}
          </div>
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-100 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Recent Activity</h2><a href="/transactions" className="text-[#16a34a] text-[13px] font-medium">View All</a></div><div className="mt-5 text-sm text-gray-500">Your recent savings activity will appear here.</div></div>
            <div className="bg-white rounded-xl border border-gray-100 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">My Active Groups</h2><a href="/groups" className="text-[#16a34a] text-[13px] font-medium">View All Groups</a></div><div className="mt-5 text-sm text-gray-500">Open Groups to view your savings groups.</div></div>
          </div>
        </section>
      </main>
    </div>
  )
}
