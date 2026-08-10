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

export function MobileNavigation() {
  const pathname = usePathname(); const [open,setOpen]=useState(false); const [accountOpen,setAccountOpen]=useState(false)
  const avatar='A'
  return <div className="lg:hidden">
    <header className="fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur border-b border-gray-100 z-[100] flex items-center justify-between px-4">
      <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={()=>setOpen(!open)} className="w-10 h-10 rounded-lg flex items-center justify-center text-[#0b2313] text-2xl hover:bg-gray-100">☰</button>
      <Link href="/dashboard" className="font-extrabold text-[20px] text-[#0b2313]">Alajo</Link>
      <div className="relative"><button type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={()=>setAccountOpen(!accountOpen)} className="w-10 h-10 rounded-full bg-[#dcefe2] text-[#0b2313] flex items-center justify-center font-bold">{avatar}</button>
        {accountOpen && <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 z-[110]"><Link href="/settings" onClick={()=>setAccountOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm hover:bg-gray-50"><AlajoIcon name="settings" size={17}/>Settings</Link><Link href="/login" onClick={()=>setAccountOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><AlajoIcon name="logout" size={17}/>Logout</Link></div>}
      </div>
    </header>
    {open && <button aria-label="Close navigation menu" onClick={()=>setOpen(false)} className="fixed inset-0 bg-black/30 z-[90]" />}
    <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-[95] w-[270px] bg-[#0b2313] text-white p-5 pt-20 transition-transform duration-200 shadow-2xl`}>
      <nav className="space-y-1 text-sm font-medium">{nav.map(([icon,href,label])=>{const active=pathname===href||(href!=='/dashboard'&&pathname.startsWith(`${href}/`));return <Link key={label} href={href} onClick={()=>setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${active?'bg-white/10 text-white':'text-gray-300 hover:bg-white/5'}`}><span className="w-6 flex justify-center"><AlajoIcon name={icon} size={18}/></span>{label}</Link>})}</nav>
    </aside>
  </div>
}
