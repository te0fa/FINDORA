/**
 * FINDORA Economy OS — Economy Stabilizer (TypeScript layer)
 * Monitors payout growth rate weekly and adjusts multipliers automatically.
 *
 * Core rule:
 *   if (weekly_payout_growth > 25%) reduce_multiplier(0.85)  → WARNING
 *   if (weekly_payout_growth > 50%) reduce_multiplier(0.70)  → CRITICAL
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('contributors/stabilizer')

export interface StabilizerStatus {
  status: 'normal' | 'warning' | 'critical' | 'frozen' | 'disabled' | 'skipped'
  growth_pct: number
  multiplier: number
  action: string
  this_week_egp: number
  last_week_egp: number
}

export interface StabilizerSnapshot {
  snapshot_date: string
  stabilizer_status: string
  multiplier_adjustment: number
  payout_growth_pct_wow: number
  auto_action_taken: string
  computed_at: string
}

/**
 * Run the economy stabilizer check.
 * Called by cron job (every 24h).
 * Safe to call multiple times per day — snapshots are deduplicated by date.
 */
export async function runEconomyStabilizer(): Promise<StabilizerStatus> {
  const db = createAdminClient()

  const { data, error } = await db.rpc('fn_run_economy_stabilizer')

  if (error) {
    log.error('[STABILIZER] fn_run_economy_stabilizer failed:', error.message)
    return {
      status: 'normal',
      growth_pct: 0,
      multiplier: 1.0,
      action: 'error_fallback',
      this_week_egp: 0,
      last_week_egp: 0
    }
  }

  return data as unknown as StabilizerStatus
}

/**
 * Get the current active stabilizer multiplier.
 * This is applied on top of the tier multiplier in wallet.ts.
 *
 * Example:
 *   tier_multiplier = 1.5 (Network tier)
 *   stabilizer_multiplier = 0.85 (warning mode)
 *   effective = 1.5 × 0.85 = 1.275
 */
export async function getStabilizerMultiplier(): Promise<number> {
  const db = createAdminClient()
  const { data, error } = await db.rpc('fn_get_stabilizer_multiplier')
  if (error) return 1.0
  return Number(data ?? 1.0)
}

/**
 * Get recent stabilizer history for admin dashboard
 */
export async function getStabilizerHistory(limit = 14): Promise<StabilizerSnapshot[]> {
  const db = createAdminClient()
  const { data, error } = await (db
    .from('economy_stabilizer_snapshots') as any)
    .select('snapshot_date, stabilizer_status, multiplier_adjustment, payout_growth_pct_wow, auto_action_taken, computed_at')
    .order('snapshot_date', { ascending: false })
    .limit(limit)

  if (error) return []
  return data as StabilizerSnapshot[]
}

/**
 * Admin override: manually set stabilizer multiplier
 * Only usable by contributor_admin or admin/owner staff
 */
export async function adminOverrideMultiplier(
  staffId: string,
  newMultiplier: number,
  reason: string
): Promise<void> {
  const db = createAdminClient()

  // Clamp between 0.5 and 1.5 — safety bounds
  const clamped = Math.min(1.5, Math.max(0.5, newMultiplier))

  await (db.from('economy_stabilizer_events') as any).insert({
    event_type: 'admin_override',
    trigger_metric: 'manual',
    action_taken: reason,
    new_multiplier: clamped,
    triggered_by: 'manual_override',
    staff_override_id: staffId
  })

  // Insert override snapshot
  await (db.from('economy_stabilizer_snapshots') as any).insert({
    snapshot_date: new Date().toISOString().split('T')[0],
    total_payouts_egp: 0,
    active_contributors: 0,
    new_contributors: 0,
    new_referrals: 0,
    stabilizer_status: 'normal',
    multiplier_adjustment: clamped,
    auto_action_taken: `Admin override: ${reason}`
  })
}

/**
 * Check if a specific multiplier reduction is currently active
 */
export async function isStabilizerActive(): Promise<boolean> {
  const multiplier = await getStabilizerMultiplier()
  return multiplier < 1.0
}
