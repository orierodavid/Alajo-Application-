import Link from 'next/link'
import { AlajoIcon } from '@/components/ui/alajo-icon'

export default function JoinGroupSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#0b2313] text-white p-5 flex-col min-h-screen sticky top-0">
        <Link href="/dashboard" className="text-2xl font-extrabold tracking-tight">Alajo</Link>
        <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">
          {[
            ['dashboard','/dashboard','Dashboard'], ['groups','/groups','Groups'], ['contributions','/contributions','Contributions'], ['payouts','/payouts','Payouts'],
            ['wallet','/wallet','Wallet'], ['transactions','/transactions','Transactions'], ['invite','/invite-earn','Invite & Earn'], ['notifications','/notifications','Notifications'],
            ['settings','/settings','Settings'], ['help','/help-center','Help Center'], ['logout','/login','Logout'],
          ].map(([icon, href, label]) => (
            <Link key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label === 'Groups' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}>
              <AlajoIcon name={icon as any} size={17} />{label}
              {label === 'Notifications' && <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] ml-auto" />}
            </Link>
          ))}
        </nav>
        <div className="bg-[#123524] rounded-xl p-4 text-white relative overflow-hidden">
          <p className="font-semibold text-[14px]">Grow your savings with Alajo</p>
          <p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p>
          <Link href="/invite-earn" className="mt-3 inline-flex items-center gap-1.5 bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends <AlajoIcon name="arrow-up" size={14} /></Link>
          <div className="absolute -bottom-1 -right-1 opacity-80 text-amber-300"><AlajoIcon name="coin" size={34} /></div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center">
            <AlajoIcon name="check" size={32} />
          </div>
          <p className="mt-6 text-sm font-semibold text-[#16a34a]">Group joined successfully</p>
          <h1 className="mt-2 text-2xl font-extrabold">You’re now part of the group</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">Your membership has been recorded and your assigned savings position is reserved. Your contribution schedule will appear in Contributions.</p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <Link href="/groups" className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Back to Groups</Link>
            <Link href="/contributions" className="rounded-lg bg-[#14532d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#123f24]">View Contributions</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
