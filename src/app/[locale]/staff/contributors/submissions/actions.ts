'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reviewSubmissionAction(submissionId: string, action: 'approve' | 'reject') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

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

  // 2. If approved, calculate dynamic rewards based on role multipliers and level multipliers
  if (action === 'approve') {
    // A. Fetch contributor
    const { data: contributor } = await (supabase
      .from('contributors') as any)
      .select('id, role, active_referrals, trust_score')
      .eq('id', submission.contributor_id)
      .single()

    if (contributor) {
      // B. Load config multipliers and base rates
      const { data: configRows } = await supabase.from('economy_config').select('config_key, value')
      const roleMultipliers = (configRows?.find(r => r.config_key === 'role_multipliers')?.value || { field_scout: 1.2, store_insider: 1.0, casual: 0.8 }) as any

      // Get or create wallet
      let { data: wallet } = await (supabase
        .from('contributor_wallets') as any)
        .select('id, points_balance, lifetime_earned_egp, balance_egp')
        .eq('contributor_id', submission.contributor_id)
        .single()

      if (!wallet) {
        const { data: newWallet } = await (supabase
          .from('contributor_wallets') as any)
          .insert({ contributor_id: submission.contributor_id, points_balance: 0, lifetime_earned_egp: 0, balance_egp: 0 })
          .select('id, points_balance, lifetime_earned_egp, balance_egp')
          .single()
        wallet = newWallet
      }

      // C. Determine Level Multiplier from contributor_levels table
      const { data: allLevels } = await (supabase
        .from('contributor_levels') as any)
        .select('*')
        .order('level_number', { ascending: true })

      const activeReferrals = contributor.active_referrals || 0
      const trustScore = contributor.trust_score || 50
      const points = wallet?.points_balance || 0

      let currentLevel = allLevels?.[0]
      if (allLevels) {
        for (const lvl of allLevels) {
          if (activeReferrals >= lvl.required_active_referrals && 
              trustScore >= (lvl.required_trust_score || 0) &&
              points >= (lvl.required_lifetime_points || 0)) {
            currentLevel = lvl
          }
        }
      }
      const levelMultiplier = currentLevel?.cash_multiplier || 1.0

      // D. Calculate cash and points rewards
      let cashEarned = 0
      let pointsEarned = 10

      if (contributor.role === 'field_scout') {
        const baseRate = 30
        const roleMultiplier = roleMultipliers.field_scout || 1.2
        cashEarned = Math.floor(baseRate * roleMultiplier * levelMultiplier)
        pointsEarned = 10
      } else if (contributor.role === 'store_insider') {
        const baseRate = 20
        const roleMultiplier = roleMultipliers.store_insider || 1.0
        cashEarned = Math.floor(baseRate * roleMultiplier * levelMultiplier)
        pointsEarned = 10
      } else if (contributor.role === 'casual') {
        // Count total verified submissions for this casual user
        const { count } = await supabase.from('contributor_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('contributor_id', submission.contributor_id)
          .eq('status', 'verified')
        
        const verifiedCount = (count || 0) + 1 // Add this verified task
        const roleMultiplier = roleMultipliers.casual || 0.8

        if (verifiedCount >= 10) {
          // Unlocked cash conversions!
          const baseRate = 10
          cashEarned = Math.floor(baseRate * roleMultiplier * levelMultiplier)
          pointsEarned = 10
        } else {
          // Points only
          cashEarned = 0
          pointsEarned = Math.floor(10 * roleMultiplier)
        }
      }

      if (wallet) {
        // E. Log wallet transaction
        await (supabase
          .from('wallet_transactions') as any)
          .insert({
            contributor_id: submission.contributor_id,
            wallet_id: wallet.id,
            tx_type: 'task_reward',
            amount_egp: cashEarned,
            amount_points: pointsEarned,
            metadata: { source: 'supply_submission', submission_id: submission.id, levelMultiplier }
          })

        // F. Update wallet totals manually for robust UI reactivity
        await (supabase
          .from('contributor_wallets') as any)
          .update({
            lifetime_earned_egp: (wallet.lifetime_earned_egp || 0) + cashEarned,
            balance_egp: (wallet.balance_egp || 0) + cashEarned,
            points_balance: (wallet.points_balance || 0) + pointsEarned
          })
          .eq('id', wallet.id)
      }
    }
  }

  revalidatePath('/staff/contributors/submissions')
  revalidatePath('/[locale]/contributors/dashboard', 'page')
  revalidatePath('/[locale]/contributors/wallet', 'page')
  return { success: true }
}
