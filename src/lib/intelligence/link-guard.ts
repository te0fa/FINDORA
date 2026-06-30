/**
 * src/lib/intelligence/link-guard.ts
 *
 * Zero-cost pre-check for product URL submissions.
 * Mirrors the pattern of upload-guard.ts — runs BEFORE any network fetch
 * or AI call. No HTTP requests, no buffer reads, pure in-memory validation.
 *
 * Order of checks (wire in this exact order in the API route):
 *   1. isFeatureEnabled('product_link_input') — done in the route, not here
 *   2. guardProductUrl()                      — malformed + domain allowlist
 *   3. extractProductFromUrl()                — actual fetch + parse
 */

import { getAllowedDomains } from '@/lib/intelligence/domain-cache'

// ─── Types ────────────────────────────────────────────────────────────────────
// Re-export the same GuardResponse shape as upload-guard.ts for consistency

export interface GuardResult {
  valid: true
}
export interface GuardFailure {
  valid: false
  reason: string
  reasonAr: string
}
export type GuardResponse = GuardResult | GuardFailure

// ─── Guard: URL validity + domain allowlist ───────────────────────────────────

/**
 * Validates that the given string is:
 *   1. A well-formed URL (uses native URL constructor — no regex)
 *   2. From an explicitly allowed domain (read from allowed_link_domains table via 30s-TTL cache)
 *
 * Domain source: `allowed_link_domains` table (Admin-managed via /admin/link-domains UI).
 * Cache: 30s TTL, fails closed (if DB unavailable and no cache, all domains rejected).
 *
 * Subdomain matching rule:
 *   - Exact match: hostname === domain
 *   - Subdomain: hostname.endsWith('.' + domain)
 *   e.g. "www.amazon.eg" matches allowed domain "amazon.eg"
 *
 * Cost: near-zero — DB query is cached; no network calls, no AI calls, no file I/O.
 */
export async function guardProductUrl(rawUrl: string): Promise<GuardResponse> {
  // ── Step 1: Parse URL (catches malformed input) ────────────────────────────
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return {
      valid: false,
      reason: 'INVALID_URL',
      reasonAr: 'الرابط غير صحيح، يرجى التأكد من نسخ الرابط كاملاً',
    }
  }

  // Only allow http/https — reject data:, javascript:, ftp:, etc.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: 'INVALID_URL',
      reasonAr: 'الرابط غير صحيح، يرجى التأكد من نسخ الرابط كاملاً',
    }
  }

  // ── Step 2: Read allowed domains from DB cache (30s TTL) ────────────────────
  // Source: allowed_link_domains table managed via /admin/link-domains UI.
  // Fails closed: if DB is unavailable with no cache, returns [] → all domains rejected.
  const allowedDomains = await getAllowedDomains()

  // ── Step 3: Domain allowlist check ────────────────────────────────────────
  const hostname = parsed.hostname.toLowerCase()

  const isAllowed = allowedDomains.some((domain) => {
    const d = domain.toLowerCase()
    return hostname === d || hostname.endsWith('.' + d)
  })

  if (!isAllowed) {
    return {
      valid: false,
      reason: 'DOMAIN_NOT_ALLOWED',
      reasonAr:
        'هذا الموقع غير مدعوم حالياً، الروابط المدعومة: أمازون، نون، AliExpress',
    }
  }

  return { valid: true }
}
