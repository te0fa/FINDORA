/**
 * FINDORA Economy OS — Supply Engine & Contribution System
 * Handles price mapping, product listing, and rewards distribution.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { processReward } from './wallet'
import { updateDailyStreak } from './gamification'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('contributors/supply')

export interface PriceReportParams {
  contributorId: string
  productId?: string
  vendorId?: string
  price: number
  details?: Record<string, unknown>
}

/**
 * Submit a price report or local store offer
 * Atomically saves the submission, triggers streak updates, and awards calculated rewards.
 */
export async function submitPriceReport(params: PriceReportParams): Promise<{
  success: boolean
  submissionId?: string
  rewardSuccess?: boolean
  error?: string
}> {
  const db = createAdminClient()

  // 1. Insert contribution submission record
  const { data: sub, error: subError } = await (db as any).from('contributor_submissions')
    .insert({
      contributor_id: params.contributorId,
      submission_type: 'price_report',
      product_id: params.productId || null,
      vendor_id: params.vendorId || null,
      price_reported: params.price,
      details: params.details || {},
      status: 'pending' // starts pending human-in-the-loop review or auto-verif
    })
    .select('id')
    .single()

  if (subError || !sub) {
    log.error('[SUPPLY ENGINE] Submission failed:', subError?.message)
    return { success: false, error: 'Failed to record submission details' }
  }

  // 2. Increment Daily Streak
  try {
    await updateDailyStreak(params.contributorId)
  } catch (streakErr) {
    log.error('[SUPPLY ENGINE] Streak update ignored:', streakErr)
  }

  // 3. Process Reward
  // Base values: 10 EGP base, 20 Points base.
  // The wallet processReward method will automatically adjust this base according to:
  // Role multiplier (Field Scout vs Insider) and Trust score bonus.
  const reward = await processReward({
    contributorId: params.contributorId,
    actionType: 'task_reward',
    baseAmountEgp: 10.00, // 10 EGP base
    baseAmountPoints: 20,  // 20 points base
    referenceType: 'task',
    referenceId: sub.id,
    descriptionEn: `Submitted price report #${sub.id.substring(0, 8)}`,
    descriptionAr: `تقديم تقرير أسعار #${sub.id.substring(0, 8)}`
  })

  return {
    success: true,
    submissionId: sub.id,
    rewardSuccess: reward.success,
    error: reward.error
  }
}

/**
 * Query submissions for dashboard list
 */
export async function getContributorSubmissions(contributorId: string, limit = 10) {
  const db = createAdminClient()
  const { data, error } = await (db as any).from('contributor_submissions')
    .select('*')
    .eq('contributor_id', contributorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}
