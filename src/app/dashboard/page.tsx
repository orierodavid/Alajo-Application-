import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/dashboard');

  // KYC is a server-side onboarding gate. Do not trust the client or a
  // previous redirect: a user who has not been approved must not be able to
  // bypass verification by navigating directly to /dashboard.
  const { data: kyc, error: kycError } = await supabase
    .from('kyc_records')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (kycError || kyc?.status !== 'approved') {
    redirect('/kyc');
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark small">A</span><strong>Alajo</strong></div>
        <nav>
          <Link className="nav-active" href="/dashboard">Overview</Link>
          <Link href="/groups">My groups</Link>
          <Link href="/groups/browse">Browse groups</Link>
          <Link href="/contributions">Contributions</Link>
          <Link href="/payouts">Payouts</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <div className="sidebar-footer"><span className="avatar">{user.email?.slice(0, 1).toUpperCase() ?? 'A'}</span><div><strong>{user.email ?? 'Alajo member'}</strong><small>Member account</small></div></div>
      </aside>
      <section className="dashboard-content">
        <header className="page-header"><div><p className="eyebrow">OVERVIEW</p><h1>Your Alajo dashboard</h1><p className="muted">Track your active groups, contributions and upcoming payouts.</p></div><Link className="primary-link" href="/groups/browse">Browse groups</Link></header>
        <div className="stats-grid">
          <article className="stat-card"><span>Active groups</span><strong>0</strong><small>Maximum 3 active groups</small></article>
          <article className="stat-card"><span>Next contribution</span><strong>—</strong><small>No contribution due yet</small></article>
          <article className="stat-card"><span>Upcoming payout</span><strong>—</strong><small>No payout scheduled</small></article>
        </div>
        <section className="empty-panel"><div className="empty-icon">+</div><h2>Start your first savings group</h2><p className="muted">Browse available groups, review the contribution amount and cycle, then choose an available payout position.</p><Link className="primary-link" href="/groups/browse">Explore available groups</Link></section>
      </section>
    </main>
  );
}
