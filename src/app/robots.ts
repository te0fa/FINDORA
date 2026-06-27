import { MetadataRoute } from 'next'

/**
 * FINDORA — robots.txt
 * Controls search engine crawling.
 * Blocks private/admin routes from indexing.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://findora.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/ar/', '/en/', '/ar/pricing', '/en/pricing', '/ar/deals', '/en/deals'],
        disallow: [
          '/ar/staff/',
          '/en/staff/',
          '/ar/customer/',
          '/en/customer/',
          '/ar/merchant/',
          '/en/merchant/',
          '/ar/vendor/',
          '/en/vendor/',
          '/ar/contributors/',
          '/en/contributors/',
          '/api/',
          '/_next/',
        ],
      },
      // Block AI crawlers from scraping proprietary data
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
