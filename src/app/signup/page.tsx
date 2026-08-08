'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: { data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) window.location.href = '/dashboard';
    else { setMessage('Account created. Check your email and click the verification link before logging in.'); }
  }

  return <main className="auth-shell"><section className="brand-panel"><div className="logo">Alajo<span>◌</span></div><h1>Smart Rotational Savings for <em>Everyone</em></h1><p>Join a savings group, contribute consistently and receive your payout according to your position.</p><div className="features"><div>👥 <b>Join Savings Groups</b><small>Choose a group that fits your goals.</small></div><div>💳 <b>Make Contributions</b><small>Track every contribution securely.</small></div><div>💰 <b>Receive Payouts</b><small>Know when your payout is due.</small></div></div></section><section className="auth-card"><div className="form-wrap"><h2>Create Your Account</h2><p>Start your Alajo savings journey</p><form onSubmit={submit}><label>Full Name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" /></label><label>Email Address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label><label>Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></label><label>Confirm Password<input type="password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" /></label>{error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}<button disabled={loading}>{loading ? 'Creating account…' : 'Create Account'}</button></form><p className="bottom">Already have an account? <Link href="/login">Login</Link></p></div></section></main>;
}
