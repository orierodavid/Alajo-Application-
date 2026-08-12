'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import SignOutButton from '@/app/dashboard/sign-out-button'

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/25 ${checked ? 'border-[#16a34a] bg-[#16a34a]' : 'border-[#cfd8d2] bg-[#e8eeea]'}`}>
    <span className={`absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
)

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#e5ebe7] bg-white p-5 sm:p-6 shadow-[0_2px_10px_rgba(16,45,28,0.035)] ${className}`}>{children}</section>
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f6ed] text-[#15803d]">{children}</span>
}

export default function SettingsPage() {
  const [name, setName] = useState('User')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [paymentAlerts, setPaymentAlerts] = useState(true)
  const [groupAlerts, setGroupAlerts] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [kyc, setKyc] = useState<{ status: string; verification_level: string | null; submitted_at: string | null; reviewed_at: string | null; rejection_reason: string | null }>({ status: 'not_started', verification_level: null, submitted_at: null, reviewed_at: null, rejection_reason: null })

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(s => { if (s?.name) setName(s.name); if (s?.email) setEmail(s.email) }).catch(() => {})
    fetch('/api/auth/settings-summary', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(s => { if (s?.kyc) setKyc(s.kyc) }).catch(() => {})
    try {
      const raw = localStorage.getItem('alajo-notification-preferences')
      if (raw) { const p = JSON.parse(raw); setEmailAlerts(p.emailAlerts ?? true); setPaymentAlerts(p.paymentAlerts ?? true); setGroupAlerts(p.groupAlerts ?? true); setMarketing(p.marketing ?? false) }
    } catch {}
  }, [])

  function savePreferences() {
    localStorage.setItem('alajo-notification-preferences', JSON.stringify({ emailAlerts, paymentAlerts, groupAlerts, marketing }))
    setMessage('Preferences saved')
    window.setTimeout(() => setMessage(''), 2200)
  }

  async function saveProfile() {
    if (!name.trim() || saving) return
    setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setMessage(data.error || 'Unable to update your profile.'); return }
      setMessage('Profile updated')
    } catch { setMessage('Unable to update your profile.') } finally { setSaving(false) }
  }

  const kycApproved = kyc.status === 'approved'
  const kycPending = kyc.status === 'pending'
  const kycFailed = kyc.status === 'rejected' || kyc.status === 'failed'
  const kycLabel = kycApproved ? 'Verified' : kycPending ? 'Pending' : kycFailed ? 'Failed' : 'Not started'
  const kycTone = kycApproved ? 'bg-[#e9f8ef] text-[#15803d]' : kycPending ? 'bg-[#fff7df] text-[#a16207]' : kycFailed ? 'bg-[#fff0f0] text-[#dc2626]' : 'bg-[#f1f4f2] text-[#64736a]'

  return <div className="min-h-screen bg-[#f8faf9] text-[#17221b]">
    <AppSidebar />
    <main className="lg:ml-[250px] pt-16 lg:pt-0">
      <header className="sticky top-16 lg:top-0 z-20 h-[72px] border-b border-[#e8edea] bg-white px-5 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0"><button className="lg:hidden h-10 w-10 rounded-xl border border-[#e3e9e5] bg-white text-[#294036]">☰</button><div className="hidden sm:flex h-10 w-[330px] items-center gap-2 rounded-xl border border-[#e3e9e5] px-3 text-sm text-[#7a887f]"><span>⌕</span><span>Search anything...</span><kbd className="ml-auto rounded-md border border-[#e3e9e5] px-1.5 py-0.5 text-[10px]">⌘ K</kbd></div></div>
        <div className="flex items-center gap-3"><button aria-label="Notifications" className="relative h-10 w-10 rounded-xl border border-[#e3e9e5] bg-white text-[#526159] transition hover:border-[#b7d9c2] hover:text-[#15803d] active:scale-95">♧<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#16a34a]" /></button><button aria-label="Messages" className="hidden sm:block h-10 w-10 rounded-xl border border-[#e3e9e5] bg-white text-[#526159] transition hover:border-[#b7d9c2] hover:text-[#15803d] active:scale-95">✉</button><div className="flex items-center gap-2 pl-1"><div className="h-9 w-9 rounded-full bg-[#dff2e5] flex items-center justify-center font-bold text-[#12602f]">{name.charAt(0).toUpperCase()}</div><div className="hidden md:block leading-tight"><p className="text-sm font-semibold">{name}</p><p className="text-[11px] text-[#829087]">User</p></div><span className="hidden md:block text-[#7c8a82] text-xs">⌄</span></div></div>
      </header>

      <section className="mx-auto max-w-[1280px] px-4 py-6 sm:px-7 lg:py-8">
        <div className="mb-6"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7b72]">My account</p><h1 className="mt-1 text-[27px] font-bold tracking-[-0.02em]">Settings</h1><p className="mt-1 text-sm text-[#718078]">Manage your account settings and preferences.</p></div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_315px]">
          <div className="space-y-5">
            <Card>
              <div className="flex items-center justify-between gap-4"><div><h2 className="text-[16px] font-bold">Personal Information</h2><p className="mt-1 text-xs text-[#7b8981]">Your basic account information.</p></div><button className="rounded-lg border border-[#e0e7e2] px-3 py-1.5 text-xs font-semibold text-[#405048] transition hover:border-[#b8d9c1] hover:text-[#15803d] active:scale-95">✎ Edit</button></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[11px] font-medium text-[#65736b]">First name</span><input value={name.split(' ')[0] || ''} onChange={e => setName(`${e.target.value} ${name.split(' ').slice(1).join(' ')}`.trim())} className="h-11 w-full rounded-lg border border-[#dfe6e1] bg-white px-3 text-sm text-[#17221b] outline-none transition focus:border-[#65b77b] focus:ring-2 focus:ring-[#16a34a]/10" /></label><label><span className="mb-1.5 block text-[11px] font-medium text-[#65736b]">Last name</span><input value={name.split(' ').slice(1).join(' ')} onChange={e => setName(`${name.split(' ')[0] || ''} ${e.target.value}`.trim())} className="h-11 w-full rounded-lg border border-[#dfe6e1] bg-white px-3 text-sm text-[#17221b] outline-none transition focus:border-[#65b77b] focus:ring-2 focus:ring-[#16a34a]/10" /></label></div>
              <label className="mt-3 block"><span className="mb-1.5 block text-[11px] font-medium text-[#65736b]">Email address</span><input value={email} readOnly className="h-11 w-full rounded-lg border border-[#e5ebe7] bg-[#f7f9f8] px-3 text-sm text-[#64736b]" /></label>
              <div className="mt-4 flex items-center gap-3"><button onClick={saveProfile} disabled={saving} className="rounded-lg bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#126b34] active:scale-[.98] disabled:opacity-60">{saving ? 'Saving…' : '◉ Save changes'}</button>{message && <span className="text-xs font-semibold text-[#15803d]">{message}</span>}</div>
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-[16px] font-bold">Identity Verification</h2><p className="mt-1 text-xs text-[#7b8981]">Your KYC status and verification method.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${kycTone}`}>✓ {kycLabel}</span></div>
              <div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-[#e5ebe7] bg-[#fbfcfb] p-4"><div className="flex items-center gap-2"><RowIcon>⌂</RowIcon><div><p className="text-[10px] text-[#829087]">KYC Method</p><p className="text-sm font-semibold">{kyc.verification_level ? kyc.verification_level : 'Bank Verification'}</p></div></div></div><div className="rounded-xl border border-[#e5ebe7] bg-[#fbfcfb] p-4"><div className="flex items-center gap-2"><RowIcon>▣</RowIcon><div><p className="text-[10px] text-[#829087]">Submitted</p><p className="text-sm font-semibold">{kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString('en-NG',{month:'short',day:'numeric',year:'numeric'}) : 'Not submitted'}</p></div></div></div><div className="rounded-xl border border-[#e5ebe7] bg-[#fbfcfb] p-4"><div className="flex items-center gap-2"><RowIcon>✓</RowIcon><div><p className="text-[10px] text-[#829087]">Status</p><p className="text-sm font-semibold text-[#15803d]">{kycLabel}</p></div></div></div></div>
              {kycFailed && kyc.rejection_reason && <p className="mt-3 rounded-lg bg-[#fff4f4] p-3 text-xs text-[#dc2626]">{kyc.rejection_reason}</p>}
              {!kycApproved && <Link href="/kyc" className="mt-4 inline-flex rounded-lg bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#126b34] active:scale-[.98]">{kycFailed ? 'Retry verification' : 'View KYC details'}</Link>}
            </Card>

            <Card>
              <h2 className="text-[16px] font-bold">Security</h2><p className="mt-1 text-xs text-[#7b8981]">Keep your Alajo account protected.</p>
              <div className="mt-4 grid md:grid-cols-2 md:divide-x md:divide-[#e9eeeb]"><div className="pr-4"><Link href="/forgot-password" className="flex items-center gap-3 border-b border-[#edf1ee] py-3.5 transition hover:bg-[#fbfdfb]"><RowIcon>♙</RowIcon><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Change password</p><p className="text-[10px] text-[#829087]">Set a new password to keep your account secure.</p></div><span className="text-[#7d8a82]">›</span></Link><div className="flex items-center gap-3 py-3.5"><RowIcon>▣</RowIcon><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Active sessions alerts</p><p className="text-[10px] text-[#829087]">Manage your active sessions across devices.</p></div><span className="text-xs text-[#87948d]">›</span></div></div><div className="pl-4"><div className="flex items-center gap-3 border-b border-[#edf1ee] py-3.5"><RowIcon>♙</RowIcon><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Two-factor authentication</p><p className="text-[10px] text-[#829087]">Add an extra layer of security.</p></div><span className="rounded-full bg-[#e9f8ef] px-2 py-1 text-[9px] font-bold text-[#15803d]">Coming soon</span></div><div className="flex items-center gap-3 py-3.5"><RowIcon>▱</RowIcon><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Active sessions</p><p className="text-[10px] text-[#829087]">Manage devices where you're logged in.</p></div><span className="text-[#7d8a82]">›</span></div></div></div>
            </Card>

            <Card>
              <h2 className="text-[16px] font-bold">Notifications</h2><p className="mt-1 text-xs text-[#7b8981]">Choose what Alajo can notify you about.</p>
              <div className="mt-3 grid md:grid-cols-2 md:gap-x-8">{[[emailAlerts,setEmailAlerts,'Email notifications','Important account and activity emails.','✉'],[paymentAlerts,setPaymentAlerts,'Contribution & payment alerts','Get notified about contributions and payments.','♧'],[groupAlerts,setGroupAlerts,'Group & payout alerts','Important changes in your savings groups and payouts.','♧'],[marketing,setMarketing,'Product updates','News and updates about new features.','◇']].map(([checked,setter,label,desc,icon]) => <div className="flex items-center gap-3 border-b border-[#edf1ee] py-3.5" key={label as string}><RowIcon>{icon}</RowIcon><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{label as string}</p><p className="text-[10px] text-[#829087]">{desc as string}</p></div><Toggle checked={checked as boolean} onChange={setter as (v: boolean) => void} label={label as string} /></div>)}</div>
              <button onClick={savePreferences} className="mt-4 rounded-lg border border-[#dce5df] px-4 py-2 text-xs font-bold text-[#405048] transition hover:border-[#a9d2b5] hover:text-[#15803d] active:scale-[.98]">Save notification preferences</button>
            </Card>

            <Card>
              <h2 className="text-[16px] font-bold">Savings & Payments</h2><p className="mt-1 text-xs text-[#7b8981]">Manage how you save and get paid.</p>
              <Link href="/bank-details" className="mt-3 flex items-center gap-3 border-b border-[#edf1ee] py-3.5 transition hover:bg-[#fbfdfb]"><RowIcon>⌂</RowIcon><div className="flex-1"><p className="text-xs font-semibold">Bank account</p><p className="text-[10px] text-[#829087]">View or manage your linked bank accounts.</p></div><span className="text-[#7d8a82]">›</span></Link>
              <div className="flex items-center gap-3 py-3.5"><RowIcon>₦</RowIcon><div className="flex-1"><p className="text-xs font-semibold">Default contribution payment</p><p className="text-[10px] text-[#829087]">Paystack will handle online contributions when enabled.</p></div><span className="rounded-full bg-[#f1f4f2] px-2.5 py-1 text-[9px] font-bold text-[#68766e]">Paystack</span></div>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card><h2 className="text-[15px] font-bold">Appearance</h2><p className="mt-1 text-xs text-[#7b8981]">Switch Alajo between light and dark mode.</p><div className="mt-4 rounded-xl border border-[#e4ebe6] bg-[#fbfcfb] p-1"><ThemeToggle /></div></Card>
            <Card><h2 className="text-[15px] font-bold">Help & Support</h2><div className="mt-2 divide-y divide-[#edf1ee]"><Link href="/help-center" className="flex items-center justify-between py-3.5 text-xs font-semibold transition hover:text-[#15803d]">Help Center <span>›</span></Link><Link href="/notifications" className="flex items-center justify-between py-3.5 text-xs font-semibold transition hover:text-[#15803d]">Contact Support <span>›</span></Link></div></Card>
            <Card><h2 className="text-[15px] font-bold">Account</h2><p className="mt-1 text-xs text-[#7b8981]">Manage your account security and sign out.</p><div className="mt-4"><SignOutButton /></div></Card>
            <div className="rounded-2xl bg-[#087a3b] p-5 text-white shadow-[0_12px_30px_rgba(8,122,59,.16)]"><p className="text-sm font-bold">Grow your savings</p><p className="mt-1 text-[11px] leading-5 text-white/80">Invite friends and earn more when they join Alajo.</p><Link href="/invite" className="mt-4 inline-flex rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#12602f] transition hover:bg-[#f3fff6] active:scale-[.98]">Invite Friends →</Link></div>
          </aside>
        </div>
      </section>
    </main>
  </div>
}
