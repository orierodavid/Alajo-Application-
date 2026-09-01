'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  ['How it works','/#how'],
  ['Why ZeePay','/#features'],
  ['Legal Centre','/legal'],
  ['Privacy','/privacy'],
] as const

export function PublicNavigation(){
 const pathname=usePathname()
 const publicPage=pathname==='/'||pathname==='/legal'||pathname==='/terms'||pathname==='/privacy'||pathname==='/login'||pathname==='/signup'||pathname==='/forgot-password'||pathname.startsWith('/reset-password')||pathname==='/verify-email'
 if(!publicPage||pathname==='/')return null
 return <header className="hidden lg:block sticky top-0 z-[100] border-b border-[#dfe7e1] bg-[#f8f7f3]/95 backdrop-blur-md">
   <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-10">
     <Link href="/" aria-label="ZeePay home" className="flex items-center gap-3">
       <img src="/icons/zeepay.svg" alt="ZeePay" className="h-10 w-10 rounded-xl object-contain"/>
       <span className="text-[21px] font-black tracking-[-.06em] text-[#123524]">ZEEPAY</span>
     </Link>
     <nav className="flex items-center gap-7 text-[13px] font-bold text-[#65736a]">
       {links.map(([label,href])=><Link key={label} href={href} className="transition-colors hover:text-[#123524]">{label}</Link>)}
     </nav>
     <div className="flex items-center gap-3">
       <Link href="/login" className="rounded-full border border-[#123524]/15 bg-white px-5 py-2.5 text-[13px] font-bold text-[#123524]">Sign in</Link>
       <Link href="/signup" className="rounded-full bg-[#e85d04] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm">Get started →</Link>
     </div>
   </div>
 </header>
}
