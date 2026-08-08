'use client'

type IconName =
  | 'dashboard' | 'groups' | 'contributions' | 'payouts' | 'wallet' | 'transactions'
  | 'invite' | 'notifications' | 'settings' | 'help' | 'logout' | 'coin'
  | 'add' | 'crown' | 'arrow-down' | 'arrow-up' | 'clock' | 'check'

type Props = { name: IconName; size?: number; className?: string }

const paths: Record<IconName, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  groups: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  contributions: 'M6 2h9l4 4v16H6zM14 2v5h5M9 12h6M9 16h6',
  payouts: 'M12 2v20M17 6.5c0-1.4-2.2-2.5-5-2.5S7 5.1 7 6.5 9.2 9 12 9s5 1.1 5 2.5-2.2 2.5-5 2.5-5-1.1-5-2.5',
  wallet: 'M3 7h18v14H3zM3 7V5a2 2 0 0 1 2-2h14M16 14h3',
  transactions: 'M4 19V5M4 19h16M8 16v-5M12 16V8M16 16V4',
  invite: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6',
  notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V21h-2v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.04H7v-2h.84A1.7 1.7 0 0 0 9.4 10a1.7 1.7 0 0 0-.34-1.88L9 8.06l1.41-1.41.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.4 5.5V5h2v.5a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.04H21v2h-.04A1.7 1.7 0 0 0 19.4 15Z',
  help: 'M9.1 9a3 3 0 1 1 5.7 1.4c-.7 1.2-2.8 1.7-2.8 3.6M12 18h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  logout: 'M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-5',
  coin: 'M20 12c0 3-3.6 5-8 5s-8-2-8-5 3.6-5 8-5 8 2 8 5ZM4 12v4c0 3 3.6 5 8 5s8-2 8-5v-4',
  add: 'M12 5v14M5 12h14',
  crown: 'm3 7 4 4 5-7 5 7 4-4-2 13H5z',
  'arrow-down': 'M12 4v16M6 14l6 6 6-6',
  'arrow-up': 'M12 20V4M6 10l6-6 6 6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  check: 'm5 12 4 4L19 6',
}

export function AlajoIcon({ name, size = 18, className = '' }: Props) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d={paths[name]} /></svg>
}
