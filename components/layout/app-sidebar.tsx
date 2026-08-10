'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlajoIcon } from '@/components/ui/alajo-icon'

const nav = [
  ['dashboard','/dashboard','Dashboard'], ['groups','/groups','Groups'], ['contributions','/contributions','Contributions'],
  ['payouts','/payouts','Payouts'], ['wallet','/wallet','Wallet'], ['transactions','/transactions','Transactions'],
  ['invite','/invite-earn','Invite & Earn'], ['notifications','/notifications','Notifications'], ['settings','/settings','Settings'], ['help','/help-center','Help Center'],
] as const

export function AppSidebar() {
  const pathname = usePathname()

  return <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[250px] shrink-0 bg-[#0b2313] text-white p-5 flex-col">
    <Link href="/dashboard" className="px-2 flex items-center gap-2 text-[22px] font-extrabold tracking-tight">
      <span className="font-display">Alajo</span>
      <span className="text-yellow-400 text-lg" aria-hidden="true">◌</span>
    </Link>
    <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">
      {nav.map(([icon, href, label]) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
        return <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
          <span className="w-6 flex justify-center"><AlajoIcon name={icon} size={18}/></span>
          <span>{label}</span>
        </Link>
      })}
    </nav>
    <div className="bg-[#123524] rounded-xl p-4 mb-3">
      <p className="font-semibold text-[14px]">Grow your savings with Alajo</p>
      <p className="text-[12px] text-gray-300 mt-1">Stay consistent and reach your savings goals.</p>
      <Link href="/invite-earn" className="mt-3 inline-block bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends →</Link>
    </div>
    <Link href="/login" className="flex items-center gap-3 text-gray-300 px-3 py-2.5 rounded-lg hover:bg-white/5">
      <AlajoIcon name="logout" size={18}/><span>Logout</span>
    </Link>
  </aside>
}
