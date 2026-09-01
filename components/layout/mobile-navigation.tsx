'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlajoIcon } from '@/components/ui/alajo-icon'

const nav = [['dashboard','/dashboard','Dashboard'],['groups','/groups','Groups'],['contributions','/contributions','Contributions'],['payouts','/payouts','Payouts'],['wallet','/wallet','Wallet'],['transactions','/transactions','Transactions'],['invite','/invite-earn','Invite & Earn'],['notifications','/notifications','Notifications'],['settings','/settings','Settings'],['help','/help-center','Help Center']] as const

const publicNav = [
  ['Home','/'],
  ['How it works','/#how'],
  ['Why ZeePay','/#features'],
  ['Legal Centre','/legal'],
  ['Terms & Conditions','/terms'],
  ['Privacy Policy','/privacy'],
] as const

export function MobileNavigation(){
 const pathname=usePathname();const[open,setOpen]=useState(false);const[accountOpen,setAccountOpen]=useState(false);const[firstName,setFirstName]=useState('User');const[dark,setDark]=useState(false);const[loggingOut,setLoggingOut]=useState(false)
 const publicPage=pathname==='/'||pathname==='/legal'||pathname==='/terms'||pathname==='/privacy'
 const authPage=pathname==='/login'||pathname==='/signup'||pathname==='/forgot-password'||pathname.startsWith('/reset-password')||pathname==='/verify-email'
 const adminPage=pathname==='/admin'||pathname.startsWith('/admin/')
 useEffect(()=>{
   if(publicPage||authPage||adminPage)return
   fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(s=>{if(s?.name)setFirstName(s.name.trim().split(/\s+/)[0])}).catch(()=>{})
   const d=localStorage.getItem('zeepay-theme')==='dark';setDark(d);document.documentElement.classList.toggle('dark',d)
 },[publicPage,authPage,adminPage])
 const toggleTheme=()=>{const n=!dark;setDark(n);localStorage.setItem('zeepay-theme',n?'dark':'light');document.documentElement.classList.toggle('dark',n);setAccountOpen(false)}
 async function logout(){if(loggingOut)return;setLoggingOut(true);setAccountOpen(false);try{try{await createClient().auth.signOut({scope:'global'})}catch{}fetch('/api/auth/logout',{method:'POST',credentials:'include',cache:'no-store',keepalive:true}).catch(()=>{})}finally{window.location.assign('/')}}
 if(adminPage)return null

 if(publicPage||authPage) return <div className="lg:hidden">
   <header className="fixed top-0 inset-x-0 h-16 bg-[#f8f7f3]/95 backdrop-blur-md border-b border-[#dfe7e1] z-[100] flex items-center justify-between px-4 safe-top">
     <Link href="/" aria-label="ZeePay home" className="zeepay-wordmark mobile-brand">Zee<span>Pay</span></Link>
     <div className="flex items-center gap-2">
       <Link href="/login" className="rounded-full border border-[#123524]/15 bg-white px-3 py-2 text-xs font-bold text-[#123524]">Sign in</Link>
       <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={()=>setOpen(!open)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#123524] text-white text-lg">{open?'×':'☰'}</button>
     </div>
   </header>
   {open&&<button aria-label="Close navigation menu" onClick={()=>setOpen(false)} className="fixed inset-0 bg-[#07111f]/40 backdrop-blur-[2px] z-[90]"/>}
   <aside className={`${open?'translate-x-0':'translate-x-full'} fixed inset-y-0 right-0 z-[95] w-[300px] max-w-[86vw] bg-white text-[#123524] transition-transform duration-200 shadow-2xl`}>
     <div className="flex items-center justify-between border-b border-[#e4ebe6] px-6 pt-[max(76px,calc(env(safe-area-inset-top)+56px))] pb-5">
       <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e85d04]">ZeePay</p><h2 className="mt-1 text-xl font-black">Explore</h2></div>
       <button type="button" aria-label="Close navigation menu" onClick={()=>setOpen(false)} className="h-9 w-9 rounded-full bg-[#f1f5f2] text-lg">×</button>
     </div>
     <nav className="px-4 py-4 space-y-1 text-[15px] font-semibold">
       {publicNav.map(([label,href])=><Link key={label} href={href} onClick={()=>setOpen(false)} className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[#365044] hover:bg-[#f1f6f2]">{label}<span className="text-[#e85d04]">→</span></Link>)}
     </nav>
     <div className="mx-4 mt-2 border-t border-[#e4ebe6] pt-4 space-y-2">
       <Link href="/login" onClick={()=>setOpen(false)} className="flex w-full items-center justify-center rounded-xl border border-[#123524]/15 px-4 py-3 text-sm font-bold">Sign in</Link>
       <Link href="/signup" onClick={()=>setOpen(false)} className="flex w-full items-center justify-center rounded-xl bg-[#e85d04] px-4 py-3 text-sm font-bold text-white">Get started →</Link>
     </div>
   </aside>
 </div>

 const initial=firstName.charAt(0).toUpperCase()
 return <div className="lg:hidden">
  <header className="fixed top-0 inset-x-0 h-16 bg-white/95 dark:bg-[#0d1d13]/95 backdrop-blur-md border-b border-[#e6ebe8] dark:border-[#203b2a] z-[100] flex items-center justify-between px-4 pointer-events-auto safe-top">
   <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={()=>setOpen(!open)} className="w-10 h-10 rounded-xl flex items-center justify-center text-[#0f5b32] dark:text-[#86efac] hover:bg-[#eaf7ef] dark:hover:bg-white/10">☰</button>
   <Link href="/dashboard" aria-label="ZeePay home" className="zeepay-wordmark mobile-brand" onClick={()=>setOpen(false)}>Zee<span>Pay</span></Link>
   <div className="flex items-center gap-1"><button type="button" aria-label={dark?'Switch to light mode':'Switch to dark mode'} onClick={toggleTheme} className="w-10 h-10 rounded-xl flex items-center justify-center text-[#0f5b32] dark:text-[#86efac] text-lg hover:bg-[#eaf7ef] dark:hover:bg-white/10">{dark?'☀':'☾'}</button><div className="relative"><button type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={()=>setAccountOpen(!accountOpen)} className="w-10 h-10 rounded-full bg-[#dcefe2] dark:bg-[#183b27] text-[#0b2313] dark:text-white flex items-center justify-center font-semibold">{initial}</button>{accountOpen&&<div className="absolute right-0 top-12 w-48 bg-white dark:bg-[#102719] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl p-1.5 z-[120]"><Link href="/settings" onClick={()=>setAccountOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"><AlajoIcon name="settings" size={17}/>Settings</Link><button type="button" disabled={loggingOut} onClick={logout} className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-60"><AlajoIcon name="logout" size={17}/>{loggingOut?'Logging out…':'Logout'}</button></div>}</div></div>
  </header>
  {open&&<button aria-label="Close navigation menu" onClick={()=>setOpen(false)} className="fixed inset-0 bg-[#07111f]/40 backdrop-blur-[2px] z-[90]"/>}
  <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-[95] w-[280px] bg-[#0f5b32] text-white transition-transform duration-200 shadow-2xl`}>
    <div className="mobile-drawer-brand px-7 pt-20 pb-7"><Link href="/dashboard" onClick={()=>setOpen(false)} aria-label="ZeePay home" className="zeepay-drawer-wordmark">Zee<span>Pay</span></Link></div>
    <nav className="px-5 py-5 space-y-1 text-[15px] font-semibold">{nav.map(([icon,href,label])=>{const active=pathname===href||(href!=='/dashboard'&&pathname.startsWith(`${href}/`));return <Link key={label} href={href} onClick={()=>setOpen(false)} aria-current={active?'page':undefined} className={`flex items-center gap-3 px-3 py-3 rounded-xl ${active?'bg-white text-[#0f7a3f] font-bold shadow-sm':'text-white hover:bg-white/10'}`}><span className="w-6 flex justify-center"><AlajoIcon name={icon} size={18}/></span>{label}</Link>})}</nav>
  </aside>
 </div>
}
