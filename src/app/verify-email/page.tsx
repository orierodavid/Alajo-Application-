'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const OTP_LENGTH = 6;

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('alajo_signup_email');
    if (stored) setEmail(stored);
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds(value => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every(Boolean)) void verify(next.join(''));
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((digit, index) => {
      next[index] = digit;
    });
    setCode(next);
    inputs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
    if (pasted.length === OTP_LENGTH) void verify(pasted);
  }

  async function verify(token: string) {
    if (!email || token.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    setLoading(false);
    if (verifyError) {
      setError('That verification code is invalid or has expired. Please try again.');
      return;
    }

    setMessage('Email verified successfully.');
    window.sessionStorage.removeItem('alajo_signup_email');
    window.setTimeout(() => {
      window.location.href = '/dashboard';
    }, 700);
  }

  async function resend() {
    if (!email || resendSeconds > 0 || loading) return;
    setLoading(true);
    setMessage('');
    setError('');

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    setLoading(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }

    setCode(Array(OTP_LENGTH).fill(''));
    setResendSeconds(30);
    setMessage('A new verification code has been sent.');
    inputs.current[0]?.focus();
  }

  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <div className="logo">Alajo<span>◌</span></div>
        <h1>Smart Rotational Savings for <em>Everyone</em></h1>
        <p>Secure your account before you begin saving with Alajo.</p>
        <div className="features">
          <div><b>Secure &amp; Verified</b><small>Verify your email before continuing.</small></div>
          <div><b>Trusted Savings</b><small>Manage your savings groups in one place.</small></div>
          <div><b>Protected Account</b><small>Your account stays under your control.</small></div>
        </div>
      </section>

      <section className="auth-card">
        <div className="form-wrap verify-wrap">
          <div className="auth-icon" aria-hidden="true">✉️</div>
          <h2>Verify Your Email</h2>
          <p>Enter the 6-digit code we sent to</p>
          <strong>{email || 'your email address'}</strong>
          <p>Check your inbox and enter the code below.</p>

          <div className="flex justify-center gap-2.5 mt-7" aria-label="Email verification code">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={element => { inputs.current[index] = element; }}
                value={digit}
                onChange={event => updateDigit(index, event.target.value)}
                onKeyDown={event => handleKeyDown(index, event)}
                onPaste={handlePaste}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`Verification digit ${index + 1}`}
                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border border-gray-200 rounded-lg outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-green-100"
              />
            ))}
          </div>

          {loading && <p className="mt-5 text-sm text-gray-500">Verifying…</p>}
          {message && <div className="mt-5 text-sm text-green-700 bg-green-50 p-3 rounded-md">{message}</div>}
          {error && <div className="mt-5 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <button className="secondary-button" onClick={resend} disabled={loading || resendSeconds > 0}>
            {resendSeconds > 0 ? `Resend Code (${resendSeconds}s)` : 'Resend Code'}
          </button>
          <Link className="back-link" href="/signup">← Back to Sign Up</Link>
        </div>
      </section>
    </main>
  );
}
