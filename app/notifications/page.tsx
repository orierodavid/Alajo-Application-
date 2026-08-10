'use client'

import { useState } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'

const sample = [
  { id: 'welcome', title: 'Welcome to Alajo', body: 'Stay on top of your savings, contributions and payouts from one place.', time: 'Today', unread: true },
  { id: 'security', title: 'Account security', body: 'Keep your login details private and never share verification codes.', time: 'Today', unread: false },
]

export default function NotificationsPage() {
  const [items, setItems] = useState(sample)
  const unread = items.filter((item) => item.unread).length
  return <div className="min-h-screen bg-[#f7f8f9] text-gray-900"><AppSidebar/><main className="lg:ml-[250px] min-h-screen"><header className="h-[76px] bg-white border-b border-gray-100 px-5 sm:px-8 flex items-center justify-between"><div><p className="text-gray-400 text-xs uppercase tracking-[.16em] font-semibold">Account</p><h1 className="font-bold text-[21px] mt-1">Notifications</h1><p className="text-sm text-gray-500 mt-1">Important updates from Alajo.</p></div><span className="rounded-full bg-green-50 text-[#16a34a] px-3 py-1 text-xs font-semibold">{unread} unread</span></header><section className="p-5 sm:p-8 max-w-4xl"><div className="flex justify-end mb-4"><button onClick={() => setItems((current) => current.map((item) => ({ ...item, unread: false })))} className="text-sm font-semibold text-[#14532d]">Mark all as read</button></div><div className="bg-white rounded-2xl border border-gray-100 divide-y">{items.map((item) => <article key={item.id} className={`p-5 flex gap-4 ${item.unread ? 'bg-green-50/30' : ''}`}><div className="w-10 h-10 rounded-xl bg-green-50 text-[#16a34a] flex items-center justify-center shrink-0"><span className="text-lg">●</span></div><div className="flex-1"><div className="flex justify-between gap-4"><h2 className="font-semibold text-sm">{item.title}</h2><span className="text-xs text-gray-400">{item.time}</span></div><p className="text-sm text-gray-500 mt-1">{item.body}</p>{item.unread && <span className="inline-block mt-3 text-[10px] uppercase tracking-wider font-bold text-[#16a34a]">New</span>}</div></article>)}</div></section></main></div>
}
