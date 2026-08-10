'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import SignOutButton from '@/app/dashboard/sign-out-button'

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#16a34a]' : 'bg-gray-200 dark:bg-white/15'}`}>
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
)

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`bg-white dark:bg-[#102719] rounded-2xl border border-gray-100 dark:border-white/15 p-5 sm:p-6 ${className}`}>{children}</section>
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
  const kycLabel = kycApproved ? 'Verified' : kycPending ? 'Pending verification' : kycFailed ? 'Verification failed' : 'Not started'
  const kycTone = kycApproved ? 'bg-green-50 text-[#15803d] dark:bg-green-500/10 dark:text-green-300' : kycPending ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : kycFailed ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'

  return <div className="min-h-screen bg-[#f6f8f7] dark:bg-[#08170e] text-gray-900 dark:text-gray-100">
    <AppSidebar />
    <main className="lg:ml-[250px] pt-16 lg:pt-0">
      <header className="h-[76px] bg-white/90 dark:bg-[#0b1f13]/95 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 sm:px-8 flex items-center justify-between sticky top-16 lg:top-0 z-20">
        <div><p className="text-gray-400 text-[12px] uppercase tracking-[.16em] font-semibold">Account</p><h1 className="font-bold text-[21px] mt-0.5">Settings</h1></div>
        <div className="hidden lg:flex items-center gap-4"><ThemeToggle /><div className="w-9 h-9 rounded-full bg-[#dcefe2] dark:bg-[#183b27] flex items-center justify-center font-bold text-[#0b2313] dark:text-white">{name.charAt(0).toUpperCase()}</div></div>
      </header>

      <section className="p-5 sm:p-8 max-w-[1100px]">
        <div className="mb-7"><h2 className="text-2xl sm:text-3xl font-bold">Account settings</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your Alajo account, identity, security and preferences.</p></div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-5">
            <Card>
              <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-lg">Personal information</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your basic account information.</p></div><div className="w-12 h-12 rounded-full bg-[#dcefe2] dark:bg-[#183b27] flex items-center justify-center text-lg font-bold text-[#0b2313] dark:text-white">{name.charAt(0).toUpperCase()}</div></div>
              <div className="mt-6 grid sm:grid-cols-2 gap-4"><label><span className="block text-sm font-medium mb-1.5">Full name</span><input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0d2115] px-3.5 py-3 outline-none focus:ring-2 focus:ring-[#16a34a]/20" /></label><label><span className="block text-sm font-medium mb-1.5">Email address</span><input value={email} readOnly className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-[#0d2115] px-3.5 py-3 text-gray-500 dark:text-gray-400" /></label></div>
              <div className="mt-5 flex items-center gap-3"><button onClick={saveProfile} disabled={saving} className="rounded-xl bg-[#14532d] hover:bg-[#0f4525] text-white px-5 py-3 text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>{message && <span className="text-sm text-[#16a34a]">{message}</span>}</div>
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-lg">Identity verification</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your KYC status and verification method.</p></div><span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${kycTone}`}>{kycLabel}</span></div>
              <div className="mt-5 grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#0d2115] p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Method</p><p className="mt-1 font-semibold">{kyc.verification_level ? kyc.verification_level.toUpperCase() : '—'}</p></div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#0d2115] p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p><p className="mt-1 font-semibold">{kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString() : 'Not submitted'}</p></div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#0d2115] p-4"><p className="text-xs text-gray-500 dark:text-gray-400">Reviewed</p><p className="mt-1 font-semibold">{kyc.reviewed_at ? new Date(kyc.reviewed_at).toLocaleDateString() : '—'}</p></div>
              </div>
              {kycFailed && kyc.rejection_reason && <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-300 rounded-xl p-3">{kyc.rejection_reason}</p>}
              {!kycApproved && <Link href="/kyc" className="inline-flex mt-5 rounded-xl bg-[#14532d] text-white px-5 py-3 text-sm font-semibold">{kycFailed ? 'Retry verification' : 'Complete KYC'}</Link>}
              {kycApproved && <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">For security, Alajo never displays your full BVN or NIN here.</p>}
            </Card>

            <Card>
              <h3 className="font-semibold text-lg">Security</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Keep your Alajo account protected.</p>
              <div className="mt-5 divide-y divide-gray-100 dark:divide-white/10"><Link href="/forgot-password" className="flex items-center justify-between py-4 group"><div><p className="font-medium">Change password</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set a new password securely.</p></div><span className="text-gray-400 group-hover:text-[#16a34a]">→</span></Link><div className="flex items-center justify-between py-4"><div><p className="font-medium">Two-factor authentication</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Additional account protection.</p></div><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">Coming soon</span></div><div className="flex items-center justify-between py-4"><div><p className="font-medium">Active sessions</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Session management will be added before production launch.</p></div><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">Coming soon</span></div></div>
            </Card>

            <Card>
              <h3 className="font-semibold text-lg">Notifications</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose what Alajo can notify you about.</p>
              <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">{[[emailAlerts,setEmailAlerts,'Email notifications','Important account and activity emails.'],[paymentAlerts,setPaymentAlerts,'Contribution & payment alerts','Contribution confirmations and payment updates.'],[groupAlerts,setGroupAlerts,'Group & payout alerts','Important changes to your savings groups and payouts.'],[marketing,setMarketing,'Product updates','News and optional Alajo updates.']].map(([checked,setter,label,desc]) => <div className="flex items-center justify-between gap-4 py-4" key={label as string}><div><p className="font-medium">{label as string}</p><p className="text-sm text-gray-500 dark:text-gray-400">{desc as string}</p></div><Toggle checked={checked as boolean} onChange={setter as (v: boolean) => void} label={label as string} /></div>)}</div>
              <button onClick={savePreferences} className="mt-5 rounded-xl border border-gray-200 dark:border-white/15 px-4 py-2.5 text-sm font-semibold hover:border-[#16a34a]">Save notification preferences</button>
            </Card>

            <Card>
              <h3 className="font-semibold text-lg">Savings & payments</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage the payment details used by your Alajo account.</p>
              <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10"><Link href="/bank-details" className="flex items-center justify-between py-4 group"><div><p className="font-medium">Bank account</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View or manage your payout bank details.</p></div><span className="text-gray-400 group-hover:text-[#16a34a]">→</span></Link><div className="flex items-center justify-between py-4"><div><p className="font-medium">Default contribution payment</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Paystack will handle online contributions when enabled.</p></div><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">Paystack</span></div></div>
            </Card>

            <Card>
              <h3 className="font-semibold text-lg">Privacy & account</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Control your account and personal-data choices.</p>
              <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10"><Link href="/privacy" className="flex items-center justify-between py-4 group"><div><p className="font-medium">Privacy</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review how Alajo handles your information.</p></div><span className="text-gray-400">→</span></Link><div className="flex items-center justify-between py-4"><div><p className="font-medium">Download my data</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Data export will be available as the platform matures.</p></div><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">Coming soon</span></div><div className="flex items-center justify-between py-4"><div><p className="font-medium text-red-600">Delete account</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Permanent deletion requires a secure confirmation flow.</p></div><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300">Coming soon</span></div></div>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card><h3 className="font-semibold">Appearance</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Switch Alajo between light and dark mode.</p><div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-[#0d2115] border border-gray-100 dark:border-white/10 p-3"><span className="text-sm font-medium">Theme</span><ThemeToggle /></div></Card>
            <Card><h3 className="font-semibold">Help & support</h3><div className="mt-3 space-y-1"><Link href="/help-center" className="block rounded-xl px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5">Help Center <span className="float-right text-gray-400">→</span></Link><Link href="/notifications" className="block rounded-xl px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5">Notifications <span className="float-right text-gray-400">→</span></Link></div></Card>
            <Card className="border-red-100 dark:border-red-500/20"><h3 className="font-semibold text-red-600">Sign out</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">Sign out of your Alajo account on this device.</p><SignOutButton /></Card>
          </aside>
        </div>
      </section>
    </main>
  </div>
}
