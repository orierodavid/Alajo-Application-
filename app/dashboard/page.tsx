'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type IconName = 'dashboard' | 'groups' | 'contributions' | 'payouts' | 'wallet' | 'transactions' | 'invite' | 'notifications' | 'settings' | 'help' | 'logout' | 'coin' | 'card' | 'clock'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', groups: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', contributions: 'M6 2h9l4 4v16H6zM14 2v5h5M9 12h6M9 16h6', payouts: 'M12 2v20M17 6.5c0-1.4-2.2-2.5-5-2.5S7 5.1 7 6.5 9.2 9 12 9s5 1.1 5 2.5-2.2 2.5-5 2.5-5-1.1-5-2.5', wallet: 'M3 7h18v14H3zM3 7V5a2 2 0 0 1 2-2h14M16 14h3', transactions: 'M4 19V5M4 19h16M8 16v-5M12 16V8M16 16V4', invite: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6', notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V21h-2v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.04H7v-2h.84A1.7 1.7 0 0 0 9.4 10a1.7 1.7 0 0 0-.34-1.88L9 8.06l1.41-1.41.06.06A1.7 1.7 0 0 0 13.4 5.5V5h2v.5a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.04H21v2h-.04A1.7 1.7 0 0 0 19.4 15Z', help: 'M9.1 9a3 3 0 1 1 5.7 1.4c-.7 1.2-2.8 1.7-2.8 3.6M12 18h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', logout: 'M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-5', coin: 'M20 12c0 3-3.6 5-8 5s-8-2-8-5 3.6-5 8-5 8 2 8 5ZM4 12v4c0 3 3.6 5 8 5s8-2 8-5v-4', card: 'M3 7h18v14H3zM3 7V5a2 2 0 0 1 2-2h14', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

const navItems: Array<[IconName, string, string]> = [['dashboard', 'Dashboard', '/dashboard'], ['groups', 'Groups', '/groups'], ['contributions', 'Contributions', '/contributions'], ['payouts', 'Payouts', '/payouts'], ['wallet', 'Wallet', '/wallet'], ['transactions', 'Transactions', '/transactions'], ['invite', 'Invite & Earn', '/invite-earn'], ['notifications', 'Notifications', '/notifications'], ['settings', 'Settings', '/settings'], ['help', 'Help Center', '/help-center']]

export default function DashboardPage() {
  const [name, setName] = useState('User')

  useEffect(() => {
    let active = true
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace('/login')
          return
        }
        if (!response.ok) return
        const data = await response.json()
        if (active && data.authenticated && data.name) setName(data.name)
      })
      .catch(() => {
        // Keep the dashboard available if session verification is temporarily unavailable.
      })
    return () => { active = false }
  }, [])

  const cards: Array<[IconName, string, string, string, string, string]> = [['card', 'bg-green-50', 'text-[#16a34a]', 'Total Contributions', '₦250,000.00', 'Across all groups'], ['groups', 'bg-orange-50', 'text-orange-500', 'Active Groups', '3', "Groups you're part of"], ['payouts', 'bg-indigo-50', 'text-indigo-500', 'Total Payouts', '₦180,000.00', 'Total received'], ['clock', 'bg-purple-50', 'text-purple-500', 'Pending Payouts', '₦70,000.00', 'Awaiting your turn']]

  return <div className="min-h-screen bg-[#f8faf9] text-gray-900 flex">
    <aside className="hidden lg:flex w-[250px] shrink-0 min-h-screen bg-[#0b2313] text-white p-5 flex-col fixed inset-y-0 left-0">
      <div className="px-2 text-[26px] font-extrabold tracking-tight flex items-center gap-2">Alajo <span className="text-yellow-400"><Icon name="coin" size={20} /></span></div>
      <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">{navItems.map(([icon, label, href]) => <Link key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label === 'Dashboard' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}><Icon name={icon} /><span>{label}</span>{label === 'Notifications' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#eab308]" />}</Link>)}<Link href="/login" className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5"><Icon name="logout" /><span>Logout</span></Link></nav>
      <div className="bg-[#123524] rounded-xl p-4 text-white"><p className="font-semibold text-[14px]">Grow your savings with Alajo</p><p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p><Link href="/invite-earn" className="mt-3 inline-block bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends</Link></div>
    </aside>
    <main className="lg:ml-[250px] flex-1 min-w-0"><header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center justify-between"><div><p className="text-gray-400 text-[13px]">Dashboard</p><h1 className="font-semibold text-[18px]">Good morning, {name}</h1></div><div className="flex items-center gap-4"><Icon name="notifications" /><div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold">{name.charAt(0).toUpperCase()}</div></div></header>
      <section className="p-5 sm:p-8 max-w-[1250px]"><p className="text-gray-500 text-[14px]">Here&apos;s what&apos;s happening with your savings today</p><div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-5">{cards.map(([icon, bg, color, label, value, sub]) => <div key={label} className="bg-white rounded-xl border border-gray-100 p-5"><div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${color}`}><Icon name={icon} /></div><p className="mt-3 text-gray-500 text-[13px]">{label}</p><p className="text-[20px] font-bold text-gray-900">{value}</p><p className="text-[12px] text-gray-400 mt-1">{sub}</p></div>)}</div><div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5"><div className="bg-white rounded-xl border border-gray-100 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Recent Activity</h2><Link href="/transactions" className="text-[#16a34a] text-[13px] font-medium">View All</Link></div><div className="mt-5 text-sm text-gray-500">Your recent savings activity will appear here.</div></div><div className="bg-white rounded-xl border border-gray-100 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">My Active Groups</h2><Link href="/groups" className="text-[#16a34a] text-[13px] font-medium">View All Groups</Link></div><div className="mt-5 text-sm text-gray-500">Open Groups to view your savings groups.</div></div></div></section>
    </main>
  </div>
}
