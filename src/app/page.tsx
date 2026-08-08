import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 48 }}>
      <section style={{ background: '#fff', borderRadius: 20, padding: 40, border: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 12 }}>Alajo</p>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: '12px 0' }}>Structured savings, built around clear rules.</h1>
        <p style={{ maxWidth: 650, color: '#4b5563', fontSize: 17, lineHeight: 1.6 }}>
          The Alajo application foundation is connected to Supabase. Authentication, groups, contributions, payouts, waiting lists and financial records are being built as server-controlled workflows.
        </p>
        <div style={{ marginTop: 28, padding: 18, borderRadius: 14, background: '#f3f4f6' }}>
          <strong>{user ? 'Authenticated session detected.' : 'No authenticated session yet.'}</strong>
          <div style={{ marginTop: 6, color: '#6b7280' }}>
            {user ? `Signed in as ${user.email ?? 'Alajo user'}.` : 'The next UI step is the authentication flow.'}
          </div>
        </div>
      </section>
    </main>
  );
}
