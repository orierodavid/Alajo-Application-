import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://alajo-application.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/groups/',
          '/join-group/',
          '/contributions/',
          '/payouts/',
          '/wallet/',
          '/transactions/',
          '/notifications/',
          '/settings/',
          '/onboarding/',
          '/login/',
          '/signup/',
          '/forgot-password/',
          '/reset-password/',
          '/verify-email/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
