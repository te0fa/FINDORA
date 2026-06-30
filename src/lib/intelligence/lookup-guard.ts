/**
 * src/lib/intelligence/lookup-guard.ts
 *
 * Server-side protection for the /api/requests/history-lookup endpoint.
 *
 * ⚠️  SERVERLESS LIMITATION (acknowledged, consistent with existing guards):
 *     This in-memory rate limiter shares the same limitation as upload-guard.ts
 *     and link-guard.ts — on Vercel Serverless, each function invocation may
 *     run on a separate instance with independent memory. The limiter is therefore
 *     best-effort, not cryptographic-strength.
 *
 *     For a production-grade solution, replace the in-memory Map with either:
 *       a) Supabase: use the existing rate_limit_tracking table
 *          (migration 018_rate_limit_tracking.sql) to track counts per IP.
 *       b) Upstash Redis: serverless-native Redis, zero cold-start overhead.
 *     This is tracked as a future hardening task (post-Phase 3).
 *
 * Pattern: mirrors upload-guard.ts exactly for consistency.
 */

import { normalizePhone } from '@/lib/phone'

// ─── Types (same shape as upload-guard.ts for consistency) ───────────────────

export interface GuardResult {
  valid: true
}
export interface GuardFailure {
  valid: false
  reason: string
  reasonAr: string
}
export type GuardResponse = GuardResult | GuardFailure

// ─── In-Memory Sliding Window ─────────────────────────────────────────────────

const WINDOW_MS   = 60_000 // 60 seconds
const MAX_HITS    = 5      // max 5 lookup attempts per IP per window

/** { ip → timestamp[] } — timestamps of recent lookup attempts */
const ipWindows = new Map<string, number[]>()

// ─── Guard: Rate Limiter ──────────────────────────────────────────────────────

/**
 * Sliding-window rate limiter for the history-lookup endpoint.
 *
 * @param ip - The requester's IP address (extracted by the API route from headers).
 * @returns GuardResult if under the limit, GuardFailure if exceeded.
 *
 * @see ⚠️ SERVERLESS LIMITATION above — best-effort on Vercel.
 */
export function guardLookupRate(ip: string): GuardResponse {
  const now = Date.now()
  const cutoff = now - WINDOW_MS

  // Get or initialize the window for this IP
  const hits = (ipWindows.get(ip) ?? []).filter((t) => t > cutoff)

  if (hits.length >= MAX_HITS) {
    return {
      valid: false,
      reason: 'RATE_LIMIT_EXCEEDED',
      reasonAr: 'محاولات كثيرة، حاول بعد دقيقة',
    }
  }

  // Record this attempt
  hits.push(now)
  ipWindows.set(ip, hits)

  // Prune stale IPs periodically (every ~100 calls) to avoid unbounded growth
  if (Math.random() < 0.01) {
    for (const [key, timestamps] of ipWindows.entries()) {
      if (timestamps.every((t) => t <= cutoff)) {
        ipWindows.delete(key)
      }
    }
  }

  return { valid: true }
}

// ─── Phone Normalizer ─────────────────────────────────────────────────────────

/**
 * Normalizes a raw phone string using the platform's existing normalizePhone()
 * from src/lib/phone.ts, returning just the normalized string.
 *
 * Returns null if the phone is empty or cannot be normalized to a valid format.
 *
 * The normalized format matches how phones are stored historically in
 * customer_requests.customer_phone (set via the Intake step which also calls
 * normalizePhone before inserting).
 */
export function normalizePhoneForLookup(rawPhone: string): string | null {
  if (!rawPhone?.trim()) return null
  const result = normalizePhone(rawPhone)
  return result?.normalized ?? null
}
