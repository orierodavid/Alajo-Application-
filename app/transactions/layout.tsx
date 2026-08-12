import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'

export default function TransactionsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="alajo-benchmark-page min-h-screen bg-[#f7f9f7] text-[#18352a]">
      <AppSidebar />
      <main className="lg:ml-[250px] min-h-screen pt-16 lg:pt-0">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 sm:py-7">
          {children}
        </div>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `
        .alajo-benchmark-page { --alajo-green:#167a4a; --alajo-green-2:#22a866; --alajo-ink:#18352a; --alajo-muted:#708178; }
        .alajo-benchmark-page h1,.alajo-benchmark-page h2,.alajo-benchmark-page h3 { color:var(--alajo-ink)!important; letter-spacing:-.025em; }
        .alajo-benchmark-page p,.alajo-benchmark-page span,.alajo-benchmark-page label { color:var(--alajo-muted); }
        .alajo-benchmark-page button,.alajo-benchmark-page a { transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s ease,background-color .18s ease,border-color .18s ease; }
        .alajo-benchmark-page button:hover,.alajo-benchmark-page a:hover { transform:translateY(-1px); }
        .alajo-benchmark-page button:active,.alajo-benchmark-page a:active { transform:translateY(0) scale(.985); }
        .alajo-benchmark-page input,.alajo-benchmark-page select { color:var(--alajo-ink)!important; background:#fff!important; border-color:#dce6df!important; }
        .alajo-benchmark-page table { width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; background:#fff; border:1px solid #e1e9e4; border-radius:16px; }
        .alajo-benchmark-page th { color:#5c6e64!important; background:#f7faf8!important; font-size:11px; text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
        .alajo-benchmark-page td { color:var(--alajo-ink)!important; border-top:1px solid #edf2ee; }
        .alajo-benchmark-page tr:hover td { background:#f8fbf9; }
        .alajo-benchmark-page [class*="bg-white"],.alajo-benchmark-page [class*="bg-gray"],.alajo-benchmark-page [class*="bg-slate"] { box-shadow:0 8px 24px rgba(24,53,42,.055); border-color:#e1e9e4!important; }
      ` }} />
    </div>
  )
}
