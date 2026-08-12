'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const OTP_LENGTH = 8;

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('alajo_signup_email');
    if (stored) setEmail(stored);
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function setDigits(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    digits.split('').forEach((digit, index) => { next[index] = digit; });
    setCode(next);
    setError('');
    if (digits.length === OTP_LENGTH) void verify(digits);
    else inputs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  }

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (next.every(Boolean)) void verify(next.join(''));
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !code[index] && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    setDigits(event.clipboardData.getData('text'));
  }

  async function verify(token: string) {
    if (!email || token.length !== OTP_LENGTH || loading || verified) return;
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

    setLoading(false);
    if (verifyError) {
      setError('That code is incorrect or has expired. Please check your email and try again.');
      setCode(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      return;
    }

    setVerified(true);
    setMessage('Your email has been verified successfully.');
    window.sessionStorage.removeItem('alajo_signup_email');
  }

  async function resend() {
    if (!email || resendSeconds > 0 || loading || verified) return;
    setLoading(true);
    setMessage('');
    setError('');

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);

    if (resendError) {
      setError('We could not send a new code. Please wait a moment and try again.');
      return;
    }

    setCode(Array(OTP_LENGTH).fill(''));
    setResendSeconds(30);
    setMessage('A new verification code has been sent.');
    inputs.current[0]?.focus();
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-lg">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-[#15221b]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#16a34a] text-white">A</span>
            Alajo
          </Link>
        </div>

        <div className="rounded-3xl bg-white border border-[#e5ebe7] shadow-[0_20px_60px_rgba(15,35,25,0.08)] px-5 py-8 sm:px-10 sm:py-10 text-center">
          {!verified ? (
            <>
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[#ecfdf3] text-[#16a34a] text-2xl" aria-hidden="true">✉</div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#15221b]">Verify your email</h1>
              <p className="mt-3 text-[#65726b]">We sent a verification code to</p>
              <p className="mt-1 font-semibold text-[#15221b] break-all">{email || 'your email address'}</p>
              <p className="mt-2 text-sm text-[#65726b]">Enter the 8-digit code below to continue.</p>

              <div className="mt-7 flex flex-wrap justify-center gap-2 sm:gap-3" aria-label="Email verification code">
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
                    className={`h-14 w-10 sm:h-16 sm:w-11 rounded-xl border text-center text-xl font-bold text-[#15221b] outline-none transition-all ${digit ? 'border-[#16a34a] bg-[#f0fdf4] ring-2 ring-[#dcfce7]' : 'border-[#d9e2dc] bg-white'} focus:border-[#16a34a] focus:ring-2 focus:ring-[#dcfce7]`}
                  />
                ))}
              </div>

              {loading && <p className="mt-5 text-sm text-[#65726b]">Verifying your code…</p>}
              {message && <div className="mt-5 rounded-xl bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#15803d]">{message}</div>}
              {error && <div role="alert" className="mt-5 rounded-xl bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">{error}</div>}

              <button type="button" onClick={resend} disabled={loading || resendSeconds > 0} className="mt-6 w-full rounded-xl bg-[#16a34a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50">
                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
              </button>
              <Link href="/signup" className="mt-5 inline-block text-sm font-medium text-[#16a34a] hover:underline">← Back to sign up</Link>
            </>
          ) : (
            <div className="py-3">
              <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#15221b]">Verified successfully</h1>
              <p className="mt-3 text-[#65726b]">Your email has been verified. Your Alajo account is ready.</p>
              <button type="button" onClick={() => { window.location.href = '/dashboard'; }} className="mt-8 w-full rounded-xl bg-[#16a34a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#15803d]">
                Continue to Alajo
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
