'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Invalid administrator credentials.')
      setLoading(false)
      return
    }
    const response = await fetch('/api/admin/session', { cache: 'no-store' })
    if (!response.ok) {
      await supabase.auth.signOut()
      setError('This account does not have administrator access.')
      setLoading(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return <main className="min-h-screen bg-[#f5faf7] dark:bg-[#07150c] flex items-center justify-center px-5 py-10">
    <section className="w-full max-w-md">
      <div className="text-center mb-8"><div className="mx-auto w-12 h-12 rounded-2xl bg-[#16a34a] text-white flex items-center justify-center font-black text-xl">A</div><p className="mt-4 text-xs font-bold tracking-[0.22em] text-[#16a34a]">ALAJO ADMINISTRATION</p><h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">Administrator Login</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Secure access to the Alajo operations backend.</p></div>
      <form onSubmit={submit} className="rounded-3xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#102719] p-6 sm:p-8 shadow-xl">
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0b2113] text-gray-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#16a34a]/30" /></label>
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mt-5">Password<div className="mt-2 flex rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0b2113]"><input required type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-gray-900 dark:text-white px-4 py-3 outline-none" /><button type="button" onClick={() => setShow(v => !v)} className="px-4 text-sm text-gray-500">{show ? 'Hide' : 'Show'}</button></div></label>
        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-[#14532d] hover:bg-[#166534] disabled:opacity-60 text-white py-3.5 font-bold">{loading ? 'Signing in…' : 'Sign in to Admin'}</button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-5">Alajo administrative access is restricted to authorized staff.</p>
    </section>
  </main>
}
