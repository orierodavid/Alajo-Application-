'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const OTP_LENGTH = 8;
const ROLL_MS = 1100;
const SUCCESS_DISPLAY_MS = 4200;

type SuccessPhase = 'otp' | 'rolling' | 'success';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [successPhase, setSuccessPhase] = useState<SuccessPhase>('otp');
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('alajo_signup_email');
    if (stored) setEmail(stored);
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0 || successPhase !== 'otp') return;
    const timer = window.setInterval(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds, successPhase]);

  useEffect(() => {
    if (successPhase !== 'rolling') return;
    const timer = window.setTimeout(() => setSuccessPhase('success'), ROLL_MS);
    return () => window.clearTimeout(timer);
  }, [successPhase]);

  useEffect(() => {
    if (successPhase !== 'success') return;
    const timer = window.setTimeout(() => { window.location.href = '/dashboard'; }, SUCCESS_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [successPhase]);

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
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      setDigits(digits);
      return;
    }
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
    if (!email || token.length !== OTP_LENGTH || loading || successPhase !== 'otp') return;
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
    setSuccessPhase('rolling');
  }

  async function resend() {
    if (!email || resendSeconds > 0 || loading || successPhase !== 'otp') return;
    setLoading(true);
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
    inputs.current[0]?.focus();
  }

  const positions = [
    { x: '50%', y: '5%' }, { x: '86%', y: '20%' }, { x: '86%', y: '61%' }, { x: '50%', y: '79%' },
    { x: '14%', y: '61%' }, { x: '14%', y: '20%' }, { x: '50%', y: '50%' }, { x: '50%', y: '95%' },
  ];

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#13251b] flex items-center justify-center px-4 py-8">
      <style jsx>{`
        @keyframes nodeAppear { from { opacity: 0; transform: translate(-50%, -50%) scale(.45); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes nodeGlow { 0%,100% { box-shadow: 0 0 0 rgba(22,163,74,0); } 50% { box-shadow: 0 0 20px rgba(22,163,74,.28); } }
        @keyframes pathDraw { from { stroke-dashoffset: 500; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes octagonRoll { 0% { opacity: 0; transform: rotate(-180deg) scale(.55); } 65% { opacity: 1; transform: rotate(365deg) scale(1.06); } 100% { opacity: 1; transform: rotate(360deg) scale(1); } }
        @keyframes octagonPulse { 0%,100% { box-shadow: 0 0 0 rgba(22,163,74,0), 0 0 0 rgba(22,163,74,0); } 50% { box-shadow: 0 0 28px rgba(22,163,74,.25), 0 0 70px rgba(22,163,74,.10); } }
        @keyframes checkDraw { from { stroke-dashoffset: 34; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .node { animation: nodeAppear .35s ease-out both, nodeGlow 1.7s ease-in-out infinite .5s; }
        .node-path { stroke-dasharray: 500; stroke-dashoffset: 500; animation: pathDraw 1.2s ease-out .2s forwards; }
        .octagon-roll { animation: octagonRoll ${ROLL_MS}ms cubic-bezier(.18,.8,.2,1) both, octagonPulse 1.5s ease-in-out ${ROLL_MS}ms infinite; }
        .success-check { stroke-dasharray: 34; stroke-dashoffset: 34; animation: checkDraw .55s ease-out .25s forwards; }
        .success-copy { animation: fadeUp .45s ease-out .45s both; }
        .success-continue { animation: fadeUp .45s ease-out .65s both; }
        @media (prefers-reduced-motion: reduce) {
          .node,.node-path,.octagon-roll,.success-check,.success-copy,.success-continue { animation: none; opacity: 1; transform: translate(-50%, -50%) scale(1); stroke-dashoffset: 0; }
        }
      `}</style>

      <section className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#13251b]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#16a34a] text-white">A</span>
            Alajo
          </Link>
        </div>

        <div className="rounded-[28px] border border-[#dfe9e2] bg-white px-5 py-8 sm:px-9 sm:py-10 text-center shadow-[0_24px_70px_rgba(19,37,27,.10)]">
          {successPhase === 'otp' ? (
            <>
              <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-[#b9e5c7] bg-[#effaf2] text-[#16a34a]">✉</div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Verify your email</h1>
              <p className="mt-3 text-sm text-[#68776e]">Enter the 8-digit code sent to</p>
              <p className="mt-1 font-medium break-all text-[#13251b]">{email || 'your email address'}</p>

              <div className="relative mx-auto mt-8 h-[220px] w-[250px]" aria-label="8-digit verification code">
                <svg viewBox="0 0 250 220" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                  <path d="M125 30 L210 72 L210 148 L125 190 L40 148 L40 72 Z M40 72 L125 110 L210 72 M40 148 L125 110 L210 148" fill="none" stroke="#d7eadc" strokeWidth="1.5" />
                  <path className="node-path" d="M125 30 L210 72 L210 148 L125 190 L40 148 L40 72 Z M40 72 L125 110 L210 72 M40 148 L125 110 L210 148" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {code.map((digit, index) => {
                  const position = positions[index];
                  return (
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
                      style={{ left: position.x, top: position.y, animationDelay: `${index * 70}ms` }}
                      className={`node absolute h-12 w-12 rounded-xl border text-center text-lg font-bold outline-none ${digit ? 'border-[#16a34a] bg-[#effaf2] text-[#13251b] ring-2 ring-[#dcf4e2]' : 'border-[#cfe1d4] bg-white text-[#13251b]'} focus:border-[#16a34a] focus:ring-2 focus:ring-[#dcf4e2]`}
                    />
                  );
                })}
              </div>

              {loading && <p className="mt-2 text-sm text-[#16a34a]">Verifying…</p>}
              {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <button type="button" onClick={resend} disabled={loading || resendSeconds > 0} className="mt-5 text-sm font-medium text-[#16a34a] hover:underline disabled:text-[#9aa79f] disabled:no-underline disabled:cursor-not-allowed">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}</button>
              <div><Link href="/signup" className="mt-4 inline-block text-xs text-[#68776e] hover:text-[#13251b]">← Back to sign up</Link></div>
            </>
          ) : successPhase === 'rolling' ? (
            <div className="min-h-[410px] flex flex-col items-center justify-center">
              <div className="relative h-32 w-32">
                <div className="octagon-roll absolute inset-0 bg-[#16a34a]" style={{ clipPath: 'polygon(30% 3%, 70% 3%, 97% 30%, 97% 70%, 70% 97%, 30% 97%, 3% 70%, 3% 30%)' }} aria-label="Verification successful" />
                <div className="absolute inset-[7px] bg-white" style={{ clipPath: 'polygon(30% 3%, 70% 3%, 97% 30%, 97% 70%, 70% 97%, 30% 97%, 3% 70%, 3% 30%)' }} />
              </div>
              <p className="mt-7 text-sm font-semibold text-[#16a34a]">Verification complete</p>
            </div>
          ) : (
            <div className="min-h-[410px] flex flex-col items-center justify-center py-5">
              <div className="relative h-32 w-32" aria-hidden="true">
                <div className="absolute inset-0 bg-[#16a34a] shadow-[0_0_34px_rgba(22,163,74,.25)]" style={{ clipPath: 'polygon(30% 3%, 70% 3%, 97% 30%, 97% 70%, 70% 97%, 30% 97%, 3% 70%, 3% 30%)' }} />
                <div className="absolute inset-[7px] grid place-items-center bg-white" style={{ clipPath: 'polygon(30% 3%, 70% 3%, 97% 30%, 97% 70%, 70% 97%, 30% 97%, 3% 70%, 3% 30%)' }}>
                  <svg viewBox="0 0 24 24" className="h-14 w-14 text-[#16a34a]" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path className="success-check" d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="success-copy">
                <p className="mt-7 text-xs uppercase tracking-[.24em] font-bold text-[#16a34a]">Verified successfully</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#13251b]">Your email has been verified.</h1>
                <p className="mt-3 text-sm text-[#68776e]">Welcome to Alajo.</p>
              </div>
              <div className="success-continue w-full">
                <button type="button" onClick={() => { window.location.href = '/dashboard'; }} className="mt-8 w-full rounded-xl bg-[#16a34a] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803d] hover:-translate-y-0.5 hover:shadow-lg">Continue to Alajo</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
