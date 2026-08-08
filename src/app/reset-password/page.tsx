'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setReady(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMessage('Your password has been reset successfully.');
    setTimeout(() => { window.location.href = '/login'; }, 1200);
  }

  return <main className="auth-shell"><section className="brand-panel"><div className="logo">Alajo<span>◌</span></div><h1>Smart Rotational Savings for <em>Everyone</em></h1><p>Keep your Alajo account secure with a strong password.</p><div className="features"><div>🔒 <b>Secure Access</b><small>Protect your savings account.</small></div><div>👥 <b>Savings Groups</b><small>Manage your active groups.</small></div><div>💰 <b>Protected Payouts</b><small>Keep your financial activity secure.</small></div></div></section><section className="auth-card"><div className="form-wrap"><div className="auth-icon">🔒</div><h2>Reset Your Password</h2><p>Enter your new password below.</p>{!ready ? <div className="error">This reset link is invalid or has expired. Request a new reset link.</div> : <form onSubmit={submit}><label>New Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></label><label>Confirm New Password<input type="password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" /></label>{error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}<button disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</button></form>}<Link className="back-link" href="/login">← Back to Login</Link></div></section></main>;
}
