import { createClient } from '@/lib/supabase/server'
import UsersTable from './users-table'

export const dynamic = 'force-dynamic'

type Profile={id:string;full_name:string|null;email:string|null;phone:string|null;status:string|null;onboarding_step:string|null;created_at:string}
type KycRecord={user_id:string;status:string}

export default async function AdminUsersPage(){
 const supabase=await createClient();const [{data:profiles,error:profilesError},{data:kycRecords,error:kycError}]=await Promise.all([supabase.from('profiles').select('id,full_name,email,phone,status,onboarding_step,created_at').order('created_at',{ascending:false}),supabase.from('user_kyc_profiles').select('user_id,status')]);const users=(profiles||[]) as Profile[];const kycByUser:Record<string,KycRecord>=Object.fromEntries((kycRecords||[]).map(r=>[r.user_id,r as KycRecord]));
 return <section className="p-5 sm:p-8 max-w-7xl mx-auto text-white"><div><p className="text-xs font-bold tracking-[.2em] text-[#61e58d]">ADMINISTRATION</p><h1 className="text-3xl font-bold mt-2 text-white">Users</h1><p className="text-[#d2e2d8] mt-2">Every registered ZeePay user is listed here. Account status and live Paystack KYC are loaded from the backend.</p></div><div className="mt-8 rounded-2xl border border-[#355743] bg-[#0d1d13] overflow-hidden"><div className="px-5 py-4 border-b border-[#355743] flex items-center justify-between"><div><p className="font-semibold text-white">All registered users</p><p className="text-xs text-[#c1d0c6] mt-1">Disable preserves records. Delete permanently removes the login and account.</p></div><span className="text-sm font-bold text-[#f4f8f5]">{users.length} users</span></div>{(profilesError||kycError)?<div className="p-8 text-sm text-red-100">Unable to load the complete user list.</div>:users.length?<UsersTable users={users} kycByUser={kycByUser}/>:<div className="p-10 text-center"><p className="font-semibold text-white">No users found</p><p className="text-sm text-[#c1d0c6] mt-2">Registered profiles will appear here automatically.</p></div>}</div></section>
}
