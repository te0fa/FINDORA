/**
 * FINDORA — API Rate Limiter
 * Supabase-backed persistent rate limiting for API routes.
 * Uses rate_limit_windows table via proxy.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/proxy'

interface RateLimitConfig {
  /** Maximum requests allowed per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Human-readable message returned when limit exceeded */
  message?: string
}

/**
 * Get the client IP from a Next.js request.
 * Handles proxies (Vercel, Cloudflare) via forwarded headers.
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  )
}

/**
 * Core rate limiter function backed by Supabase rate_limit_windows table.
 * Returns null if within limit, or a 429 NextResponse if exceeded.
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const { limit, windowMs, message = 'Too many requests. Please try again later.' } = config
  const ip = getClientIP(request)
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  const cleanPath = request.nextUrl.pathname.replace(/^\/(?:ar|en)/, '')

  const { allowed, remaining, resetTime } = await checkRateLimit(
    ip,
    cleanPath,
    limit,
    windowSeconds
  )

  if (!allowed) {
    const retryAfter = Math.max(1, resetTime - Math.ceil(Date.now() / 1000))
    return NextResponse.json(
      { error: message, retryAfterSeconds: retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(resetTime),
        },
      }
    )
  }

  return null
}

// ── Preset configurations ─────────────────────────────────────────────────────

/** Strict: 20 req / min — for auth endpoints (OTP, login) */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowMs: 60_000,
  message: 'Too many authentication attempts. Please wait before trying again.',
}

/** Standard: 60 req / min — for general API routes */
export const STANDARD_RATE_LIMIT: RateLimitConfig = {
  limit: 60,
  windowMs: 60_000,
  message: 'Rate limit exceeded. Please slow down.',
}

/** Relaxed: 200 req / min — for read-heavy public endpoints */
export const PUBLIC_RATE_LIMIT: RateLimitConfig = {
  limit: 200,
  windowMs: 60_000,
  message: 'Rate limit exceeded.',
}

/** AI: 10 req / min — expensive AI operations */
export const AI_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 60_000,
  message: 'AI request limit reached. Please wait before running another analysis.',
}

/** OTP: 5 req / 10 min — prevent OTP abuse */
export const OTP_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowMs: 10 * 60_000,
  message: 'Too many OTP requests. Please wait 10 minutes.',
}

/** Vendor Registration: 5 registrations per hour — prevent registration spam */
export const VENDOR_REGISTRATION_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many registration attempts from this IP. Please try again in an hour.',
}

/**
 * Higher-order wrapper: apply rate limiting to an API route handler.
 *
 * Usage:
 * ```ts
 * export const POST = withRateLimit(AI_RATE_LIMIT, async (req) => {
 *   // handler logic
 * })
 * ```
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const limitResponse = await rateLimit(request, config)
    if (limitResponse) return limitResponse
    return handler(request, context)
  }
}
