import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">A</div>
        <p className="eyebrow">GET STARTED</p>
        <h1>Create your Alajo account</h1>
        <p className="muted">Join structured savings groups and keep every contribution and payout in one place.</p>
        <form className="auth-form">
          <label>Full name<input type="text" name="fullName" placeholder="Your full name" required /></label>
          <label>Email address<input type="email" name="email" placeholder="you@example.com" required /></label>
          <label>Password<input type="password" name="password" placeholder="Create a secure password" minLength={8} required /></label>
          <button type="submit">Create account</button>
        </form>
        <p className="switch-copy">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
