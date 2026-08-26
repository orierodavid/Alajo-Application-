'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlajoIcon } from '@/components/ui/alajo-icon'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import SignOutButton from '@/app/dashboard/sign-out-button'

const nav = [
  ['dashboard','/dashboard','Dashboard'], ['groups','/groups','Groups'], ['contributions','/contributions','Contributions'],
  ['payouts','/payouts','Payouts'], ['wallet','/wallet','Wallet'], ['transactions','/transactions','Transactions'],
  ['notifications','/notifications','Notifications'], ['settings','/settings','Settings'], ['help','/help-center','Help Center'],
] as const

export function AppSidebar() {
  const pathname = usePathname()
  return <aside className="user-sidebar hidden lg:flex fixed inset-y-0 left-0 z-30 w-[228px] shrink-0 bg-white text-[#425149] p-4 flex-col border-r border-[#e2e9e4]">
    <div className="flex items-center justify-between px-2 py-3">
      <Link href="/dashboard" aria-label="ZeePay home" className="zeepay-wordmark">Zee<span>Pay</span></Link>
      <ThemeToggle />
    </div>
    <p className="mt-8 mb-2 px-3 text-[9px] font-bold uppercase tracking-[.2em] text-[#718078]">Menu</p>
    <nav className="flex-1 space-y-0.5 text-[13px] font-semibold">
      {nav.map(([icon, href, label]) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
        return <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${active ? 'bg-[#eaf7ef] text-[#0f5b32] font-bold' : 'text-[#425149] hover:bg-[#f3f7f4] hover:text-[#0f5b32]'}`}>
          {active && <span className="absolute left-0 top-2 bottom-0 w-[3px] rounded-r-full bg-[#16a34a]"/>}
          <span className="w-5 flex justify-center"><AlajoIcon name={icon} size={17}/></span><span>{label}</span>
        </Link>
      })}
    </nav>
    <div className="pt-2 border-t border-[#e6ebe8]"><SignOutButton /></div>
  </aside>
}
