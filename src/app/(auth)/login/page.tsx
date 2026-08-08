import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">A</div>
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in to Alajo</h1>
        <p className="muted">Manage your savings groups, contributions and payouts from one secure place.</p>
        <form className="auth-form">
          <label>Email address<input type="email" name="email" placeholder="you@example.com" required /></label>
          <label>Password<input type="password" name="password" placeholder="••••••••" required /></label>
          <button type="submit">Sign in</button>
        </form>
        <p className="switch-copy">New to Alajo? <Link href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
