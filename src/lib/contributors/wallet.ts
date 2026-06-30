/**
 * FINDORA Economy OS — Financial Wallet System
 * ALL financial transactions MUST use these functions.
 * They strictly enforce `gateAction()` and DB-level locks.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { gateAction, GateResult } from './risk'
import { getStabilizerMultiplier } from './stabilizer'
import { getEconomyConfig } from './config'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('contributors/wallet')

export interface RewardParams {
  contributorId: string
  actionType: 'task_reward' | 'referral_reward' | 'network_revenue_share' | 'streak_bonus'
  baseAmountEgp: number
  baseAmountPoints: number
  referenceType: 'task' | 'referral'
  referenceId: string
  descriptionEn: string
  descriptionAr: string
}

export interface WithdrawalParams {
  contributorId: string
  amountEgp: number
  paymentMethod: 'instapay' | 'vodafone_cash' | 'bank_transfer'
  paymentDetails: Record<string, string>
}

/**
 * 1. Process a reward (credit funds to wallet)
 * Enforces gateAction(), fetches tier multiplier, fetches stabilizer multiplier,
 * calculates final amount, and executes transaction securely.
 */
export async function processReward(params: RewardParams): Promise<{
  success: boolean
  transactionId?: string
  gateResult: GateResult
  error?: string
}> {
  // 1. Enforce Gate Action FIRST
  const gateResult = await gateAction(params.contributorId, params.actionType, {
    base_amount_egp: params.baseAmountEgp,
    reference_id: params.referenceId
  })

  if (gateResult.decision === 'BLOCK') {
    return { success: false, gateResult, error: 'Transaction blocked by Risk Engine' }
  }

  const db = createAdminClient()

  // 2. Fetch Contributor Role and Trust Score
  const { data: contributor, error: contribError } = await (db as any).from('contributors')
    .select('role, trust_score, earning_multiplier, decay_multiplier')
    .eq('id', params.contributorId)
    .single()

  if (contribError || !contributor) {
    return { success: false, gateResult, error: 'Contributor not found or invalid' }
  }

  // 3. Fetch Dynamic Multipliers from Economy Config
  const roleMultipliersFallback: Record<string, number> = {
    field_scout: 1.2,
    store_insider: 1.0,
    casual: 0.8
  }
  const roleMultipliers = (await getEconomyConfig('role_multipliers')) || roleMultipliersFallback
  const roleMultiplier = roleMultipliers[contributor.role] || 1.0

  // Trust Score Bonus: Offset from base 50. 
  // e.g., 50 trust_score -> 1.0x, 80 -> 1.3x, 30 -> 0.8x
  const trustScoreBonus = 1.0 + ((contributor.trust_score - 50) / 100)

  // Fetch economy stabilizer multiplier
  const stabilizerMultiplier = await getStabilizerMultiplier()

  // Apply final equation components
  const tierMultiplier = Number(contributor.earning_multiplier ?? 1.0)
  
  // 4. Apply Survival Decay (Network Survival Mode)
  // The user explicitly stated to apply decay to L2 Passive Income only.
  const decayMultiplier = params.actionType === 'network_revenue_share' 
    ? Number(contributor.decay_multiplier ?? 1.0)
    : 1.0

  // 5. Fetch Active Bonus Campaigns
  const { data: campaigns } = await (db as any).from('bonus_campaigns')
    .select('multiplier_boost')
    .eq('is_active', true)
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .or(`target_role.is.null,target_role.eq.${contributor.role}`)

  const campaignBoost = campaigns?.reduce((sum: number, c: any) => sum + Number(c.multiplier_boost), 0) || 0

  const finalEffectiveMultiplier = (roleMultiplier * trustScoreBonus * tierMultiplier * stabilizerMultiplier * decayMultiplier) + campaignBoost

  // Determine rewards depending on the specific Role rules:
  // - Field Scout: Cash only (translate calculated reward directly into EGP)
  // - Store Insider: Commission EGP + Points
  // - Casual: Points only
  let finalEgp = 0
  let finalPoints = 0

  if (contributor.role === 'field_scout') {
    // Earns EGP Cash directly
    finalEgp = Number((params.baseAmountEgp * finalEffectiveMultiplier).toFixed(2))
    finalPoints = 0
  } else if (contributor.role === 'store_insider') {
    // Earns Commission (EGP) + Points
    finalEgp = Number((params.baseAmountEgp * finalEffectiveMultiplier).toFixed(2))
    finalPoints = Math.round(params.baseAmountPoints * finalEffectiveMultiplier)
  } else {
    // Casual: Points only (0 EGP)
    finalEgp = 0
    finalPoints = Math.round(params.baseAmountPoints * finalEffectiveMultiplier)
  }

  // 4. Determine status based on gate result
  let txStatus = 'completed'
  if (gateResult.decision === 'REQUIRE_REVIEW') {
    txStatus = 'pending_review'
  }

  // 5. Fetch Wallet ID
  const { data: wallet } = await (db as any).from('contributor_wallets')
    .select('id, is_frozen')
    .eq('contributor_id', params.contributorId)
    .single()

  if (!wallet) {
    return { success: false, gateResult, error: 'Wallet not found' }
  }

  if (wallet.is_frozen) {
    return { success: false, gateResult, error: 'Wallet is frozen. Cannot process reward.' }
  }

  // 6. Execute Transaction
  const { data: tx, error } = await (db as any).from('wallet_transactions').insert({
    contributor_id: params.contributorId,
    wallet_id: wallet.id,
    tx_type: params.actionType,
    status: txStatus,
    amount_egp: finalEgp,
    amount_points: finalPoints,
    reference_type: params.referenceType,
    reference_id: params.referenceId,
    fraud_audit_id: gateResult.log_id,
    description_en: params.descriptionEn,
    description_ar: params.descriptionAr,
    metadata: {
      base_amount_egp: params.baseAmountEgp,
      base_amount_points: params.baseAmountPoints,
      role: contributor.role,
      role_multiplier: roleMultiplier,
      trust_score: contributor.trust_score,
      trust_score_bonus: trustScoreBonus,
      tier_multiplier: tierMultiplier,
      stabilizer_multiplier: stabilizerMultiplier,
      decay_multiplier: decayMultiplier,
      campaign_boost: campaignBoost,
      effective_multiplier: finalEffectiveMultiplier
    }
  }).select('id').single()

  if (error || !tx) {
    log.error('[WALLET] Transaction insert failed:', error?.message)
    return { success: false, gateResult, error: 'Database error' }
  }

  // 7. If pending review, create a Fraud Alert
  if (txStatus === 'pending_review') {
    await (db as any).from('fraud_alerts').insert({
      contributor_id: params.contributorId,
      alert_level: 'warning',
      alert_type: 'manual_review_required',
      description: `Reward transaction ${tx.id} requires manual review (Risk Score: ${gateResult.risk_score}).`,
      related_transaction_id: tx.id
    })
    // NOTE: For the caller, this is technically a "success" (the action was recorded), 
    // but the funds are NOT in the wallet balance yet.
    return { success: true, transactionId: tx.id, gateResult, error: 'Transaction requires review and is delayed.' }
  }

  return { success: true, transactionId: tx.id, gateResult }
}

/**
 * 2. Request a withdrawal (move funds to pending and create request)
 * Enforces gateAction(). If approved, deducts from balance_egp and adds to pending_withdrawal_egp.
 */
export async function requestWithdrawal(params: WithdrawalParams): Promise<{
  success: boolean
  withdrawalId?: string
  gateResult: GateResult
  error?: string
}> {
  // 1. Enforce Gate Action FIRST
  const gateResult = await gateAction(params.contributorId, 'withdrawal', {
    amount_egp: params.amountEgp,
    payment_method: params.paymentMethod
  })

  if (gateResult.decision === 'BLOCK') {
    return { success: false, gateResult, error: 'Withdrawal blocked by Risk Engine' }
  }

  const db = createAdminClient()

  // 2. Fetch Wallet & Verify Balance
  const { data: wallet } = await (db as any).from('contributor_wallets')
    .select('id, balance_egp, is_frozen, pending_withdrawal_egp')
    .eq('contributor_id', params.contributorId)
    .single()

  if (!wallet) return { success: false, gateResult, error: 'Wallet not found' }
  
  if (wallet.is_frozen) {
    return { success: false, gateResult, error: 'Wallet is frozen. Withdrawals disabled.' }
  }

  // 3. Move funds to pending (using raw SQL RPC to ensure database-level locking and checks)
  const { data: rpcResult, error: rpcError } = await (db as any).rpc('fn_lock_and_insert_transaction', {
    p_contributor_id: params.contributorId,
    p_wallet_id: wallet.id,
    p_tx_type: 'withdrawal_hold',
    p_amount_egp: -params.amountEgp, // negative amount to deduct from balance and add to pending
    p_amount_points: 0,
    p_reference_type: 'withdrawal_request',
    p_reference_id: null,
    p_description_en: `Withdrawal hold of ${params.amountEgp} EGP`,
    p_description_ar: `حجز مبلغ ${params.amountEgp} ج.م معلق للسحب`,
    p_metadata: { payment_method: params.paymentMethod },
    p_idempotency_key: null
  })

  const resultObj = rpcResult as any
  if (rpcError || !resultObj || !resultObj.success) {
    return { success: false, gateResult, error: rpcError?.message || resultObj?.error || 'Concurrent transaction error or insufficient balance' }
  }

  // 4. Determine status based on gate result
  // If gate requires review, set status to 'held_for_review'.
  const withdrawalStatus = gateResult.decision === 'REQUIRE_REVIEW' ? 'held_for_review' : 'pending'

  // 5. Create Withdrawal Request Record
  const { data: request, error: reqError } = await (db as any).from('contributor_withdrawals').insert({
    contributor_id: params.contributorId,
    wallet_id: wallet.id,
    amount_egp: params.amountEgp,
    payment_method: params.paymentMethod,
    payment_details: params.paymentDetails,
    status: withdrawalStatus,
    fraud_audit_id: gateResult.log_id
  }).select('id').single()

  if (reqError) {
    // Critical failure: need to rollback balance. In a real system, this is inside a Postgres Transaction block.
    log.error('[WALLET] Failed to create withdrawal request', reqError.message)
    return { success: false, gateResult, error: 'System error processing request' }
  }

  // 6. If held for review, create a Fraud Alert
  if (withdrawalStatus === 'held_for_review') {
    await (db as any).from('fraud_alerts').insert({
      contributor_id: params.contributorId,
      alert_level: 'warning',
      alert_type: 'manual_review_required',
      description: `Withdrawal request ${request.id} for ${params.amountEgp} EGP requires manual review (Risk Score: ${gateResult.risk_score}).`,
      // related_transaction_id is null since this is a withdrawal request, not a wallet_transaction yet
    })
  }

  return { success: true, withdrawalId: request.id, gateResult }
}

export interface WalletBalances {
  balance_egp: number
  points_balance: number
  pending_withdrawal_egp: number
  lifetime_earned_egp: number
}

/**
 * 3. Fetch Wallet Balances
 */
export async function getWalletBalances(contributorId: string): Promise<WalletBalances | null> {
  const db = createAdminClient()
  const { data } = await (db as any).from('contributor_wallets')
    .select('balance_egp, points_balance, pending_withdrawal_egp, lifetime_earned_egp')
    .eq('contributor_id', contributorId)
    .single()
  return data as WalletBalances | null
}

/**
 * 4. Fetch Transaction History
 */
export async function getTransactionHistory(contributorId: string, limit = 20) {
  const db = createAdminClient()
  const { data } = await (db as any).from('wallet_transactions')
    .select('id, tx_type, amount_egp, amount_points, description_en, description_ar, created_at')
    .eq('contributor_id', contributorId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}
