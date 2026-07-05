import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { i18nConfig } from '@/lib/i18n/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_FILE_PATH_REGEX = /\.(.*)$/

// ── Rate Limiting Config ──────────────────────────────────────────────────────
function getRateLimitConfig(pathname: string): { limit: number; windowSeconds: number } | null {
  const cleanPath = pathname.replace(/^\/(?:ar|en)/, '')

  // 1. Strict Auth & OTP routes
  if (
    cleanPath.startsWith('/api/otp/send') ||
    cleanPath.startsWith('/api/otp/verify') ||
    cleanPath === '/auth/login' ||
    cleanPath.startsWith('/auth/login/')
  ) {
    return { limit: 10, windowSeconds: 60 }
  }

  // 2. Strict AI routes
  if (
    cleanPath.startsWith('/api/ai/parse-request') ||
    cleanPath.startsWith('/api/ai/pricing') ||
    cleanPath.startsWith('/api/pricing/resolve')
  ) {
    return { limit: 10, windowSeconds: 60 }
  }

  // 3. Exempt Webhooks (high threshold protection)
  if (
    cleanPath.startsWith('/api/webhooks/paymob') ||
    cleanPath.startsWith('/api/webhooks/vendors/inbound')
  ) {
    return { limit: 500, windowSeconds: 60 }
  }

  // 4. General APIs
  if (cleanPath.startsWith('/api/')) {
    return { limit: 1000, windowSeconds: 60 }
  }

  return null
}

async function checkRateLimit(
  ip: string,
  path: string,
  limit: number,
  windowSeconds: number
) {
  return { allowed: true, remaining: limit, resetTime: Math.floor(Date.now() / 1000) + windowSeconds }
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  )
}

// ── Auth Checks for APIs ──────────────────────────────────────────────────────
function requiresAuth(pathname: string, method: string): boolean {
  const cleanPath = pathname.replace(/^\/(?:ar|en)/, '')

  if (!cleanPath.startsWith('/api/')) return false

  // List of public API paths
  if (
    cleanPath.startsWith('/api/ai/parse-request') ||
    cleanPath.startsWith('/api/ai/pricing') ||
    cleanPath.startsWith('/api/pricing/resolve') ||
    cleanPath.startsWith('/api/contributors/scarcity') ||
    cleanPath.startsWith('/api/merchants/register') ||
    cleanPath.startsWith('/api/otp/') ||
    cleanPath.startsWith('/api/cron/') ||
    cleanPath.startsWith('/api/test-sentry') ||
    cleanPath.startsWith('/api/internal/jobs/research/run') ||
    cleanPath.startsWith('/api/webhooks/') ||
    cleanPath.startsWith('/api/vendors/check-duplicate') ||
    cleanPath.startsWith('/api/trends') ||
    cleanPath.startsWith('/api/customers/requests/create') ||
    cleanPath.startsWith('/api/ai/concierge') ||
    cleanPath.startsWith('/api/requests/history-lookup') ||
    (cleanPath.startsWith('/api/requests/') && cleanPath.endsWith('/reuse'))
  ) {
    return false
  }

  // Mixed paths (conditional on HTTP method)
  if (cleanPath === '/api/products' || cleanPath.startsWith('/api/products/')) {
    const isHistoryOrPrice = cleanPath.includes('/history') || cleanPath.includes('/price')
    const isProductById = cleanPath.match(/^\/api\/products\/[^/]+$/)
    const isProductsList = cleanPath === '/api/products'
    
    if (method === 'GET' && (isProductsList || isProductById || isHistoryOrPrice)) {
      return false
    }
    return true
  }

  if (cleanPath === '/api/specializations' || cleanPath.startsWith('/api/specializations/')) {
    if (method === 'GET') {
      return false
    }
    return true
  }

  return true
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // 1. Rate Limiting Check
  const rateLimitConfig = getRateLimitConfig(pathname)
  if (rateLimitConfig) {
    const ip = getClientIP(request)
    const cleanPath = pathname.replace(/^\/(?:ar|en)/, '')
    const { allowed, remaining, resetTime } = await checkRateLimit(
      ip,
      cleanPath,
      rateLimitConfig.limit,
      rateLimitConfig.windowSeconds
    )

    if (!allowed) {
      const retryAfter = Math.max(1, resetTime - Math.ceil(Date.now() / 1000))
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateLimitConfig.limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(resetTime)
          }
        }
      )
    }
  }

  // 2. Resolve User Session (for Auth Gate checks)
  let user = null
  const isApi = pathname.includes('/api/')
  const needsAuth = requiresAuth(pathname, method)

  // Only check auth from Supabase if we are hitting a protected API or a protected page
  // This saves DB queries for static files or public pages
  const isProtectedPage = !isApi && (
    pathname.includes('/staff') ||
    pathname.includes('/dashboard') ||
    pathname.includes('/requests') ||
    pathname.includes('/reports') ||
    pathname.includes('/contributors/dashboard') ||
    pathname.includes('/contributors/submit') ||
    pathname.includes('/contributors/wallet')
  )

  if (needsAuth || isProtectedPage) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    )!

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })

    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch (err) {
      console.error('Error fetching user in proxy:', err)
    }

    // 3. Centralized API Auth Guard
    if (needsAuth && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3.5. Role-Level Authorization Guard
    if (user && pathname.includes('/api/staff/')) {
      const adminClient = createAdminClient() as any
      const { data: staff, error: staffError } = await adminClient
        .from('staff_members')
        .select('id, is_active')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (staffError || !staff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  // 4. Check if the pathname has a locale
  const pathnameHasLocale = i18nConfig.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // 5. Redirect to default locale if not present (except for internal paths)
  if (!pathnameHasLocale) {
    if (
      !isApi &&
      !pathname.includes('/_next/') &&
      !PUBLIC_FILE_PATH_REGEX.test(pathname)
    ) {
      const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
      const acceptLanguage = request.headers.get('Accept-Language')
      
      let detectedLocale = i18nConfig.defaultLocale
      
      if (cookieLocale && i18nConfig.locales.includes(cookieLocale as any)) {
        detectedLocale = cookieLocale as any
      } else if (acceptLanguage) {
        const preferredLocale = acceptLanguage.split(',')[0].split('-')[0]
        if (i18nConfig.locales.includes(preferredLocale as any)) {
          detectedLocale = preferredLocale as any
        }
      }

      const redirectUrl = new URL(`/${detectedLocale}${pathname}`, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 6. Maintain Supabase session & handle page redirects
  return await updateSession(request, user)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
