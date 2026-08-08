'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlajoIcon } from '@/components/ui/alajo-icon'

type Group = { id: string; name: string; description: string | null; cycle: 'six_month' | 'ten_month'; contribution_amount: number; slot_count: number; start_date: string | null; status: string; memberCount: number }
type Membership = { id: string; group_id: string; status: string; joined_at: string; slot_id: string }
const money = (value: number) => `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
const cycleLabel = (cycle: Group['cycle']) => cycle === 'ten_month' ? '10 Months' : '6 Months'
const nav = [
  ['dashboard','/dashboard','Dashboard'], ['groups','/groups','Groups'], ['contributions','/contributions','Contributions'], ['payouts','/payouts','Payouts'],
  ['wallet','/wallet','Wallet'], ['transactions','/transactions','Transactions'], ['invite','/invite-earn','Invite & Earn'], ['notifications','/notifications','Notifications'],
  ['settings','/settings','Settings'], ['help','/help-center','Help Center'], ['logout','/login','Logout'],
] as const

export default function GroupsClient({ groups, memberships, userEmail }: { groups: Group[]; memberships: Membership[]; userEmail: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'my' | 'available' | 'past'>('my')
  const [items, setItems] = useState(groups)
  const [myMemberships, setMyMemberships] = useState(memberships)
  const [joining, setJoining] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const activeMemberships = useMemo(() => myMemberships.filter((m) => m.status === 'active' || m.status === 'pending'), [myMemberships])
  const pastMemberships = useMemo(() => myMemberships.filter((m) => ['completed', 'cancelled', 'replaced'].includes(m.status)), [myMemberships])
  const myGroupIds = new Set(activeMemberships.map((m) => m.group_id))
  const visibleGroups = tab === 'my' ? items.filter((g) => myGroupIds.has(g.id)) : tab === 'past' ? items.filter((g) => pastMemberships.some((m) => m.group_id === g.id)) : items.filter((g) => !myGroupIds.has(g.id))

  async function joinGroup(group: Group) {
    setJoining(group.id); setMessage('')
    try {
      const { data: membership, error } = await supabase.rpc('join_group_auto', { p_group_id: group.id })

      if (error) {
        console.error('Join group RPC error:', error)
        const messages: Record<string, string> = {
          AUTH_REQUIRED: 'Please log in again.',
          GROUP_NOT_FOUND: 'This group could not be found.',
          GROUP_NOT_OPEN: 'This group is no longer accepting members.',
          POSITION_TAKEN: 'That group was just filled. Please choose another group.',
          MAX_ACTIVE_GROUPS: 'You can only be active in 3 groups at a time.',
          ALREADY_A_MEMBER: 'You are already a member of this group.',
        }
        throw new Error(messages[error.message] ?? error.message ?? 'Unable to join this group right now.')
      }

      if (!membership) throw new Error('The group was joined but no membership confirmation was returned. Please refresh your Groups page.')

      setMyMemberships((current) => [...current, membership as Membership])
      setItems((current) => current.map((item) => item.id === group.id ? { ...item, memberCount: item.memberCount + 1 } : item))
      router.push('/join-group-success')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong while joining the group.')
    } finally {
      setJoining(null)
    }
  }

  return <div className="min-h-screen bg-gray-50 text-gray-900 flex">
    <aside className="hidden lg:flex w-64 shrink-0 bg-[#0b2313] text-white p-5 flex-col min-h-screen sticky top-0">
      <Link href="/dashboard" className="text-2xl font-extrabold tracking-tight">Alajo</Link>
      <nav className="mt-8 flex-1 space-y-1 text-[14px] font-medium">
        {nav.map(([icon, href, label]) => <Link key={label} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${label === 'Groups' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}><AlajoIcon name={icon} size={17} />{label}{label === 'Notifications' && <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] ml-auto" />}</Link>)}
      </nav>
      <div className="bg-[#123524] rounded-xl p-4 text-white relative overflow-hidden">
        <p className="font-semibold text-[14px]">Grow your savings with Alajo</p><p className="text-[12px] text-gray-300 mt-1">The more you save, the more you earn.</p>
        <Link href="/invite-earn" className="mt-3 inline-flex items-center gap-1.5 bg-white text-[#0b2313] text-[13px] font-semibold px-3 py-1.5 rounded-md">Invite Friends <AlajoIcon name="arrow-up" size={14} /></Link>
        <div className="absolute -bottom-1 -right-1 opacity-80 text-amber-300"><AlajoIcon name="coin" size={34} /></div>
      </div>
    </aside>
    <main className="flex-1 min-w-0">
      <header className="bg-white border-b border-gray-100 px-5 lg:px-8 py-5 flex items-center justify-between"><div><p className="text-gray-400 text-sm">Groups</p><h1 className="text-2xl font-bold">Savings Groups</h1></div><p className="hidden sm:block text-sm text-gray-400">{userEmail}</p></header>
      <section className="p-5 lg:p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            ['groups','bg-green-50','text-[#16a34a]','My Active Groups',activeMemberships.length,"Groups you're part of"], ['add','bg-purple-50','text-purple-500','Groups Joined',myMemberships.length,'Total groups joined'], ['crown','bg-yellow-50','text-yellow-500','Total Contributions','₦0.00','Across all groups'], ['payouts','bg-orange-50','text-orange-500','Total Payouts','₦0.00','Total received'],
          ].map(([icon,bg,color,title,value,subtitle]) => <div key={String(title)} className="bg-white rounded-xl border border-gray-100 p-5"><div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${color}`}><AlajoIcon name={icon as any} size={18}/></div><p className="mt-3 text-gray-500 text-[13px]">{title}</p><p className="text-[20px] font-bold text-gray-900">{value}</p><p className="text-[12px] text-gray-400 mt-1">{subtitle}</p></div>)}
        </div>
        <div className="mt-6 flex items-center justify-between"><div className="flex items-center gap-6 text-[14px] font-medium overflow-x-auto">{([['my','My Groups'],['available','Available Groups'],['past','Past Groups']] as const).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={tab === key ? 'text-[#16a34a] border-b-2 border-[#16a34a] pb-2 whitespace-nowrap' : 'text-gray-400 pb-2 whitespace-nowrap'}>{label}</button>)}</div></div>
        {message && <div className="mt-5 rounded-lg bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">{message}</div>}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleGroups.map((group) => { const joined = myGroupIds.has(group.id); const payout = Number(group.contribution_amount) * group.slot_count; return <article key={group.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-gray-900 text-[16px]">{group.name}</h4><p className="text-xs text-gray-400 mt-1">{group.description}</p></div><span className={`text-xs px-2 py-1 rounded-full ${group.status === 'full' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'}`}>{group.status === 'full' ? 'Full' : joined ? 'Active' : 'Open'}</span></div><div className="mt-3 space-y-2 text-sm"><p><span className="text-gray-400">Contribution:</span> <b>{money(Number(group.contribution_amount))}</b></p><p><span className="text-gray-400">Cycle:</span> <b>{cycleLabel(group.cycle)}</b></p><p><span className="text-gray-400">Members:</span> <b>{group.memberCount}/{group.slot_count}</b></p><p><span className="text-gray-400">Payout:</span> <b>{money(payout)}</b></p><p><span className="text-gray-400">Status:</span> <b className="text-green-600">{joined ? 'Active' : group.status === 'full' ? 'Full' : 'Available'}</b></p></div>{joined ? <div className="mt-4 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm font-medium flex items-center gap-2"><AlajoIcon name="check" size={16}/>You are a member of this group.</div> : tab === 'available' ? <button disabled={joining === group.id || group.status === 'full'} onClick={() => joinGroup(group)} className="mt-4 w-full bg-[#14532d] hover:bg-[#123f24] disabled:opacity-50 text-white font-semibold rounded-lg py-2.5">{joining === group.id ? 'Joining…' : 'Join Group'}</button> : null}</article> })}
        </div>
        {visibleGroups.length === 0 && <div className="mt-5 bg-white rounded-xl border border-gray-100 p-10 text-center"><p className="font-semibold text-gray-900">{tab === 'my' ? 'You have not joined a group yet.' : tab === 'past' ? 'No past groups yet.' : 'No available groups right now.'}</p><p className="text-sm text-gray-400 mt-1">Available groups will appear here automatically.</p>{tab === 'my' && <button onClick={() => setTab('available')} className="mt-4 text-[#16a34a] font-semibold">Browse Available Groups <AlajoIcon name="arrow-up" size={14} className="inline" /></button>}</div>}
      </section>
    </main>
  </div>
}