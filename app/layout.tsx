import type { Metadata, Viewport } from 'next'
import './globals.css'
import { MobileNavigation } from '@/components/layout/mobile-navigation'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://alajo-application.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Alajo — Smart Rotational Savings',
    template: '%s | Alajo',
  },
  description: 'Structured rotational savings for everyone.',
  applicationName: 'Alajo',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    siteName: 'Alajo',
    title: 'Alajo — Smart Rotational Savings',
    description: 'Structured rotational savings for everyone.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary',
    title: 'Alajo — Smart Rotational Savings',
    description: 'Structured rotational savings for everyone.',
  },
  icons: {
    icon: [{ url: '/icons/alajo.svg', type: 'image/svg+xml' }],
    shortcut: [{ url: '/icons/alajo.svg', type: 'image/svg+xml' }],
  },
  appleWebApp: { capable: true, title: 'Alajo', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b2313',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: `try { if (localStorage.getItem('alajo-theme') === 'dark') document.documentElement.classList.add('dark') } catch {}` }} />
        <MobileNavigation />
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}) }) }` }} />
      </body>
    </html>
  )
}
