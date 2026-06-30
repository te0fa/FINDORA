/**
 * src/lib/dal/link-attempts.ts
 *
 * DAL for link_attempt_logs table.
 * All writes use createAdminClient() (service role key) — required because:
 *   1. The API route /api/ai/concierge/product-link has no user session
 *   2. RLS on link_attempt_logs allows SELECT for staff but no client INSERT
 *
 * logLinkAttempt() is fire-and-forget: it never throws, never awaits by caller.
 * A logging failure MUST NOT break or slow the customer-facing response.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('dal/link-attempts')

// ─── Types ────────────────────────────────────────────────────────────────────

export type LinkAttemptOutcome =
  | 'accepted'
  | 'rejected_domain'
  | 'rejected_malformed'
  | 'rejected_disabled'
  | 'fetch_failed'

export interface LinkAttemptRow {
  id: string
  raw_url: string
  domain: string | null
  outcome: LinkAttemptOutcome
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface TopRejectedDomain {
  domain: string
  count: number
}

export interface LinkAttemptSummary {
  total: number
  accepted: number
  rejected: number
  rejectionRate: number // 0–100, rounded to 1 decimal
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget insert into link_attempt_logs.
 * Uses service role client (bypasses RLS).
 * NEVER throws — all errors are swallowed silently so logging failures
 * cannot block or delay the customer-facing response.
 *
 * @param rawUrl  - Protocol + hostname + pathname ONLY. Query strings must be
 *                  stripped by the caller before passing here.
 * @param domain  - Extracted hostname (best-effort). Null if URL was unparseable.
 * @param outcome - Classification of why the attempt succeeded or was rejected.
 */
export async function logLinkAttempt(params: {
  rawUrl: string
  domain: string | null
  outcome: LinkAttemptOutcome
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('link_attempt_logs').insert({
      raw_url:    params.rawUrl,
      domain:     params.domain,
      outcome:    params.outcome,
      ip_address: params.ipAddress  ?? null,
      user_agent: params.userAgent  ?? null,
    })

    if (error) {
      // Non-blocking: log the problem but don't surface it to the caller
      log.warn('[link-attempts] Insert failed (non-blocking):', error.message)
    }
  } catch (err) {
    // Belt-and-suspenders: catch any unexpected runtime error
    log.warn('[link-attempts] Unexpected logging error (non-blocking):', err)
  }
}

// ─── Read (Admin Analytics) ───────────────────────────────────────────────────

/**
 * Total/accepted/rejected counts for the analytics summary cards.
 * @param days Number of past days to include (7 or 30).
 */
export async function getLinkAttemptSummary(days: number): Promise<LinkAttemptSummary> {
  try {
    const admin  = createAdminClient()
    const since  = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin
      .from('link_attempt_logs')
      .select('outcome')
      .gte('created_at', since)

    if (error || !data) return { total: 0, accepted: 0, rejected: 0, rejectionRate: 0 }

    const total    = data.length
    const accepted = data.filter((r) => r.outcome === 'accepted').length
    const rejected = total - accepted
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 1000) / 10 : 0

    return { total, accepted, rejected, rejectionRate }
  } catch {
    return { total: 0, accepted: 0, rejected: 0, rejectionRate: 0 }
  }
}

/**
 * Top domains that were rejected (outcome = 'rejected_domain'), ordered by count desc.
 * This is the "what do customers want that we don't support yet" view.
 */
export async function getTopRejectedDomains(
  days: number,
  limit = 20
): Promise<TopRejectedDomain[]> {
  try {
    const admin  = createAdminClient()
    const since  = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin
      .from('link_attempt_logs')
      .select('domain')
      .eq('outcome', 'rejected_domain')
      .gte('created_at', since)
      .not('domain', 'is', null)

    if (error || !data) return []

    // Group by domain in-memory (Supabase REST doesn't support GROUP BY directly)
    const counts: Record<string, number> = {}
    for (const row of data as { domain: string }[]) {
      counts[row.domain] = (counts[row.domain] ?? 0) + 1
    }

    return Object.entries(counts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Most recent N link attempts for the debug/spot-check table.
 */
export async function getRecentAttempts(limit = 50): Promise<LinkAttemptRow[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('link_attempt_logs')
      .select('id, raw_url, domain, outcome, ip_address, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data as LinkAttemptRow[]
  } catch {
    return []
  }
}

/**
 * Returns domains that have been rejected >= thresholdCount times within the last windowHours.
 * Used by the staff hub threshold banner.
 *
 * Threshold (10) and window (24h) are intentionally hardcoded constants.
 * They can be made configurable in a future pass if this proves valuable,
 * but over-engineering a settings page for a single integer is not worth it now.
 */
export async function getHotDomains(
  thresholdCount: number,
  windowHours: number
): Promise<TopRejectedDomain[]> {
  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin
      .from('link_attempt_logs')
      .select('domain')
      .eq('outcome', 'rejected_domain')
      .gte('created_at', since)
      .not('domain', 'is', null)

    if (error || !data) return []

    const counts: Record<string, number> = {}
    for (const row of data as { domain: string }[]) {
      counts[row.domain] = (counts[row.domain] ?? 0) + 1
    }

    return Object.entries(counts)
      .filter(([, count]) => count >= thresholdCount)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}
