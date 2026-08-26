'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to log in.');
      window.location.replace(result.redirectTo || '/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-shell"><section className="brand-panel"><div className="logo">Alajo<span>◌</span></div><h1>Smart Rotational Savings for <em>Everyone</em></h1><p>Join savings groups, contribute monthly and receive your payout based on your position.</p><div className="features"><div>👥 <b>Join Savings Groups</b><small>Find a group that fits your goals.</small></div><div>💳 <b>Make Contributions</b><small>Track every contribution and payment.</small></div><div>💰 <b>Receive Payouts</b><small>Know exactly when your payout is due.</small></div></div></section><section className="auth-card"><div className="form-wrap"><h2>Welcome Back 👋</h2><p>Login to your account</p><form onSubmit={submit}><label>Email Address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label><div className="row"><label className="check"><input type="checkbox" defaultChecked /> Remember me</label><a href="/forgot-password">Forgot Password?</a></div>{error && <div className="error">{error}</div>}<button disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button></form><p className="bottom">Don't have an account? <a href="/signup">Sign up</a></p></div></section></main>;
}
