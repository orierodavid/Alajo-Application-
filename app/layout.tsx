import type { Metadata, Viewport } from 'next'
import './globals.css'
import './zeepay-design.css'
import './zeepay-polish.css'
import './zeepay-final-polish.css'
import { MobileNavigation } from '@/components/layout/mobile-navigation'
import { PublicNavigation } from '@/components/layout/public-navigation'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://alajo-application.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'ZeePay — Rotational Savings', template: '%s | ZeePay' },
  description: 'Structured rotational savings and financial tools from ZeePay.',
  applicationName: 'ZeePay',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: { type: 'website', siteName: 'ZeePay', title: 'ZeePay — Rotational Savings', description: 'Structured rotational savings and financial tools from ZeePay.', url: siteUrl },
  twitter: { card: 'summary', title: 'ZeePay — Rotational Savings', description: 'Structured rotational savings and financial tools from ZeePay.' },
  icons: { icon: [{ url: '/icons/zeepay.svg', type: 'image/svg+xml' }], shortcut: [{ url: '/icons/zeepay.svg', type: 'image/svg+xml' }] },
  appleWebApp: { capable: true, title: 'ZeePay', statusBarStyle: 'default' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0f5b32' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><script dangerouslySetInnerHTML={{ __html: `try { if (localStorage.getItem('zeepay-theme') === 'dark') document.documentElement.classList.add('dark') } catch {}` }} /><PublicNavigation /><MobileNavigation />{children}<script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(registrations){ return Promise.all(registrations.map(function(registration){ return registration.unregister() })) }).then(function(){ return caches.keys() }).then(function(keys){ return Promise.all(keys.map(function(key){ return caches.delete(key) })) }).catch(function(){}) }` }} /></body></html>
}
