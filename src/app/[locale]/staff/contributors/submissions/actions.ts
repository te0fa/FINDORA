'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reviewSubmissionAction(submissionId: string, action: 'approve' | 'reject') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Enforce staff check here (Skipped in mock, assuming middleware handles route protection)

  // 1. Update the submission status
  const { data: submission, error } = await (supabase
    .from('contributor_submissions') as any)
    .update({ 
      status: action === 'approve' ? 'verified' : 'rejected',
      verified_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select('id, contributor_id, submission_type')
    .single()

  if (error || !submission) {
    throw new Error(`Failed to update submission: ${error?.message}`)
  }

  // 2. If approved, trigger wallet rewards (Simulated Integration)
  if (action === 'approve') {
    // Fetch contributor role & multiplier
    const { data: contributor } = await (supabase
      .from('contributors') as any)
      .select('role, trust_score')
      .eq('id', submission.contributor_id)
      .single()

    if (contributor) {
      // In a real system, we read the exact 'role_multipliers' from 'economy_config'
      const basePoints = 10
      let multiplier = 1.0
      
      if (contributor.role === 'field_scout') multiplier = 1.2
      else if (contributor.role === 'casual') multiplier = 0.8

      const pointsEarned = Math.floor(basePoints * multiplier)

      // Get or create wallet
      let { data: wallet } = await (supabase
        .from('contributor_wallets') as any)
        .select('id, points_balance')
        .eq('contributor_id', submission.contributor_id)
        .single()

      if (!wallet) {
        // Create if missing
        const { data: newWallet } = await (supabase
          .from('contributor_wallets') as any)
          .insert({ contributor_id: submission.contributor_id })
          .select('id, points_balance')
          .single()
        wallet = newWallet
      }

      if (wallet) {
        // Log transaction (DB trigger automatically updates the wallet points_balance safely)
        await (supabase
          .from('wallet_transactions') as any)
          .insert({
            contributor_id: submission.contributor_id,
            wallet_id: wallet.id,
            tx_type: 'task_reward',
            amount_egp: 0,
            amount_points: pointsEarned,
            metadata: { source: 'supply_submission', submission_id: submission.id }
          })
      }
    }
  }

  revalidatePath('/staff/contributors/submissions')
  return { success: true }
}
