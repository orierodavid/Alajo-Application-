import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'

export default function WalletLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#18352a]">
      <AppSidebar />
      <main className="lg:ml-[250px] min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
