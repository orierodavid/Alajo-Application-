'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlajoIcon } from '@/components/ui/alajo-icon'

const nav = [['dashboard','/dashboard','Dashboard'],['groups','/groups','Groups'],['contributions','/contributions','Contributions'],['payouts','/payouts','Payouts'],['wallet','/wallet','Wallet'],['transactions','/transactions','Transactions'],['invite','/invite-earn','Invite & Earn'],['notifications','/notifications','Notifications'],['settings','/settings','Settings'],['help','/help-center','Help Center']] as const

export function MobileNavigation(){
 const pathname=usePathname();const[open,setOpen]=useState(false);const[accountOpen,setAccountOpen]=useState(false);const[firstName,setFirstName]=useState('User');const[dark,setDark]=useState(false);const[loggingOut,setLoggingOut]=useState(false)
 const publicPage=pathname==='/'
 const authPage=publicPage||pathname==='/login'||pathname==='/signup'||pathname==='/forgot-password'||pathname.startsWith('/reset-password')
 useEffect(()=>{if(authPage)return;fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(s=>{if(s?.name)setFirstName(s.name.trim().split(/\s+/)[0])}).catch(()=>{});const d=localStorage.getItem('zeepay-theme')==='dark';setDark(d);document.documentElement.classList.toggle('dark',d)},[authPage])
 const toggleTheme=()=>{const n=!dark;setDark(n);localStorage.setItem('zeepay-theme',n?'dark':'light');document.documentElement.classList.toggle('dark',n);setAccountOpen(false)}
 async function logout(){if(loggingOut)return;setLoggingOut(true);setAccountOpen(false);try{try{await createClient().auth.signOut({scope:'global'})}catch{}fetch('/api/auth/logout',{method:'POST',credentials:'include',cache:'no-store',keepalive:true}).catch(()=>{})}finally{window.location.assign('/')}}
 if(authPage)return null
 const initial=firstName.charAt(0).toUpperCase()
 return <div className="lg:hidden">
  <header className="fixed top-0 inset-x-0 h-16 bg-white/95 dark:bg-[#0d1d13]/95 backdrop-blur-md border-b border-[#e6ebe8] dark:border-[#203b2a] z-[100] flex items-center justify-between px-4 pointer-events-auto safe-top">
   <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={()=>setOpen(!open)} className="w-10 h-10 rounded-xl flex items-center justify-center text-[#0f5b32] dark:text-[#86efac] hover:bg-[#eaf7ef] dark:hover:bg-white/10">☰</button>
   <Link href="/dashboard" aria-label="ZeePay home" className="zeepay-wordmark mobile-brand" onClick={()=>setOpen(false)}>Zee<span>Pay</span></Link>
   <div className="flex items-center gap-1"><button type="button" aria-label={dark?'Switch to light mode':'Switch to dark mode'} onClick={toggleTheme} className="w-10 h-10 rounded-xl flex items-center justify-center text-[#0f5b32] dark:text-[#86efac] text-lg hover:bg-[#eaf7ef] dark:hover:bg-white/10">{dark?'☀':'☾'}</button><div className="relative"><button type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={()=>setAccountOpen(!accountOpen)} className="w-10 h-10 rounded-full bg-[#dcefe2] dark:bg-[#183b27] text-[#0b2313] dark:text-white flex items-center justify-center font-semibold">{initial}</button>{accountOpen&&<div className="absolute right-0 top-12 w-48 bg-white dark:bg-[#102719] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl p-1.5 z-[120]"><Link href="/settings" onClick={()=>setAccountOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"><AlajoIcon name="settings" size={17}/>Settings</Link><button type="button" disabled={loggingOut} onClick={logout} className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-60"><AlajoIcon name="logout" size={17}/>{loggingOut?'Logging out…':'Logout'}</button></div>}</div></div>
  </header>
  {open&&<button aria-label="Close navigation menu" onClick={()=>setOpen(false)} className="fixed inset-0 bg-[#07111f]/40 backdrop-blur-[2px] z-[90]"/>}
  <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-[95] w-[280px] bg-[#0f5b32] text-white p-5 pt-20 transition-transform duration-200 shadow-2xl`}><div className="pb-5 mb-4 border-b border-white/15"><Link href="/dashboard" onClick={()=>setOpen(false)} className="zeepay-wordmark zeepay-wordmark-light">Zee<span>Pay</span></Link><p className="text-[11px] text-white/70 mt-2">Your savings, payments & wallet</p></div><nav className="space-y-1 text-sm font-medium">{nav.map(([icon,href,label])=>{const active=pathname===href||(href!=='/dashboard'&&pathname.startsWith(`${href}/`));return <Link key={label} href={href} onClick={()=>setOpen(false)} aria-current={active?'page':undefined} className={`flex items-center gap-3 px-3 py-3 rounded-xl ${active?'bg-white text-[#0f5b32] font-bold':'text-white hover:bg-white/10'}`}><span className={`w-6 flex justify-center ${active?'text-[#16a34a]':'text-white'}`}><AlajoIcon name={icon} size={18}/></span>{label}</Link>})}</nav></aside>
 </div>
}
