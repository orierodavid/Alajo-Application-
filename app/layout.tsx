import type { Metadata, Viewport } from 'next'
import './globals.css'
import { MobileNavigation } from '@/components/layout/mobile-navigation'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://alajo-application.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Deotech Finance — Rotational Savings', template: '%s | Deotech Finance' },
  description: 'Structured rotational savings and financial tools from Deotech Finance.',
  applicationName: 'Deotech Finance',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: { type: 'website', siteName: 'Deotech Finance', title: 'Deotech Finance — Rotational Savings', description: 'Structured rotational savings and financial tools from Deotech Finance.', url: siteUrl },
  twitter: { card: 'summary', title: 'Deotech Finance — Rotational Savings', description: 'Structured rotational savings and financial tools from Deotech Finance.' },
  icons: { icon: [{ url: '/icons/deotech-finance.svg', type: 'image/svg+xml' }], shortcut: [{ url: '/icons/deotech-finance.svg', type: 'image/svg+xml' }] },
  appleWebApp: { capable: true, title: 'Deotech Finance', statusBarStyle: 'default' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#07111f' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><script dangerouslySetInnerHTML={{ __html: `try { if (localStorage.getItem('alajo-theme') === 'dark') document.documentElement.classList.add('dark') } catch {}` }} /><MobileNavigation />{children}<script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}) }) }` }} /></body></html>
}
