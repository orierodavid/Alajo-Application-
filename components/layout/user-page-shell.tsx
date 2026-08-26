'use client'

import { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AlajoIcon } from '@/components/ui/alajo-icon'

export function UserPageShell({ eyebrow, title, description, actions, userName = 'User', children }: { eyebrow:string; title:string; description?:string; actions?:ReactNode; userName?:string; children:ReactNode }) {
  return <div className="min-h-screen bg-[#f7f8f9] text-[#10251a]">
    <AppSidebar />
    <main className="lg:ml-[228px] min-h-screen min-w-0">
      <header className="hidden lg:flex h-[76px] bg-white border-b border-[#e6ebe8] px-4 sm:px-7 lg:px-8 items-center">
        <div className="w-full max-w-[1180px] mx-auto flex items-center justify-between gap-5">
          <div className="min-w-0"><p className="text-[#89958e] text-[10px] uppercase tracking-[.18em] font-bold">{eyebrow}</p><h1 className="font-bold text-[20px] sm:text-[22px] mt-1 text-[#10251a] truncate">{title}</h1>{description&&<p className="text-[#68766e] text-[12px] sm:text-[13px] mt-1 truncate">{description}</p>}</div>
          <div className="flex items-center gap-3 shrink-0">{actions}<button aria-label="Notifications" className="h-9 w-9 rounded-xl border border-[#e5ebe7] bg-white text-[#526158] flex items-center justify-center transition hover:border-[#b9d8c4] hover:text-[#15803d] active:scale-95"><AlajoIcon name="notifications" size={17}/></button><div className="h-9 w-9 rounded-full bg-[#e8f6ed] text-[#126b39] border border-[#cce7d5] flex items-center justify-center text-[12px] font-bold">{userName.charAt(0).toUpperCase()}</div></div>
        </div>
      </header>
      <section className="px-4 pt-20 pb-6 sm:px-7 sm:pt-20 sm:pb-7 lg:px-8 lg:pt-6"><div className="w-full max-w-[1180px] mx-auto"><div className="lg:hidden mb-5"><p className="text-[#89958e] text-[10px] uppercase tracking-[.18em] font-bold">{eyebrow}</p><h1 className="font-bold text-[24px] mt-1 text-[#10251a]">{title}</h1>{description&&<p className="text-[#68766e] text-[12px] mt-1">{description}</p>}</div>{children}</div></section>
    </main>
  </div>
}
