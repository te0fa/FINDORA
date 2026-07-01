import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

interface CustomRedirect {
  source: string;
  destination: string;
  permanent: boolean;
  has?: Array<{
    type: 'header' | 'query' | 'cookie' | 'host';
    key?: string;
    value?: string;
  }>;
}

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Enable HSTS (1 year)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Control referrer info
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser APIs
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  // XSS protection (legacy browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // DNS prefetch control
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://accept.paymob.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://accept.paymob.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
      "frame-src 'self' https://accept.paymob.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },

  // Security headers on all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache static assets aggressively
      {
        source: '/icons/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  // Redirect www to non-www in production + legacy merchant routes to vendor routes
  async redirects() {
    const baseRedirects: CustomRedirect[] = [
      {
        source: '/:locale/merchant/dashboard',
        destination: '/:locale/vendor/auctions',
        permanent: false,
      },
      {
        source: '/:locale/merchant/offers',
        destination: '/:locale/vendor/auctions',
        permanent: false,
      },
      {
        source: '/:locale/merchant/register',
        destination: '/:locale/vendor/register',
        permanent: false,
      },
    ];

    if (process.env.NODE_ENV === 'production') {
      baseRedirects.push({
        source: '/',
        has: [{ type: 'host', value: 'www.findora.app' }],
        destination: 'https://findora.app/',
        permanent: true,
      });
    }
    return baseRedirects as any;
  },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'accept.paymob.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 hours
  },

  // Compress responses
  compress: true,

  // Power-off X-Powered-By header
  poweredByHeader: false,

  // TypeScript: fail build on type errors
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-javascript/blob/master/packages/nextjs/src/config/types.ts

  // Suppresses source map uploading logs during bundling
  silent: true,
  org: "findora-bu",
  project: "javascript-nextjs",
});
