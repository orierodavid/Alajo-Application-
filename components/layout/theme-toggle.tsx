'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('alajo-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="flex items-center justify-center w-10 h-10 rounded-lg text-[#16a34a] dark:text-green-300 hover:bg-green-50/60 dark:hover:bg-white/10 transition"
    >
      <span aria-hidden="true" className="text-lg">{dark ? '☀' : '☾'}</span>
    </button>
  )
}
