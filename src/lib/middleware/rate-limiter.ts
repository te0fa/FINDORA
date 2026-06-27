/**
 * FINDORA — API Rate Limiter
 * In-memory rate limiting for API routes.
 * Production-ready: sliding window algorithm, per-IP tracking.
 * For high-scale: replace with Redis-backed solution.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  windowStart: number
}

interface RateLimitConfig {
  /** Maximum requests allowed per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Human-readable message returned when limit exceeded */
  message?: string
}

// In-memory store: Map<IP, RateLimitEntry>
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > 60_000 * 10) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)
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
    'unknown'
  )
}

/**
 * Core rate limiter function.
 * Returns null if within limit, or a 429 NextResponse if exceeded.
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const { limit, windowMs, message = 'Too many requests. Please try again later.' } = config
  const ip = getClientIP(request)
  const now = Date.now()
  const key = `${ip}:${request.nextUrl.pathname}`

  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= windowMs) {
    // Start a new window
    store.set(key, { count: 1, windowStart: now })
    return null
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000)
    return NextResponse.json(
      { error: message, retryAfterSeconds: retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((entry.windowStart + windowMs) / 1000)),
        },
      }
    )
  }

  // Increment count
  entry.count++
  store.set(key, entry)
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
    const limitResponse = rateLimit(request, config)
    if (limitResponse) return limitResponse
    return handler(request, context)
  }
}
