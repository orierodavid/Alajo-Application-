'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const OTP_LENGTH = 8;
const ROLL_MS = 1300;
const SUCCESS_DISPLAY_MS = 4200;

type Phase = 'otp' | 'rolling' | 'success';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [phase, setPhase] = useState<Phase>('otp');
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('alajo_signup_email');
    if (stored) setEmail(stored);
  }, []);

  useEffect(() => {
    if (phase !== 'otp' || resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase, resendSeconds]);

  useEffect(() => {
    if (phase !== 'rolling') return;
    const timer = window.setTimeout(() => setPhase('success'), ROLL_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'success') return;
    const timer = window.setTimeout(() => { window.location.href = '/dashboard'; }, SUCCESS_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function setDigits(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    digits.split('').forEach((digit, i) => { next[i] = digit; });
    setCode(next);
    setError('');
    if (digits.length === OTP_LENGTH) void verify(digits);
    else inputs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  }

  function updateDigit(index: number, value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) return setDigits(digits);
    const next = [...code];
    next[index] = digits.slice(-1);
    setCode(next);
    setError('');
    if (digits && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
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
    if (!email || token.length !== OTP_LENGTH || loading || phase !== 'otp') return;
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setLoading(false);
    if (verifyError) {
      setError('That code is incorrect or has expired. Please check your email and try again.');
      setCode(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      return;
    }
    window.sessionStorage.removeItem('alajo_signup_email');
    setPhase('rolling');
  }

  async function resend() {
    if (!email || resendSeconds > 0 || loading || phase !== 'otp') return;
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (resendError) return setError('We could not send a new code. Please wait a moment and try again.');
    setCode(Array(OTP_LENGTH).fill(''));
    setResendSeconds(30);
    inputs.current[0]?.focus();
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#13251b] flex items-center justify-center px-4 py-8">
      <style jsx>{`
        @keyframes octagonMorph { 0% { opacity: 0; transform: scaleX(1) scaleY(.9); border-radius: 14px; } 35% { opacity: 1; transform: scaleX(1.03) scaleY(1); border-radius: 12px; } 100% { opacity: 1; transform: scale(1); border-radius: 0; } }
        @keyframes octagonRoll { 0% { transform: perspective(700px) rotateX(0deg) rotateZ(0deg) scale(.78); } 45% { transform: perspective(700px) rotateX(540deg) rotateZ(16deg) scale(1.05); } 100% { transform: perspective(700px) rotateX(720deg) rotateZ(0deg) scale(1); } }
        @keyframes checkDraw { from { stroke-dashoffset: 34; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes successFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .morph { animation: octagonMorph .38s ease-out both, octagonRoll ${ROLL_MS}ms cubic-bezier(.18,.8,.2,1) .28s both; }
        .check { stroke-dasharray: 34; stroke-dashoffset: 34; animation: checkDraw .55s ease-out .15s forwards; }
        .success-copy { animation: successFade .45s ease-out .35s both; }
        .success-button { animation: successFade .45s ease-out .55s both; }
        @media (prefers-reduced-motion: reduce) { .morph,.check,.success-copy,.success-button { animation: none; opacity: 1; transform: none; stroke-dashoffset: 0; } }
      `}</style>

      <section className="w-full max-w-md">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#13251b]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#16a34a] text-white">A</span>Alajo
          </Link>
        </div>

        <div className="rounded-[28px] border border-[#dfe9e2] bg-white px-5 py-9 sm:px-9 sm:py-10 text-center shadow-[0_24px_70px_rgba(19,37,27,.10)]">
          {phase === 'otp' && (
            <>
              <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-[#b9e5c7] bg-[#effaf2] text-[#16a34a]">✉</div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Verify your email</h1>
              <p className="mt-3 text-sm text-[#68776e]">Enter the 8-digit code sent to</p>
              <p className="mt-1 font-medium break-all text-[#13251b]">{email || 'your email address'}</p>

              <div className="mt-8 flex justify-center gap-1.5 sm:gap-2" aria-label="8-digit verification code">
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
                    className={`h-14 w-10 sm:h-15 sm:w-11 rounded-xl border text-center text-xl font-bold outline-none transition-all ${digit ? 'border-[#16a34a] bg-[#effaf2] text-[#13251b] ring-2 ring-[#dcf4e2]' : 'border-[#cfe1d4] bg-white text-[#13251b]'} focus:border-[#16a34a] focus:ring-2 focus:ring-[#dcf4e2]`}
                  />
                ))}
              </div>

              {loading && <p className="mt-5 text-sm font-medium text-[#16a34a]">Verifying…</p>}
              {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <button type="button" onClick={resend} disabled={loading || resendSeconds > 0} className="mt-6 text-sm font-medium text-[#16a34a] hover:underline disabled:text-[#9aa79f] disabled:no-underline disabled:cursor-not-allowed">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}</button>
              <div><Link href="/signup" className="mt-4 inline-block text-xs text-[#68776e] hover:text-[#13251b]">← Back to sign up</Link></div>
            </>
          )}

          {phase === 'rolling' && (
            <div className="min-h-[390px] flex flex-col items-center justify-center">
              <div className="relative h-32 w-32" aria-label="Verifying email">
                <div className="morph absolute inset-0 overflow-hidden bg-[#16a34a] shadow-[0_18px_45px_rgba(22,163,74,.24)]" style={{ clipPath: 'polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)' }}>
                  <div className="absolute inset-[6px] bg-white" style={{ clipPath: 'polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)' }} />
                </div>
              </div>
              <p className="mt-8 text-sm font-semibold text-[#16a34a]">Verifying your email…</p>
            </div>
          )}

          {phase === 'success' && (
            <div className="min-h-[390px] flex flex-col items-center justify-center">
              <div className="relative h-32 w-32" aria-hidden="true">
                <div className="absolute inset-0 bg-[#16a34a] shadow-[0_0_38px_rgba(22,163,74,.28)]" style={{ clipPath: 'polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)' }} />
                <div className="absolute inset-[6px] grid place-items-center bg-white" style={{ clipPath: 'polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)' }}>
                  <svg viewBox="0 0 24 24" className="h-14 w-14 text-[#16a34a]" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path className="check" d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="success-copy">
                <p className="mt-7 text-xs uppercase tracking-[.24em] font-bold text-[#16a34a]">Verified successfully</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Your email has been verified.</h1>
                <p className="mt-3 text-sm text-[#68776e]">Welcome to Alajo.</p>
              </div>
              <div className="success-button w-full">
                <button type="button" onClick={() => { window.location.href = '/dashboard'; }} className="mt-8 w-full rounded-xl bg-[#16a34a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#15803d]">Continue to Alajo</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
