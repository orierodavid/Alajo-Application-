import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function BrowseGroupsPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase.from('groups').select('id,name,description,cycle,contribution_amount,slot_count,status').in('status', ['open','full']).order('created_at', { ascending: false });

  return (
    <main className="app-shell"><aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark small">A</span><strong>Alajo</strong></div><nav><Link href="/dashboard">Overview</Link><Link href="/groups">My groups</Link><Link className="nav-active" href="/groups/browse">Browse groups</Link><Link href="/contributions">Contributions</Link><Link href="/payouts">Payouts</Link><Link href="/notifications">Notifications</Link><Link href="/settings">Settings</Link></nav></aside><section className="dashboard-content"><header className="page-header"><div><p className="eyebrow">SAVINGS GROUPS</p><h1>Find a group</h1><p className="muted">Choose a contribution plan and payout cycle that works for you.</p></div></header><div className="group-grid">{groups?.length ? groups.map((group) => <article className="group-card" key={group.id}><div className="group-card-top"><span className="status-pill">{group.status}</span><span>{group.cycle === 'six_month' ? '6 months' : '10 months'}</span></div><h2>{group.name}</h2><p className="muted">{group.description || 'Structured rotational savings group.'}</p><div className="group-meta"><div><small>Contribution</small><strong>₦{Number(group.contribution_amount).toLocaleString()}</strong></div><div><small>Positions</small><strong>{group.slot_count}</strong></div></div><Link className="primary-link full" href={`/groups/${group.id}`}>View group</Link></article>) : <section className="empty-panel"><div className="empty-icon">○</div><h2>No groups available yet</h2><p className="muted">New groups will appear here when they are opened by Alajo.</p></section>}</div></section></main>
  );
}
