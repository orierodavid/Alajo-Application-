'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage(''); setError(''); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMessage('If an account exists for this email, a password reset link has been sent.');
  }

  return <main className="auth-shell"><section className="brand-panel"><div className="logo">Alajo<span>◌</span></div><h1>Smart Rotational Savings for <em>Everyone</em></h1><p>Secure access to your rotational savings account.</p><div className="features"><div>🔒 <b>Secure Account</b><small>Your account is protected.</small></div><div>💳 <b>Track Contributions</b><small>See your savings activity.</small></div><div>💰 <b>Manage Payouts</b><small>Stay on top of your payout.</small></div></div></section><section className="auth-card"><div className="form-wrap"><div className="auth-icon">🔑</div><h2>Forgot Password?</h2><p>Enter your email address and we'll send you a link to reset your password.</p><form onSubmit={submit}><label>Email Address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label>{error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}<button disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</button></form><Link className="back-link" href="/login">← Back to Login</Link></div></section></main>;
}
