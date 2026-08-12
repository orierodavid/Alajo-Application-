import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  status: string | null
  onboarding_step: string | null
  created_at: string
}

type KycRecord = {
  user_id: string
  status: string
  verification_level: string | null
  submitted_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(value))
}

function kycLabel(record?: KycRecord) {
  if (!record) return 'Not verified'
  return record.status === 'approved' ? 'Verified' : record.status.replaceAll('_', ' ')
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const [{ data: profiles, error: profilesError }, { data: kycRecords }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,email,phone,status,onboarding_step,created_at').order('created_at', { ascending: false }),
    supabase.from('kyc_records').select('user_id,status,verification_level,submitted_at,reviewed_at,rejection_reason'),
  ])

  const kycByUser = new Map((kycRecords ?? []).map(record => [record.user_id, record as KycRecord]))
  const users = (profiles ?? []) as Profile[]

  return (
    <section className="p-5 sm:p-8 max-w-7xl mx-auto text-white">
      <div>
        <p className="text-xs font-bold tracking-[.2em] text-[#39c66b]">ADMINISTRATION</p>
        <h1 className="text-3xl font-bold mt-2 text-white">Users</h1>
        <p className="text-[#b7c7be] mt-2">All registered users, account status, onboarding and KYC status.</p>
      </div>

      <div className="mt-8 rounded-2xl border border-[#244332] bg-[#0d1d13] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#244332] flex items-center justify-between">
          <div><p className="font-semibold text-white">All users</p><p className="text-xs text-[#9fb3a8] mt-1">KYC status is shown for every user, including users who have not started verification.</p></div>
          <span className="text-xs font-semibold text-[#b7c7be]">{users.length} users</span>
        </div>
        {profilesError ? (
          <div className="p-8 text-sm text-red-300">Unable to load users.</div>
        ) : users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#102719] text-[#9fb3a8]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">User</th>
                  <th className="text-left px-5 py-3 font-semibold">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold">Account</th>
                  <th className="text-left px-5 py-3 font-semibold">KYC</th>
                  <th className="text-left px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#244332]">
                {users.map(user => {
                  const kyc = kycByUser.get(user.id)
                  const verified = kyc?.status === 'approved'
                  return (
                    <tr key={user.id} className="hover:bg-[#102719] transition-colors">
                      <td className="px-5 py-4"><p className="font-semibold text-white">{user.full_name || 'Unnamed user'}</p><p className="text-xs text-[#9fb3a8] mt-0.5">{user.email || '—'}</p></td>
                      <td className="px-5 py-4 text-[#d6e1da]">{user.phone || '—'}</td>
                      <td className="px-5 py-4"><span className="capitalize text-[#d6e1da]">{user.status || 'unknown'}</span><p className="text-xs text-[#879d90] mt-1">{user.onboarding_step || '—'}</p></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${verified ? 'bg-[#123b22] text-[#61e58d]' : 'bg-[#3a2d10] text-[#f6c85f]'}`}>{kycLabel(kyc)}</span></td>
                      <td className="px-5 py-4 text-[#b7c7be]">{formatDate(user.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center"><p className="font-semibold text-white">No users found</p><p className="text-sm text-[#9fb3a8] mt-2">Registered profiles will appear here automatically.</p></div>
        )}
      </div>
    </section>
  )
}
