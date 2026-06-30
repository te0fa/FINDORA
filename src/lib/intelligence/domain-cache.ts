/**
 * src/lib/intelligence/domain-cache.ts
 *
 * In-memory cache for allowed_link_domains table.
 * Mirrors the exact pattern of feature-service.ts (30s TTL, stale-on-error).
 *
 * Used by link-guard.ts to check domain allowlist without a DB round-trip on every request.
 * Invalidated instantly after Admin adds/toggles/deletes a domain via the Link Domains UI.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('intelligence/domain-cache')

// ─── Cache State ──────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000 // 30 seconds — same as feature-service.ts

let cache: string[] | null = null // Array of enabled bare domains, e.g. ['amazon.eg', 'noon.com']
let cacheLoadedAt = 0

// ─── Internal Fetcher ─────────────────────────────────────────────────────────

async function fetchFromDB(): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('allowed_link_domains')
    .select('domain')
    .eq('enabled', true)
    .order('domain', { ascending: true })

  if (error) {
    log.error('[domain-cache] DB fetch failed:', error.message)
    throw new Error(`domain-cache: DB fetch failed — ${error.message}`)
  }

  return ((data ?? []) as { domain: string }[]).map((r) => r.domain)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the list of enabled allowed domains, using the in-memory cache.
 * Auto-refreshes after 30 seconds. Serves stale cache on DB error.
 *
 * If the table doesn't exist yet (migration not applied), returns an empty array —
 * the caller (link-guard) will then reject all domains (safe-fail closed).
 */
export async function getAllowedDomains(): Promise<string[]> {
  const now = Date.now()

  if (cache !== null && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cache
  }

  try {
    cache = await fetchFromDB()
    cacheLoadedAt = now
    log.debug(`[domain-cache] Cache refreshed — ${cache.length} domains loaded`)
  } catch (err) {
    if (cache !== null) {
      log.warn('[domain-cache] Using stale cache due to fetch error')
      return cache
    }
    // No cache at all — fail safe (closed): return empty array, all links rejected
    log.error('[domain-cache] No cache and DB unavailable — failing closed (no domains allowed)')
    return []
  }

  return cache
}

/**
 * Clears the in-memory cache, forcing the next call to re-fetch from DB.
 * Call after any domain add/toggle/delete action so the change is live immediately.
 */
export function invalidateDomainCache(): void {
  cache = null
  cacheLoadedAt = 0
  log.info('[domain-cache] Domain allowlist cache invalidated')
}
