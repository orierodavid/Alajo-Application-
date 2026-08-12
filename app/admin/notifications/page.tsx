'use client'

import { useEffect, useState } from 'react'

export default function AdminNotificationsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/finance', { cache: 'no-store' }).then(async r => {
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Unable to load notifications')
      setData(d.notifications ?? [])
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function sendBroadcast() {
    setSending(true); setError(''); setMessage('')
    try {
      const r = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Unable to send notification')
      setMessage(`Message sent to ${d.sent} users.`)
      setTitle(''); setBody(''); load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to send notification.') }
    finally { setSending(false) }
  }

  return <section className="p-5 sm:p-8 max-w-6xl mx-auto text-white">
    <p className="text-xs font-bold tracking-[.2em] text-[#16a34a]">COMMUNICATIONS</p>
    <h1 className="text-3xl font-bold mt-2 text-white">Notifications</h1>
    <p className="text-gray-300 mt-2">Send in-app announcements to members and review notification activity.</p>

    <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b2113] overflow-hidden p-5">
      <h2 className="font-semibold text-white">Send message to all users</h2>
      <p className="text-sm text-gray-300 mt-1">This creates an in-app notification for every registered user. The same notification record can later power mobile push notifications when the native app is enabled.</p>
      <div className="mt-5 grid gap-4">
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Message title" className="h-11 rounded-xl border border-white/15 bg-white/[.06] px-3 text-sm text-white placeholder:text-gray-400 outline-none focus:border-[#16a34a]/60" />
        <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000} rows={4} placeholder="Write your announcement..." className="rounded-xl border border-white/15 bg-white/[.06] px-3 py-3 text-sm text-white placeholder:text-gray-400 outline-none focus:border-[#16a34a]/60" />
        <button type="button" disabled={sending || !title.trim() || !body.trim()} onClick={sendBroadcast} className="alajo-interactive justify-self-start rounded-xl bg-[#16a34a] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{sending ? 'Sending…' : 'Send to all users'}</button>
      </div>
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
    {message && <div className="mt-4 rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 p-3 text-sm text-[#86efac]">{message}</div>}

    <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b2113] overflow-hidden">
      <div className="p-5 border-b border-white/10"><p className="font-semibold text-white">Notification activity</p></div>
      {loading ? <p className="p-8 text-sm text-gray-300">Loading notifications…</p> : data.length === 0 ? <p className="p-8 text-sm text-gray-300">No notifications recorded yet.</p> : <div className="divide-y divide-white/10">{data.map(n => <article key={n.id} className="p-5 flex items-start justify-between gap-5"><div><p className="font-semibold text-sm text-white">{n.title}</p><p className="text-sm text-gray-300 mt-1">{n.body}</p><p className="text-xs text-gray-400 mt-2">{n.user?.full_name || n.user?.email || n.user_id} · {n.type}</p></div><span className="text-xs text-gray-400 whitespace-nowrap">{new Date(n.created_at).toLocaleString('en-NG')}</span></article>)}</div>}
    </div>
  </section>
}
