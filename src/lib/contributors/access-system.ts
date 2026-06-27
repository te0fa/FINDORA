/**
 * FINDORA Economy OS — Access System
 * Referrals = capability unlocks, NOT direct cash rewards.
 * This module resolves what a contributor can do based on their tier.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface ContributorTier {
  level_number: number
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  cash_multiplier: number
  monthly_cap_egp: number | null
  required_active_referrals: number
  unlocked_features: ContributorFeatures
  badge_color: string
  badge_icon: string
}

export interface ContributorFeatures {
  can_earn: boolean
  can_withdraw: boolean          // requires 3 active referrals (Builder+)
  premium_tasks: boolean         // requires 10 active referrals (Network+)
  revenue_share: boolean         // requires 25 active referrals (Legend)
}

export interface AccessStatus {
  current_tier: ContributorTier
  next_tier: ContributorTier | null
  active_referrals: number
  referrals_to_next_unlock: number
  features: ContributorFeatures
  monthly_cap_egp: number | null
  earning_multiplier: number
  stabilizer_multiplier: number
  effective_multiplier: number   // current_tier.multiplier × stabilizer
  locked_features: LockedFeatureInfo[]
}

export interface LockedFeatureInfo {
  feature: string
  label_en: string
  label_ar: string
  unlock_at_referrals: number
  referrals_needed: number
}

/**
 * Resolve the full access status for a contributor
 * This is the primary function used by the dashboard
 */
export async function resolveAccessStatus(
  contributorId: string
): Promise<AccessStatus | null> {
  const db = createAdminClient()

  // Fetch contributor and levels in parallel
  const [contributorRes, levelsRes, stabilizerRes] = await Promise.all([
    (db.from('contributors') as any)
      .select('active_referral_count, earning_multiplier, monthly_cap_egp')
      .eq('id', contributorId)
      .single(),
    (db.from('contributor_levels') as any)
      .select('*')
      .eq('is_active', true)
      .order('level_number', { ascending: true }),
    db.rpc('fn_get_stabilizer_multiplier')
  ])

  if (contributorRes.error || !contributorRes.data) return null
  if (levelsRes.error || !levelsRes.data) return null

  const contributor = contributorRes.data as any
  const levels = levelsRes.data as ContributorTier[]
  const stabilizerMultiplier: number = stabilizerRes.data ?? 1.0
  const activeReferrals = contributor.active_referral_count as number

  // Find current and next tier
  let currentTier = levels[0]
  let nextTier: ContributorTier | null = null

  for (let i = levels.length - 1; i >= 0; i--) {
    if (activeReferrals >= levels[i].required_active_referrals) {
      currentTier = levels[i]
      nextTier = levels[i + 1] ?? null
      break
    }
  }

  const features = currentTier.unlocked_features as ContributorFeatures
  const effectiveMultiplier =
    Number(currentTier.cash_multiplier) * stabilizerMultiplier

  // Compute locked features with unlock instructions
  const lockedFeatures: LockedFeatureInfo[] = []

  if (!features.can_withdraw) {
    const builderTier = levels.find(l => l.required_active_referrals === 3)
    const needed = (builderTier?.required_active_referrals ?? 3) - activeReferrals
    lockedFeatures.push({
      feature: 'can_withdraw',
      label_en: 'Cash Withdrawal',
      label_ar: 'سحب النقود',
      unlock_at_referrals: 3,
      referrals_needed: Math.max(0, needed)
    })
  }

  if (!features.premium_tasks) {
    const networkTier = levels.find(l => l.required_active_referrals === 10)
    const needed = (networkTier?.required_active_referrals ?? 10) - activeReferrals
    lockedFeatures.push({
      feature: 'premium_tasks',
      label_en: 'Premium Tasks',
      label_ar: 'مهام مميزة',
      unlock_at_referrals: 10,
      referrals_needed: Math.max(0, needed)
    })
  }

  if (!features.revenue_share) {
    const legendTier = levels.find(l => l.required_active_referrals === 25)
    const needed = (legendTier?.required_active_referrals ?? 25) - activeReferrals
    lockedFeatures.push({
      feature: 'revenue_share',
      label_en: 'Revenue Share',
      label_ar: 'حصة الإيرادات',
      unlock_at_referrals: 25,
      referrals_needed: Math.max(0, needed)
    })
  }

  return {
    current_tier: currentTier,
    next_tier: nextTier,
    active_referrals: activeReferrals,
    referrals_to_next_unlock: nextTier
      ? Math.max(0, nextTier.required_active_referrals - activeReferrals)
      : 0,
    features,
    monthly_cap_egp: currentTier.monthly_cap_egp,
    earning_multiplier: Number(currentTier.cash_multiplier),
    stabilizer_multiplier: stabilizerMultiplier,
    effective_multiplier: effectiveMultiplier,
    locked_features: lockedFeatures
  }
}

/**
 * Check if a specific feature is unlocked for a contributor
 */
export async function canAccessFeature(
  contributorId: string,
  feature: keyof ContributorFeatures
): Promise<boolean> {
  const db = createAdminClient()

  const { data } = await (db.from('contributors') as any)
    .select('active_referral_count')
    .eq('id', contributorId)
    .single()

  if (!data) return false

  const thresholds: Record<keyof ContributorFeatures, number> = {
    can_earn: 0,
    can_withdraw: 3,
    premium_tasks: 10,
    revenue_share: 25
  }

  return (data as any).active_referral_count >= thresholds[feature]
}

/**
 * Get all tiers for display on landing page / unlock ladder
 */
export async function getAllTiers(): Promise<ContributorTier[]> {
  const db = createAdminClient()
  const { data } = await (db.from('contributor_levels') as any)
    .select('*')
    .eq('is_active', true)
    .order('level_number', { ascending: true })
  return (data as ContributorTier[]) ?? []
}
