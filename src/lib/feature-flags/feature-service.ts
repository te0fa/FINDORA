/**
 * src/lib/feature-flags/feature-service.ts
 * Server-side feature flag service with in-memory TTL cache.
 * Safe to call from API routes, Server Components, and Server Actions.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('feature-flags/service')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeatureFlagEntry {
  enabled: boolean
  config: Record<string, unknown>
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000 // 30 seconds

let cache: Map<string, FeatureFlagEntry> | null = null
let cacheLoadedAt = 0

// ─── Internal Fetcher ─────────────────────────────────────────────────────────

async function fetchFromDB(): Promise<Map<string, FeatureFlagEntry>> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('feature_flags')
    .select('key, enabled, config')

  if (error) {
    log.error('[feature-service] Failed to fetch feature flags:', error.message)
    throw new Error(`FeatureService: DB fetch failed — ${error.message}`)
  }

  const map = new Map<string, FeatureFlagEntry>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    map.set(row.key, {
      enabled: row.enabled ?? false,
      config: (row.config as Record<string, unknown>) ?? {},
    })
  }
  return map
}


// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a Map of all feature flags, using the in-memory cache when fresh.
 * Automatically re-fetches after 30 seconds.
 */
export async function getFeatureFlags(): Promise<Map<string, FeatureFlagEntry>> {
  const now = Date.now()
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cache
  }

  try {
    cache = await fetchFromDB()
    cacheLoadedAt = now
  } catch (err) {
    // On error, return stale cache if available; otherwise propagate
    if (cache) {
      log.warn('[feature-service] Using stale cache due to fetch error')
      return cache
    }
    throw err
  }

  return cache
}

/**
 * Returns whether a specific feature flag is enabled.
 * Defaults to false if the key does not exist.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getFeatureFlags()
  return flags.get(key)?.enabled ?? false
}

/**
 * Returns the config JSON for a specific feature flag.
 * Returns an empty object if the key does not exist.
 */
export async function getFeatureConfig(key: string): Promise<Record<string, unknown>> {
  const flags = await getFeatureFlags()
  return flags.get(key)?.config ?? {}
}

/**
 * Clears the in-memory cache, forcing the next call to re-fetch from DB.
 * Useful for testing or after a known flag update.
 */
export function invalidateFeatureCache(): void {
  cache = null
  cacheLoadedAt = 0
  log.info('[feature-service] Feature flag cache invalidated')
}
