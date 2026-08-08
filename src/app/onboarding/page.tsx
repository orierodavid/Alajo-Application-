'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) { router.replace('/login'); return; }
      setName(data.user.user_metadata?.full_name ?? '');
      setLoading(false);
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim(), phone: phone.trim() } });
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push('/kyc');
  }

  if (loading) return <main className="auth-shell"><section className="auth-card"><div className="form-wrap"><p>Loading your account…</p></div></section></main>;

  return <main className="auth-shell"><section className="brand-panel"><div className="logo">Alajo<span>◌</span></div><h1>Smart Rotational Savings for <em>Everyone</em></h1><p>Let's complete your account setup before you join a savings group.</p><div className="features"><div>👤 <b>Personal Details</b><small>Keep your account information accurate.</small></div><div>🛡️ <b>Identity Verification</b><small>Verify your identity securely.</small></div><div>🏦 <b>Payout Account</b><small>Add the account that receives your payouts.</small></div></div></section><section className="auth-card"><div className="form-wrap"><div className="stepper"><span className="active">1</span><b>Personal Info</b><i></i><span>2</span><span>Verification</span><i></i><span>3</span><span>Bank Details</span></div><h2>Personal Information</h2><p>Confirm your details to continue.</p><form onSubmit={submit}><label>Full Name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" /></label><label>Phone Number<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" placeholder="08012345678" /></label>{error && <div className="error">{error}</div>}<button disabled={saving}>{saving ? 'Saving…' : 'Continue to Verification'}</button></form></div></section></main>;
}
