'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const OTP_LENGTH = 8;
const SUCCESS_DISPLAY_MS = 4200;

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
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

  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => { window.location.href = '/dashboard'; }, SUCCESS_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [verified]);

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
    window.sessionStorage.removeItem('alajo_signup_email');
  }

  async function resend() {
    if (!email || resendSeconds > 0 || loading || verified) return;
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

  return (
    <main className="min-h-screen bg-[#070b10] text-white flex items-center justify-center px-4 py-8">
      <style jsx>{`
        @keyframes nodeAppear { from { opacity: 0; transform: scale(.35); } to { opacity: 1; transform: scale(1); } }
        @keyframes nodeGlow { 0%,100% { box-shadow: 0 0 8px rgba(34,211,238,.15); } 50% { box-shadow: 0 0 22px rgba(34,211,238,.55); } }
        @keyframes pathDraw { from { stroke-dashoffset: 400; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes pathTravel { from { stroke-dashoffset: 700; } to { stroke-dashoffset: 0; } }
        @keyframes successBox { from { opacity: 0; transform: scale(.65); } 65% { transform: scale(1.07); } to { opacity: 1; transform: scale(1); } }
        @keyframes checkDraw { from { stroke-dashoffset: 36; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .node { animation: nodeAppear .35s ease-out both, nodeGlow 1.7s ease-in-out infinite .4s; }
        .node-path { stroke-dasharray: 400; stroke-dashoffset: 400; animation: pathDraw 1.2s ease-out .25s forwards; }
        .success-box { animation: successBox .65s cubic-bezier(.2,.9,.2,1) both; }
        .success-check { stroke-dasharray: 36; stroke-dashoffset: 36; animation: checkDraw .6s ease-out .4s forwards; }
        .success-copy { animation: fadeUp .45s ease-out .65s both; }
        .success-continue { animation: fadeUp .45s ease-out .9s both; }
        @media (prefers-reduced-motion: reduce) {
          .node,.node-path,.success-box,.success-check,.success-copy,.success-continue { animation: none; opacity: 1; transform: none; stroke-dashoffset: 0; }
        }
      `}</style>

      <section className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight">Alajo</Link>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#0c1219] px-5 py-8 sm:px-9 sm:py-10 text-center shadow-2xl shadow-black/30">
          {!verified ? (
            <>
              <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">✉</div>
              <h1 className="text-2xl sm:text-3xl font-bold">Verify your email</h1>
              <p className="mt-3 text-sm text-white/55">Enter the 8-digit code sent to</p>
              <p className="mt-1 font-medium break-all text-white/85">{email || 'your email address'}</p>

              <div className="relative mx-auto mt-8 h-[220px] w-[250px]" aria-label="8-digit verification code">
                <svg viewBox="0 0 250 220" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                  <path d="M125 30 L210 72 L210 148 L125 190 L40 148 L40 72 Z M40 72 L125 110 L210 72 M40 148 L125 110 L210 148" fill="none" stroke="rgba(34,211,238,.22)" strokeWidth="1.5" />
                  <path className="node-path" d="M125 30 L210 72 L210 148 L125 190 L40 148 L40 72 Z M40 72 L125 110 L210 72 M40 148 L125 110 L210 148" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {code.map((digit, index) => {
                  const positions = [
                    { x: '50%', y: '4%' }, { x: '84%', y: '23%' }, { x: '84%', y: '58%' }, { x: '50%', y: '78%' },
                    { x: '16%', y: '58%' }, { x: '16%', y: '23%' }, { x: '50%', y: '50%' }, { x: '50%', y: '96%' },
                  ];
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
                      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)', animationDelay: `${index * 70}ms` }}
                      className={`node absolute h-12 w-12 rounded-xl border text-center text-lg font-bold outline-none ${digit ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100' : 'border-cyan-400/35 bg-[#101923] text-white'} focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20`}
                    />
                  );
                })}
              </div>

              {loading && <p className="mt-2 text-sm text-cyan-300">Verifying…</p>}
              {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
              <button type="button" onClick={resend} disabled={loading || resendSeconds > 0} className="mt-5 text-sm text-cyan-300 disabled:text-white/30 disabled:cursor-not-allowed">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}</button>
              <div><Link href="/signup" className="mt-4 inline-block text-xs text-white/45 hover:text-white/80">← Back to sign up</Link></div>
            </>
          ) : (
            <div className="py-5">
              <div className="success-box mx-auto grid h-28 w-28 place-items-center rounded-3xl border border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_55px_rgba(34,211,238,.28)]" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-14 w-14 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path className="success-check" d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="success-copy">
                <p className="mt-7 text-xs uppercase tracking-[.25em] text-cyan-300">Verified successfully</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Your email has been verified.</h1>
                <p className="mt-3 text-sm text-white/55">Welcome to Alajo.</p>
              </div>
              <div className="success-continue">
                <button type="button" onClick={() => { window.location.href = '/dashboard'; }} className="mt-8 w-full rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-5 py-3.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20">Continue to Alajo</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
