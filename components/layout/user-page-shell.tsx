'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AlajoIcon } from '@/components/ui/alajo-icon'

export function UserPageShell({
  eyebrow,
  title,
  description,
  actions,
  userName = 'User',
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  userName?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#10251a]">
      <AppSidebar />
      <main className="lg:ml-[228px] min-h-screen min-w-0">
        <header className="h-[76px] bg-white border-b border-[#e6ebe8] px-4 sm:px-7 lg:px-8 flex items-center">
          <div className="w-full max-w-[1180px] mx-auto flex items-center justify-between gap-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden flex items-center shrink-0 mr-1">
                <Link href="/dashboard" aria-label="ZeePay home" className="text-[22px] leading-none font-black italic tracking-[-0.055em] text-[#0d2d1b]">
                  Zee<span className="text-[#16a34a]">Pay</span>
                </Link>
              </div>
              <div className="hidden lg:block" />
              <div className="min-w-0">
                <p className="text-[#89958e] text-[10px] uppercase tracking-[.18em] font-bold">{eyebrow}</p>
                <h1 className="font-bold text-[20px] sm:text-[22px] mt-1 text-[#10251a] truncate">{title}</h1>
                {description && <p className="text-[#68766e] text-[12px] sm:text-[13px] mt-1 truncate">{description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {actions}
              <button aria-label="Notifications" className="hidden sm:flex h-9 w-9 rounded-xl border border-[#e5ebe7] bg-white text-[#526158] items-center justify-center transition hover:border-[#b9d8c4] hover:text-[#15803d] hover:-translate-y-0.5 active:scale-95"><AlajoIcon name="notifications" size={17}/></button>
              <div className="h-9 w-9 rounded-full bg-[#e8f6ed] text-[#126b39] border border-[#cce7d5] flex items-center justify-center text-[12px] font-bold">{userName.charAt(0).toUpperCase()}</div>
            </div>
          </div>
        </header>
        <section className="px-4 py-6 sm:px-7 sm:py-7 lg:px-8">
          <div className="w-full max-w-[1180px] mx-auto">{children}</div>
        </section>
      </main>
    </div>
  )
}
