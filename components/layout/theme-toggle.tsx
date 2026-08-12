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
  return <button type="button" onClick={toggle} role="switch" aria-checked={dark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="alajo-switch" data-state={dark ? 'on' : 'off'}><span>{dark ? '☀' : '☾'}</span></button>
}
