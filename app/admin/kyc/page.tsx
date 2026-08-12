import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
}

type KycRecord = {
  user_id: string
  status: string
  verification_level: string | null
  provider_reference: string | null
  submitted_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default async function AdminKycPage() {
  const supabase = await createClient()
  const [{ data: profiles, error: profilesError }, { data: kycRecords, error: kycError }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,email,phone').order('full_name', { ascending: true }),
    supabase.from('kyc_records').select('user_id,status,verification_level,provider_reference,submitted_at,reviewed_at,rejection_reason'),
  ])

  const records = new Map((kycRecords ?? []).map(record => [record.user_id, record as KycRecord]))
  const users = (profiles ?? []) as Profile[]
  const unverified = users.filter(user => records.get(user.id)?.status !== 'approved')
  const verified = users.filter(user => records.get(user.id)?.status === 'approved')

  return (
    <section className="p-5 sm:p-8 max-w-7xl mx-auto text-white">
      <div>
        <p className="text-xs font-bold tracking-[.2em] text-[#39c66b]">COMPLIANCE</p>
        <h1 className="text-3xl font-bold mt-2 text-white">KYC</h1>
        <p className="text-[#b7c7be] mt-2">Every registered user is visible here. Only users who are not verified require KYC attention.</p>
      </div>

      {(profilesError || kycError) && <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">Unable to load the complete KYC data set. Please refresh and try again.</div>}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#244332] bg-[#0d1d13] p-5"><p className="text-xs text-[#9fb3a8]">All users</p><p className="mt-2 text-2xl font-bold text-white">{users.length}</p></div>
        <div className="rounded-2xl border border-[#244332] bg-[#0d1d13] p-5"><p className="text-xs text-[#9fb3a8]">Verified</p><p className="mt-2 text-2xl font-bold text-[#61e58d]">{verified.length}</p></div>
        <div className="rounded-2xl border border-[#244332] bg-[#0d1d13] p-5"><p className="text-xs text-[#9fb3a8]">Needs KYC attention</p><p className="mt-2 text-2xl font-bold text-[#f6c85f]">{unverified.length}</p></div>
      </div>

      <div className="mt-8 rounded-2xl border border-[#244332] bg-[#0d1d13] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#244332]"><p className="font-semibold text-white">KYC review queue</p><p className="text-xs text-[#9fb3a8] mt-1">Only users without an approved KYC record are shown here for follow-up.</p></div>
        {unverified.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#102719] text-[#9fb3a8]"><tr><th className="text-left px-5 py-3 font-semibold">User</th><th className="text-left px-5 py-3 font-semibold">KYC status</th><th className="text-left px-5 py-3 font-semibold">Level</th><th className="text-left px-5 py-3 font-semibold">Submitted</th><th className="text-left px-5 py-3 font-semibold">Rejection</th></tr></thead>
              <tbody className="divide-y divide-[#244332]">
                {unverified.map(user => {
                  const kyc = records.get(user.id)
                  const status = kyc?.status?.replaceAll('_', ' ') || 'not submitted'
                  return <tr key={user.id} className="hover:bg-[#102719] transition-colors">
                    <td className="px-5 py-4"><p className="font-semibold text-white">{user.full_name || 'Unnamed user'}</p><p className="text-xs text-[#9fb3a8] mt-0.5">{user.email || user.phone || '—'}</p></td>
                    <td className="px-5 py-4"><span className="inline-flex rounded-full bg-[#3a2d10] text-[#f6c85f] px-2.5 py-1 text-xs font-semibold capitalize">{status}</span></td>
                    <td className="px-5 py-4 text-[#d6e1da]">{kyc?.verification_level || '—'}</td>
                    <td className="px-5 py-4 text-[#b7c7be]">{formatDate(kyc?.submitted_at || null)}</td>
                    <td className="px-5 py-4 text-[#d6e1da]">{kyc?.rejection_reason || '—'}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="p-10 text-center"><p className="font-semibold text-white">All users are KYC verified</p><p className="text-sm text-[#9fb3a8] mt-2">There are no users currently requiring KYC attention.</p></div>}
      </div>
    </section>
  )
}
