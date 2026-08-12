'use client'

import { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'

export function UserPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#10251a]">
      <AppSidebar />
      <main className="lg:ml-[228px] min-h-screen min-w-0">
        <header className="h-[76px] bg-white border-b border-[#e6ebe8] px-5 sm:px-8 flex items-center">
          <div className="w-full max-w-[1180px] mx-auto flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[#89958e] text-[10px] uppercase tracking-[.18em] font-bold">{eyebrow}</p>
              <h1 className="font-bold text-[20px] sm:text-[22px] mt-1 text-[#10251a]">{title}</h1>
              {description && <p className="text-[#68766e] text-[12px] sm:text-[13px] mt-1">{description}</p>}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        </header>
        <section className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="w-full max-w-[1180px] mx-auto">{children}</div>
        </section>
      </main>
    </div>
  )
}
