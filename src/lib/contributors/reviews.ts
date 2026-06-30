/**
 * FINDORA Economy OS — Review Engine
 * Handles customer feedback routing to contributor trust scores.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('contributors/reviews')

export interface ContributorReviewParams {
  contributorId: string
  customerId?: string
  rating: number // 1 to 5
  comment?: string
}

/**
 * Submit a customer rating for a contributor.
 * Automatically recalculates and updates the trust_score in real-time via DB Trigger.
 */
export async function submitContributorReview(params: ContributorReviewParams): Promise<{
  success: boolean
  reviewId?: string
  newTrustScore?: number
  error?: string
}> {
  const db = createAdminClient()

  // 1. Insert review record
  const { data: rev, error: revError } = await (db as any).from('contributor_reviews')
    .insert({
      contributor_id: params.contributorId,
      customer_id: params.customerId || null,
      rating: params.rating,
      comment: params.comment || null
    })
    .select('id')
    .single()

  if (revError || !rev) {
    log.error('[REVIEW ENGINE] Failed to save review:', revError?.message)
    return { success: false, error: 'Failed to record contributor feedback' }
  }

  // 2. Fetch fresh trust score to return to client
  const { data: contributor } = await (db as any).from('contributors')
    .select('trust_score')
    .eq('id', params.contributorId)
    .single()

  return {
    success: true,
    reviewId: rev.id,
    newTrustScore: contributor?.trust_score ?? 50
  }
}
