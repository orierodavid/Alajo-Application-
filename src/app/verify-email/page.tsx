'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('your email address');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('alajo_signup_email');
    if (stored) setEmail(stored);
  }, []);

  async function resend() {
    if (!email || email === 'your email address') return;
    setLoading(true); setMessage(''); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (error) setError(error.message); else setMessage('A new verification email has been sent.');
  }

  return <main className="auth-shell"><section className="brand-panel"><div className="logo">Alajo<span>◌</span></div><h1>Smart Rotational Savings for <em>Everyone</em></h1><p>Secure your account before you begin saving with Alajo.</p><div className="features"><div>✅ <b>Secure & Verified</b><small>Verify your email before continuing.</small></div><div>👥 <b>Trusted Savings</b><small>Manage your savings groups in one place.</small></div><div>🔒 <b>Protected Account</b><small>Your account stays under your control.</small></div></div></section><section className="auth-card"><div className="form-wrap verify-wrap"><div className="auth-icon">✉️</div><h2>Verify Your Email</h2><p>We've sent a verification link to</p><strong>{email}</strong><p>Please check your inbox and click the link to verify your account.</p><button onClick={() => { window.location.href = `mailto:${email}`; }} disabled={loading}>Open Email App</button>{message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}<button className="secondary-button" onClick={resend} disabled={loading}>{loading ? 'Sending…' : 'Resend Verification Email'}</button><Link className="back-link" href="/login">← Back to Login</Link></div></section></main>;
}
