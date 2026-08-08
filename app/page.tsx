import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-8 flex items-center gap-1 text-2xl font-extrabold">Alajo<span className="text-green-600">◔</span></div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-700">Smart rotational savings</p>
            <h1 className="max-w-xl text-5xl font-extrabold tracking-tight sm:text-6xl">Save together. Receive your turn. Grow with confidence.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-500">Join structured savings groups, make scheduled contributions and receive your payout according to your position.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-md bg-green-900 px-6 py-3 font-semibold text-white hover:bg-green-800">Login</Link>
              <Link href="/signup" className="rounded-md border border-gray-200 px-6 py-3 font-semibold text-gray-900 hover:bg-gray-50">Create account</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Total Contributions</p>
              <p className="mt-2 text-3xl font-bold">₦250,000.00</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-100 p-4"><p className="text-xs text-gray-400">Active Groups</p><p className="mt-1 text-xl font-bold">3</p></div>
                <div className="rounded-lg border border-gray-100 p-4"><p className="text-xs text-gray-400">Total Payouts</p><p className="mt-1 text-xl font-bold text-green-700">₦180,000</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
