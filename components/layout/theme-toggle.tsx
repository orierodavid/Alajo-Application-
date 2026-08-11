'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains('dark'))
    sync()
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('alajo-theme', next ? 'dark' : 'light')
    setDark(next)
  }

  return <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'} className="alajo-button relative inline-flex h-9 w-[66px] shrink-0 items-center overflow-hidden rounded-full border border-[#22c55e]/20 bg-white/[0.05] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/40 dark:bg-white/[0.05]">
    <span className={`absolute left-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[14px] shadow-[0_2px_10px_rgba(0,0,0,.30)] transition-transform duration-300 ease-out ${dark ? 'translate-x-7 text-[#14532d]' : 'translate-x-0 text-[#14532d]'}`}><span aria-hidden="true">{dark ? '☀' : '☾'}</span></span>
    <span className="relative z-10 flex w-full justify-between px-1 text-[10px] text-white/45" aria-hidden="true"><span>☾</span><span>☀</span></span>
  </button>
}
