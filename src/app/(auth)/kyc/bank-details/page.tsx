'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const banks = ['Access Bank','Citibank Nigeria','Ecobank Nigeria','Fidelity Bank','First Bank','First City Monument Bank','Globus Bank','GTBank','Keystone Bank','Moniepoint','Opay','Polaris Bank','Stanbic IBTC','Sterling Bank','UBA','Union Bank','Unity Bank','Wema Bank','Zenith Bank'];

export default function BankDetailsPage() {
  const [bankName, setBankName] = useState('Zenith Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(accountNumber)) return setError('Enter a valid 10-digit account number.');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session has expired. Please sign in again.');
      const { error: saveError } = await supabase.from('profiles').update({ bank_name: bankName, account_number: accountNumber, account_name: accountName || null }).eq('id', user.id);
      if (saveError) throw saveError;
      window.location.href = '/dashboard';
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your bank details.'); } finally { setLoading(false); }
  }

  return <main className="auth-shell"><section className="auth-brand"> <Link href="/" className="brand">Alajo <span className="brand-ring" /></Link><h1>Smart Rotational Savings for <span>Everyone</span></h1><p>Join thousands of people already saving and growing together with Alajo.</p><div className="brand-points"><div>👥 <b>Join Savings Groups</b><small>Become a member of a savings group that fits your goals.</small></div><div>💳 <b>Make Contributions</b><small>Contribute monthly and track your savings progress.</small></div><div>💰 <b>Receive Payouts</b><small>Get your payout based on your selected position in the group.</small></div></div><div className="brand-blob yellow"/><div className="brand-blob green"/></section><section className="auth-form"><div className="auth-card"><div className="stepper"><span>✓</span><b>Personal Info</b><i/><span>✓</span><b>Verification</b><i/><span className="current">3</span><b>Bank Details</b></div><div className="auth-icon">🏦</div><h2>Bank Details</h2><p>Please provide your bank information to receive payouts.</p><form onSubmit={submit}><label>Bank Name<select value={bankName} onChange={e => setBankName(e.target.value)}>{banks.map(bank => <option key={bank}>{bank}</option>)}</select></label><label>Account Number<input inputMode="numeric" maxLength={10} value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g,''))} placeholder="Enter 10-digit account number" /></label><label>Account Name<input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Enter account name" /></label><div className="secure-note"><b>🔒 Your bank details are secure</b><small>We use bank-level encryption to protect your financial information.</small></div>{error && <p className="form-error">{error}</p>}<button disabled={loading}>{loading ? 'Saving…' : 'Continue'}</button></form></div></section></main>;
}
