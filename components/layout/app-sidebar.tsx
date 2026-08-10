'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AlajoIcon } from '@/components/ui/alajo-icon'

const nav = [
  ['dashboard','/dashboard','Dashboard'], ['groups','/groups','Groups'], ['contributions','/contributions','Contributions'],
  ['payouts','/payouts','Payouts'], ['wallet','/wallet','Wallet'], ['transactions','/transactions','Transactions'],
  ['invite','/invite-earn','Invite & Earn'], ['notifications','/notifications','Notifications'], ['settings','/settings','Settings'], ['help','/help-center','Help Center'],
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  return <>
    <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur border-b border-gray-100 z-50 flex items-center justify-between px-4">
      <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)} className="w-10 h-10 rounded-lg flex items-center justify-center text-[#0b2313] hover:bg-gray-100"><span className="text-2xl leading-none">☰</span></button>
      <Link href="/dashboard" className="font-display font-extrabold text-[20px] text-[#0b2313]">Alajo</Link>
      <div className="relative">
        <button type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)} className="w-10 h-10 rounded-full bg-[#dcefe2] text-[#0b2313] flex items-center justify-center font-bold">A</button>
        {accountOpen && <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 z-[60]">
          <Link href="/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50"><AlajoIcon name="settings" size={17}/> Settings</Link>
          <Link href="/login" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><AlajoIcon name="logout" size={17}/> Logout</Link>
        </div>}
      </div>
    </div>
    {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 bg-black/30 z-40" />}
    <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 fixed lg:flex w-[270px] lg:w-[250px] shrink-0 min-h-screen bg-[#0b2313] text-white p-5 flex flex-col inset-y-0 left-0 z-50 lg:z-30 shadow-2xl shadow-black/10 pt-20 lg:pt-5`}>
      <Link href="/dashboard" onClick={() => setOpen(false)} className="px-2 hidden lg:flex items-center gap-2 text-[22px] font-extrabold tracking-tight"><span className="font-display">Alajo</span><span className="text-yellow-400 text-lg" aria-hidden="true">◌</span></Link>
      <nav className="mt-2 lg:mt-8 flex-1 space-y-1 text-[14px] font-medium">
        {nav.map(([icon, href, label]) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
          return <Link key={label} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}><span className="w-6 flex justify-center"><AlajoIcon name={icon} size={18}/></span><span>{label}</span></Link>
        })}
      </nav>
      <div className="bg-[#123524] rounded-xl p-4 mb-3"><p className="font-semibold text-[14px]">Grow your savings with Alajo</p><p className="text-[12px] text-gray-300 mt-1">Stay consistent and reach your savings goals.</p><Link href="/invite-earn" onClick={() => setOpen(false)} className="mt-3 inline-block bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends →</Link></div>
      <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-3 text-gray-300 px-3 py-2.5 rounded-lg hover:bg-white/5"><AlajoIcon name="logout" size={18}/><span>Logout</span></Link>
    </aside>
  </>
}
