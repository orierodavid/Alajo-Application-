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

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="relative inline-flex h-9 w-[66px] shrink-0 items-center rounded-full border border-gray-200 bg-gray-100 p-1 shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/40 dark:border-white/10 dark:bg-[#173322]"
    >
      <span className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-white text-[15px] shadow-sm transition-transform duration-200 dark:bg-[#f3f7f4] ${dark ? 'translate-x-7 text-[#14532d]' : 'translate-x-0 text-[#14532d]'}`}>
        <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
      </span>
      <span className="flex w-full justify-between px-1 text-[11px] text-gray-500 dark:text-gray-300" aria-hidden="true">
        <span>☾</span><span>☀</span>
      </span>
    </button>
  )
}
