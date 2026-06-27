/**
 * FINDORA Economy OS — Risk Engine (TypeScript layer)
 * Wraps fn_gate_action() DB function and provides TypeScript-safe gateAction()
 * All financial actions MUST call gateAction() before proceeding.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('contributors/risk')

export type ActionType =
  | 'referral_reward'
  | 'withdrawal'
  | 'cash_conversion'
  | 'level_upgrade'
  | 'wallet_credit'
  | 'feature_unlock'
  | 'task_reward'
  | 'account_activation'
  | 'network_revenue_share'
  | 'streak_bonus'

export type GateDecision = 'ALLOW' | 'REQUIRE_REVIEW' | 'BLOCK'

export interface GateResult {
  decision: GateDecision
  reason: string
  risk_score: number
  log_id: string
  review_id?: string
}

/**
 * MASTER ENFORCEMENT FUNCTION
 * Every financial write MUST pass through gateAction() before execution.
 *
 * Decision rules:
 *   risk_score >= 80 → BLOCK   (auto-freeze account)
 *   risk_score >= 50 → REQUIRE_REVIEW (human must approve in HR queue)
 *   risk_score < 50  → ALLOW
 *
 * All decisions are logged immutably in fraud_audit_log.
 */
export async function gateAction(
  contributorId: string,
  actionType: ActionType,
  metadata?: Record<string, unknown>
): Promise<GateResult> {
  const db = createAdminClient()

  const { data, error } = await (db as any).rpc('fn_gate_action', {
    p_contributor_id: contributorId,
    p_action_type: actionType,
    p_metadata: metadata ?? {}
  })

  if (error) {
    // If gate fails, default to BLOCK for safety
    log.error('[GATE] fn_gate_action RPC failed:', error.message)
    return {
      decision: 'BLOCK',
      reason: `Gate function error: ${error.message}`,
      risk_score: 100,
      log_id: 'error'
    }
  }

  return {
    decision: data.decision as GateDecision,
    reason: data.reason,
    risk_score: data.risk_score,
    log_id: data.log_id,
    review_id: data.review_id ?? undefined
  }
}

/**
 * Convenience: check if gate result allows execution
 */
export function isAllowed(result: GateResult): boolean {
  return result.decision === 'ALLOW'
}

/**
 * Compute fresh risk score for a contributor (non-blocking)
 */
export async function computeRiskScore(
  contributorId: string
): Promise<{ risk_score: number; account_state: string }> {
  const db = createAdminClient()
  const { data, error } = await (db as any).rpc('fn_compute_risk_score', {
    p_contributor_id: contributorId
  })
  if (error) {
    log.error('[RISK] fn_compute_risk_score failed:', error.message)
    return { risk_score: 0, account_state: 'safe' }
  }
  return data
}

/**
 * Fetch current risk score without recomputing
 */
export async function getRiskScore(
  contributorId: string
): Promise<{ risk_score: number; account_state: string } | null> {
  const db = createAdminClient()
  const { data, error } = await (db
    .from('contributor_risk_scores') as any)
    .select('risk_score, account_state')
    .eq('contributor_id', contributorId)
    .maybeSingle()
  if (error || !data) return null
  return data
}

/**
 * Record a device fingerprint for fraud detection
 */
export async function recordDeviceFingerprint(params: {
  contributorId: string
  ipAddress?: string
  userAgent?: string
  screenFingerprint?: string
  timezone?: string
}): Promise<void> {
  const db = createAdminClient()
  await (db.from('contributor_device_fingerprints') as any).insert({
    contributor_id: params.contributorId,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    screen_fingerprint: params.screenFingerprint ?? null,
    timezone: params.timezone ?? null,
    last_seen_at: new Date().toISOString()
  })
}

/**
 * Check velocity limits for a given action
 * Returns true if action is blocked (velocity exceeded)
 */
export async function checkVelocity(
  contributorId: string,
  actionType: ActionType,
  windowHours: number = 24,
  maxCount: number = 5
): Promise<boolean> {
  const db = createAdminClient()
  const { data, error } = await (db as any).rpc('fn_check_velocity', {
    p_contributor_id: contributorId,
    p_action_type: actionType,
    p_window_hours: windowHours,
    p_max_count: maxCount
  })
  if (error) return false
  return data === true
}
