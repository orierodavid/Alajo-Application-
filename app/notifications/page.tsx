'use client'

import { useEffect, useState } from 'react'
import { UserPageShell } from '@/components/layout/user-page-shell'

export default function NotificationsPage(){
 const[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=()=>{setLoading(true);fetch('/api/notifications',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load notifications');setItems(d.notifications??[])}).catch(e=>setError(e.message)).finally(()=>setLoading(false))}
 useEffect(load,[])
 const markRead=async(id:string)=>{await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});setItems(v=>v.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n))}
 const markAll=async()=>{await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});setItems(v=>v.map(n=>({...n,read_at:new Date().toISOString()})))}
 const unread=items.filter(n=>!n.read_at).length
 return <UserPageShell eyebrow="Account" title="Notifications" description="Important updates from Alajo." actions={<span className="rounded-full bg-[#eaf7ef] text-[#15803d] px-3 py-1 text-xs font-semibold">{unread} unread</span>}><div className="mx-auto w-full max-w-[1180px]"><div className="flex justify-end mb-4"><button onClick={markAll} disabled={!unread} className="text-xs font-bold text-[#14532d] disabled:text-gray-400">Mark all as read</button></div><section className="bg-white rounded-2xl border border-[#e3e9e5] divide-y divide-[#edf0ee] overflow-hidden">{loading?<p className="p-8 text-sm text-gray-500">Loading notifications…</p>:error?<p className="p-8 text-sm text-red-600">{error}</p>:items.length===0?<p className="p-10 text-center text-sm text-gray-500">No notifications yet.</p>:items.map(n=><article key={n.id} onClick={()=>!n.read_at&&markRead(n.id)} className={`p-5 flex gap-4 cursor-pointer transition hover:bg-[#fafcfb] ${!n.read_at?'bg-[#eaf7ef]/35':''}`}><div className="w-10 h-10 rounded-xl bg-[#eaf7ef] text-[#16a34a] flex items-center justify-center shrink-0">●</div><div className="flex-1"><div className="flex justify-between gap-4"><h2 className="font-bold text-sm text-[#183526]">{n.title}</h2><span className="text-xs text-gray-400 whitespace-nowrap">{new Date(n.created_at).toLocaleString('en-NG')}</span></div><p className="text-sm text-gray-500 mt-1">{n.body}</p>{!n.read_at&&<span className="inline-block mt-3 text-[10px] uppercase tracking-wider font-bold text-[#16a34a]">New</span>}</div></article>)}</section></div></UserPageShell>
}
