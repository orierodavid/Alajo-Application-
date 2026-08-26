import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function KycStatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: kyc }, { data: virtualAccount }] = await Promise.all([
    supabase.from('user_kyc_profiles').select('status,rejection_reason').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_virtual_accounts').select('status').eq('user_id', user.id).maybeSingle(),
  ])

  const kycStatus = kyc?.status ?? 'NOT_STARTED'
  const accountActive = virtualAccount?.status === 'ACTIVE'
  const verified = kycStatus === 'VERIFIED'
  const rejected = kycStatus === 'REJECTED'
  const complete = verified && accountActive

  const title = complete ? 'Identity & Funding Account Ready' : rejected ? 'Verification Needs Attention' : verified ? 'Funding Account Being Prepared' : 'Verification Under Review'
  const body = complete
    ? 'Your identity has been verified and your dedicated funding account is active. You can now use your Alajo wallet.'
    : rejected
      ? (kyc?.rejection_reason || 'We could not complete your verification. Review your information and submit again.')
      : verified
        ? 'Your identity is verified. We are waiting for your dedicated funding account to become active before opening the rest of your account.'
        : 'Your verification details have been received. We are reviewing them before you can use your Alajo account.'

  return <main className="min-h-screen bg-white grid lg:grid-cols-2">
    <section className="relative hidden lg:block p-10 border-r border-gray-100 overflow-hidden"><div className="relative z-10"><Link href="/" className="text-[22px] font-extrabold tracking-tight text-gray-900">Alajo ◌</Link><h1 className="mt-8 font-bold text-[28px] leading-[1.2] text-gray-900 max-w-[320px]">Smart Rotational Savings for <span className="text-[#16a34a]">Everyone</span></h1><p className="mt-3 text-[15px] text-gray-500 max-w-[300px]">Join thousands of people already saving and growing together with Alajo.</p><div className="mt-8 space-y-5"><Feature icon="✓" title="Secure & Verified" text="Your identity helps keep your account and savings secure."/><Feature icon="👥" title="Trusted Savings" text="Save with a structured group built around clear rules."/><Feature icon="🔒" title="Protected" text="Your account information is handled securely."/></div></div><div className="absolute left-[-40px] bottom-[-40px] w-56 h-56 rounded-full bg-[#eab308]/25"/><div className="absolute left-[-60px] bottom-[-80px] w-64 h-64 rounded-full bg-[#14532d]/90"/></section>
    <section className="p-8 sm:p-12 flex items-center justify-center"><div className="max-w-[420px] w-full text-center"><div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl ${complete ? 'bg-green-50 text-[#16a34a]' : rejected ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>{complete ? '✓' : rejected ? '!' : '⏳'}</div><h2 className="mt-5 font-extrabold text-[25px] text-gray-900">{title}</h2><p className="mt-3 text-gray-500 text-[15px] leading-relaxed">{body}</p><div className="mt-6 rounded-md bg-gray-50 border border-gray-100 p-4 text-left"><div className="flex items-center justify-between"><span className="text-sm text-gray-500">KYC status</span><span className="text-sm font-semibold capitalize text-gray-900">{kycStatus.toLowerCase().replace('_', ' ')}</span></div><div className="mt-3 flex items-center justify-between"><span className="text-sm text-gray-500">Funding account</span><span className="text-sm font-semibold text-gray-900">{accountActive ? 'Active' : 'Not active'}</span></div></div>{complete ? <Link href="/dashboard" className="mt-6 block w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px]">Go to Dashboard</Link> : rejected ? <Link href="/kyc" className="mt-6 block w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px]">Resubmit Verification</Link> : <Link href="/kyc" className="mt-6 block w-full py-3 rounded-md bg-[#14532d] text-white font-semibold text-[15px]">View Verification</Link>} {!complete && <p className="mt-4 text-[13px] text-gray-400">You will not be able to use the main Alajo account until KYC and the dedicated funding account are complete.</p>}</div></section>
  </main>
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="flex gap-3"><div className="w-9 h-9 shrink-0 rounded-full bg-green-50 flex items-center justify-center text-[#16a34a]">{icon}</div><div><p className="font-semibold text-[14px] text-gray-900">{title}</p><p className="text-[13px] text-gray-500">{text}</p></div></div> }
