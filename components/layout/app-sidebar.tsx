'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import SignOutButton from '@/app/dashboard/sign-out-button'

const nav = [
  ['dashboard','/dashboard','Dashboard'], ['groups','/groups','Groups'], ['contributions','/contributions','Contributions'],
  ['payouts','/payouts','Payouts'], ['wallet','/wallet','Wallet'], ['transactions','/transactions','Transactions'],
  ['invite','/invite-earn','Invite & Earn'], ['notifications','/notifications','Notifications'], ['settings','/settings','Settings'], ['help','/help-center','Help Center'],
] as const

export function AppSidebar() {
  const pathname = usePathname()
  useEffect(() => {
    document.body.classList.add('alajo-user-ui')
    return () => document.body.classList.remove('alajo-user-ui')
  }, [])

  return <aside className="user-sidebar hidden lg:flex fixed inset-y-0 left-0 z-30 w-[228px] shrink-0 bg-white text-[#5f6d64] p-4 flex-col border-r border-[#e6ebe8]">
    <div className="flex items-center justify-between px-2 py-2">
      <Link href="/dashboard" className="flex items-center gap-2 text-[21px] font-extrabold tracking-tight text-[#0d2d1b]">
        <span className="h-8 w-8 rounded-xl bg-[#e8f6ed] text-[#15803d] flex items-center justify-center"><AlajoIcon name="dashboard" size={17}/></span>
        <span>Alajo</span>
      </Link>
      <ThemeToggle />
    </div>
    <p className="mt-8 mb-2 px-3 text-[9px] font-bold uppercase tracking-[.2em] text-[#a1aaa5]">Menu</p>
    <nav className="flex-1 space-y-0.5 text-[13px] font-medium">
      {nav.map(([icon, href, label]) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
        return <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${active ? 'bg-[#eaf7ef] text-[#126b39] font-semibold' : 'text-[#718078] hover:bg-[#f3f7f4] hover:text-[#173c28]'}`}>
          {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#16a34a]"/>}
          <span className="w-5 flex justify-center"><AlajoIcon name={icon} size={17}/></span><span>{label}</span>
        </Link>
      })}
    </nav>
    <div className="bg-[#0f5b32] text-white rounded-2xl p-4 mb-3 shadow-[0_10px_25px_rgba(15,91,50,.12)]">
      <p className="font-semibold text-[13px]">Grow your savings</p>
      <p className="text-[10px] text-white/70 mt-1 leading-4">Invite friends and build stronger savings cycles together.</p>
      <Link href="/invite-earn" className="mt-3 inline-flex bg-white text-[#0b2313] text-[11px] font-semibold px-3 py-2 rounded-lg">Invite Friends <span className="ml-1">↗</span></Link>
    </div>
    <div className="pt-2 border-t border-[#edf0ee]"><SignOutButton /></div>
  </aside>
}
