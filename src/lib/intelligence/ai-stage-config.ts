/**
 * src/lib/intelligence/ai-stage-config.ts
 *
 * Per-stage AI model configuration, backed by the existing `ai_agent_configs` table.
 * Mirrors the exact cache pattern of feature-service.ts:
 *   - In-memory Map cache with 30s TTL
 *   - Stale cache on DB error (never crashes a live request)
 *   - `invalidateStageCache()` for immediate post-save busting
 *
 * Usage:
 *   const stage = await getStageSettings('product_link_gap_fill')
 *   if (!stage.enabled) { // skip AI, return graceful partial
 *   callAI({ configOverride: { model: stage.model, temperature: stage.temperature, maxTokens: stage.maxTokens } })
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('intelligence/ai-stage-config')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StageSettings {
  /** The agent_code / stage_key identifying this stage */
  stageKey: string
  /** Whether this AI stage is active. If false, skip the AI call gracefully. */
  enabled: boolean
  /** AI provider — e.g. 'gemini', 'openai'. Must match callAI() supported providers. */
  provider: string
  /** Model identifier — e.g. 'gemini-2.5-flash', 'gpt-4o' */
  model: string
  /** Sampling temperature (0–1). Lower = more deterministic. */
  temperature: number
  /** Max output tokens budget for this stage. */
  maxTokens: number
  /**
   * If non-null, overrides the hardcoded system prompt for this stage.
   * Allows Admin to tune wording without a code deploy.
   * null = use the hardcoded default prompt from the calling function.
   */
  systemPromptOverride: string | null
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000 // 30 seconds — same as feature-service.ts

let cache: Map<string, StageSettings> | null = null
let cacheLoadedAt = 0

// ─── Internal Fetcher ─────────────────────────────────────────────────────────

async function fetchFromDB(): Promise<Map<string, StageSettings>> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ai_agent_configs')
    .select('agent_code, enabled, provider, model, temperature, max_tokens, system_prompt_override')

  if (error) {
    log.error('[ai-stage-config] DB fetch failed:', error.message)
    throw new Error(`ai-stage-config: DB fetch failed — ${error.message}`)
  }

  const map = new Map<string, StageSettings>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    map.set(row.agent_code as string, {
      stageKey:             row.agent_code as string,
      enabled:              (row.enabled as boolean) ?? false,
      provider:             (row.provider as string) ?? 'gemini',
      model:                (row.model as string)    ?? 'gemini-2.5-flash',
      temperature:          typeof row.temperature === 'number' ? row.temperature : 0.2,
      maxTokens:            typeof row.max_tokens === 'number'  ? row.max_tokens  : 1000,
      systemPromptOverride: (row.system_prompt_override as string | null) ?? null,
    })
  }
  return map
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns settings for a specific stage/agent_code, using the in-memory cache.
 * Auto-refreshes after 30 seconds. Serves stale cache on DB error.
 *
 * If the stage row doesn't exist in the DB (e.g. migration not yet applied),
 * returns a safe default that keeps the feature enabled with env-var values.
 */
export async function getStageSettings(stageKey: string): Promise<StageSettings> {
  const now = Date.now()

  // Refresh cache if stale
  if (!cache || now - cacheLoadedAt >= CACHE_TTL_MS) {
    try {
      cache = await fetchFromDB()
      cacheLoadedAt = now
      log.debug(`[ai-stage-config] Cache refreshed — ${cache.size} stages loaded`)
    } catch (err) {
      if (cache) {
        log.warn('[ai-stage-config] Using stale cache due to fetch error')
      } else {
        // No cache at all — return a safe default so the feature doesn't break
        log.warn('[ai-stage-config] No cache and DB unavailable — returning safe default')
        return {
          stageKey,
          enabled:             true,
          provider:            process.env.AI_PROVIDER || 'gemini',
          model:               process.env.AI_MODEL    || 'gemini-2.5-flash',
          temperature:         0.1,
          maxTokens:           512,
          systemPromptOverride: null,
        }
      }
    }
  }

  const settings = cache!.get(stageKey)

  if (!settings) {
    // Stage not in DB — return safe defaults (feature enabled with env values)
    log.warn(`[ai-stage-config] Stage '${stageKey}' not found in DB — using env defaults`)
    return {
      stageKey,
      enabled:             true,
      provider:            process.env.AI_PROVIDER || 'gemini',
      model:               process.env.AI_MODEL    || 'gemini-2.5-flash',
      temperature:         0.1,
      maxTokens:           512,
      systemPromptOverride: null,
    }
  }

  return settings
}

/**
 * Clears the in-memory cache, forcing the next call to re-fetch from DB.
 * Call this immediately after saving a stage config update so the change
 * takes effect on the next request rather than waiting for the 30s TTL.
 */
export function invalidateStageCache(): void {
  cache = null
  cacheLoadedAt = 0
  log.info('[ai-stage-config] Stage config cache invalidated')
}
