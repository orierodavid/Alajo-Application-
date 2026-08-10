import type { Metadata, Viewport } from 'next'
import './globals.css'
import { MobileNavigation } from '@/components/layout/mobile-navigation'

export const metadata: Metadata = {
  title: 'Alajo — Smart Rotational Savings',
  description: 'Structured rotational savings for everyone.',
  applicationName: 'Alajo',
  manifest: '/manifest.webmanifest',
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
        <MobileNavigation />
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}) }) }` }} />
      </body>
    </html>
  )
}
