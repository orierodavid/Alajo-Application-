import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import SignOutButton from './sign-out-button'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Dashboard authentication error: Supabase environment variables are missing')
    redirect('/login?error=config')
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Cookie writes can be unavailable during some server render phases.
        }
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    redirect('/login?error=session')
  }

  const user = data.user
  const name =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    user.email?.split('@')[0] ||
    'there'

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
        <span className="text-2xl font-extrabold">Alajo</span>
        <SignOutButton />
      </header>
      <section className="max-w-6xl mx-auto p-6 lg:p-10">
        <p className="text-gray-500">Dashboard</p>
        <h1 className="mt-1 text-3xl font-extrabold">Good morning, {name} 👋</h1>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Total Contributions</p>
            <p className="mt-2 text-2xl font-extrabold text-[#16a34a]">₦0.00</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Active Groups</p>
            <p className="mt-2 text-2xl font-extrabold">0</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Total Payouts</p>
            <p className="mt-2 text-2xl font-extrabold">₦0.00</p>
          </div>
        </div>
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-lg">Your Alajo account is ready</h2>
          <p className="mt-2 text-gray-500">Group discovery, KYC, contributions and payouts will appear here as those modules are connected.</p>
        </div>
      </section>
    </main>
  )
}
