'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import AdminLogout from './logout'

const nav = [
  ['Dashboard', '/admin'], ['Users', '/admin/users'], ['KYC', '/admin/kyc'], ['Groups', '/admin/groups'],
  ['Contributions', '/admin/contributions'], ['Defaults & Recovery', '/admin/defaults'], ['Payouts', '/admin/payouts'], ['Transactions', '/admin/transactions'],
  ['Wallets', '/admin/wallets'], ['Notifications', '/admin/notifications'], ['Administrators', '/admin/administrators'], ['Administration', '/admin/settings'], ['Operational Controls', '/admin/controls'],
] as const

type IconNode = ReactNode
const Icon=({name}:{name:string})=>{const p={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};const paths:Record<string,IconNode>={Dashboard:<><path d="M4 13h6V4H4z" {...p}/><path d="M14 20h6v-9h-6zM14 8h6V4h-6zM4 20h6v-3H4z" {...p}/></>,Users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...p}/><circle cx="9" cy="7" r="4" {...p}/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...p}/></>,KYC:<><rect x="3" y="4" width="18" height="16" rx="2" {...p}/><circle cx="9" cy="10" r="2" {...p}/><path d="M6 16c.8-1.6 5.2-1.6 6 0M14 9h4M14 13h4" {...p}/></>,Groups:<><circle cx="8" cy="8" r="3" {...p}/><circle cx="17" cy="9" r="2.5" {...p}/><path d="M2.5 19c.7-3.4 10.3-3.4 11 0M14 19c.5-2.3 5.7-2.4 7 0" {...p}/></>,Contributions:<><path d="M12 2v20M17 6.5c-.8-1-2.2-1.5-4-1.5-2.5 0-4 1.2-4 3s1.4 2.8 4 3.5 4 1.5 4 3.5-1.5 3-4 3c-1.8 0-3.4-.6-4.5-1.8" {...p}/></>,Payouts:<><path d="M4 7h16v12H4zM4 7l2-3h12l2 3" {...p}/><path d="M12 11v4M10 13h4" {...p}/></>,Transactions:<><path d="M3 7h15M14 4l4 3-4 3M21 17H6M10 14l-4 3 4 3" {...p}/></>,Wallets:<><path d="M3 6h17v14H3z" {...p}/><path d="M3 9h17M16 14h2" {...p}/></>,Notifications:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" {...p}/></>,Administrators:<><path d="M12 3l7 3v5c0 4.5-7 7.5-7 10-4-2.5-7-5.5-7-10V6z" {...p}/><path d="M9 12l2 2 4-4" {...p}/></>,Administration:<><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" {...p}/><path d="M3 12h2m14 0h2M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" {...p}/></>,Operational:<><path d="M4 6h16M4 12h16M4 18h16" {...p}/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></>};return <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0" aria-hidden="true">{paths[name]}</svg>}
const iconFor=(label:string)=>label==='Operational Controls'?'Operational':label

export default function AdminShell({ children, email, role }: { children: ReactNode; email: string; role: string }) {
  const pathname = usePathname(); const [mobileOpen,setMobileOpen]=useState(false)
  if(pathname==='/admin/login')return <>{children}</>
  const item=(label:string,href:string,close?:boolean)=>{const active=pathname===href || (href!=='/admin' && pathname.startsWith(`${href}/`));return <Link key={href} href={href} onClick={close?()=>setMobileOpen(false):undefined} aria-current={active?'page':undefined} className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 mb-0.5 transition-colors ${active?'bg-[#eaf7ef] text-[#0f5b32] font-bold':'text-[#425149] hover:bg-[#f3f7f4] hover:text-[#0f5b32]'}`}><span className="w-5 flex justify-center"><Icon name={iconFor(label)}/></span><span>{label}</span>{active&&<span className="absolute left-0 top-2 bottom-0 w-[3px] rounded-r-full bg-[#16a34a]"/>}</Link>}
  return <div className="admin-shell min-h-screen bg-[#f5f7f5] text-[#142019] lg:flex">
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[228px] shrink-0 bg-white text-[#425149] p-4 flex-col border-r border-[#e2e9e4]">
      <div className="flex items-center justify-between px-2 py-3"><Link href="/admin" aria-label="ZeePay home" className="zeepay-wordmark">Zee<span>Pay</span></Link></div>
      <p className="mt-8 mb-2 px-3 text-[9px] font-bold uppercase tracking-[.2em] text-[#718078]">Admin menu</p>
      <nav className="flex-1 overflow-y-auto text-[13px] font-semibold">{nav.map(([label,href])=>item(label,href))}</nav>
      <div className="pt-2 border-t border-[#e6ebe8]"><AdminLogout /></div>
    </aside>
    <main className="w-full lg:ml-[228px] min-h-screen"><div className="lg:hidden sticky top-0 z-30 h-16 px-4 flex items-center justify-between border-b border-[#e2e9e4] bg-white"><button onClick={()=>setMobileOpen(true)} aria-label="Open admin navigation" className="h-10 w-10 rounded-xl text-[#0f5b32] hover:bg-[#f3f7f4] text-xl">☰</button><Link href="/admin" aria-label="ZeePay home" className="zeepay-wordmark text-[21px]"><span>Zee</span><span>Pay</span></Link><AdminLogout compact/></div>
      {mobileOpen&&<><button aria-label="Close admin navigation" onClick={()=>setMobileOpen(false)} className="fixed inset-0 z-[90] bg-black/30 lg:hidden"/><aside className="fixed inset-y-0 left-0 z-[95] w-[228px] overflow-y-auto bg-white text-[#425149] p-4 border-r border-[#e2e9e4] lg:hidden"><div className="flex items-center justify-between px-2 py-3"><Link href="/admin" onClick={()=>setMobileOpen(false)} aria-label="ZeePay home" className="zeepay-wordmark text-[21px]"><span>Zee</span><span>Pay</span></Link><button onClick={()=>setMobileOpen(false)} aria-label="Close admin navigation" className="h-9 w-9 rounded-xl text-xl text-[#718078]">×</button></div><p className="mt-6 mb-2 px-3 text-[9px] font-bold uppercase tracking-[.2em] text-[#718078]">Admin menu</p><nav className="text-[13px] font-semibold">{nav.map(([label,href])=>item(label,href,true))}</nav><div className="pt-3 mt-3 border-t border-[#e6ebe8]"><AdminLogout/></div></aside></>}{children}</main>
  </div>
}
