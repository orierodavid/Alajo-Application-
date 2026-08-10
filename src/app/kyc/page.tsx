'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TEST_VALUES = { bvn: '0000000000', nin: '1111111111' } as const;
const KYC_DIGITS = 10;

export default function KycPage() {
  const router = useRouter();
  const [type, setType] = useState<'bvn' | 'nin'>('bvn');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!/^\d{10}$/.test(value)) {
      setError(`Enter a valid ${KYC_DIGITS}-digit ${type.toUpperCase()} for development testing.`);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Verification could not be completed.');
      if (result.status !== 'approved') throw new Error(result.message || 'Identity verification was not approved.');

      router.push('/bank-details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <div className="logo">Alajo<span>◌</span></div>
        <h1>Smart Rotational Savings for <em>Everyone</em></h1>
        <p>We verify your identity to keep your account secure and meet applicable requirements.</p>
        <div className="features">
          <div>🛡️ <b>Secure Verification</b><small>Your identity is handled securely.</small></div>
          <div>🔒 <b>Protected Data</b><small>Verification secrets never belong in the browser.</small></div>
          <div>💰 <b>Ready for Payouts</b><small>Verified members can add payout details.</small></div>
        </div>
      </section>

      <section className="auth-card">
        <div className="form-wrap">
          <div className="stepper"><span className="active">✓</span><span>Personal Info</span><i></i><span className="active">2</span><b>Verification</b><i></i><span>3</span><span>Bank Details</span></div>
          <div className="auth-icon">🛡️</div>
          <h2>Verify Your Identity</h2>
          <p>Select <strong>either BVN or NIN</strong>. You only need to complete one identity verification.</p>

          <div className="tabs">
            <button type="button" className={type === 'bvn' ? 'selected' : ''} onClick={() => { setType('bvn'); setValue(''); setError(''); }}>BVN</button>
            <button type="button" className={type === 'nin' ? 'selected' : ''} onClick={() => { setType('nin'); setValue(''); setError(''); }}>NIN</button>
          </div>

          <form onSubmit={submit}>
            <label>{type.toUpperCase()}
              <input
                required
                inputMode="numeric"
                maxLength={KYC_DIGITS}
                value={value}
                onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, KYC_DIGITS))}
                placeholder={`Enter your ${KYC_DIGITS}-digit ${type.toUpperCase()}`}
              />
            </label>

            <div className="notice">
              🔒 <strong>Development testing:</strong> use <code>{TEST_VALUES[type]}</code>. This is a synthetic test identity and must not be treated as real BVN/NIN verification.
            </div>

            {error && <div className="error" role="alert">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Verifying…' : `Verify ${type.toUpperCase()}`}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
