import { createClient } from '@/lib/supabase/server'
import UsersTable from './users-table'

export const dynamic = 'force-dynamic'

type Profile={id:string;full_name:string|null;email:string|null;phone:string|null;status:string|null;onboarding_step:string|null;created_at:string}
type KycRecord={user_id:string;status:string}

export default async function AdminUsersPage(){
 const supabase=await createClient();const [{data:profiles,error:profilesError},{data:kycRecords}]=await Promise.all([supabase.from('profiles').select('id,full_name,email,phone,status,onboarding_step,created_at').order('created_at',{ascending:false}),supabase.from('kyc_records').select('user_id,status')]);const users=(profiles||[]) as Profile[];const kycByUser:Object.fromEntries=Object.fromEntries((kycRecords||[]).map(r=>[r.user_id,r as KycRecord]));
 return <section className="p-5 sm:p-8 max-w-7xl mx-auto text-white"><div><p className="text-xs font-bold tracking-[.2em] text-[#39c66b]">ADMINISTRATION</p><h1 className="text-3xl font-bold mt-2 text-white">Users</h1><p className="text-[#b7c7be] mt-2">All registered users, account status, onboarding and KYC status.</p></div><div className="mt-8 rounded-2xl border border-[#244332] bg-[#0d1d13] overflow-hidden"><div className="px-5 py-4 border-b border-[#244332] flex items-center justify-between"><div><p className="font-semibold text-white">All users</p><p className="text-xs text-[#9fb3a8] mt-1">Disabling an account preserves all financial, KYC and group history.</p></div><span className="text-xs font-semibold text-[#b7c7be]">{users.length} users</span></div>{profilesError?<div className="p-8 text-sm text-red-300">Unable to load users.</div>:users.length?<UsersTable users={users} kycByUser={kycByUser}/>:<div className="p-10 text-center"><p className="font-semibold text-white">No users found</p><p className="text-sm text-[#9fb3a8] mt-2">Registered profiles will appear here automatically.</p></div>}</div></section>
}
