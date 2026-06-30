/**
 * FINDORA Economy OS — Contributors DAL
 * Core data access layer for contributor profiles, dashboard data, leaderboard
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:contributors');


export interface ContributorProfile {
  id: string
  auth_user_id: string
  role: 'field_scout' | 'store_insider' | 'casual'
  status: 'pending' | 'approved' | 'active' | 'suspended' | 'under_review' | 'frozen'
  full_name: string
  phone_number: string
  referral_code: string
  referred_by_id: string | null
  referral_count: number
  active_referral_count: number
  trust_score: number
  network_health_score: number
  earning_multiplier: number
  monthly_cap_egp: number | null
  phone_verified_at: string | null
  id_verified_at: string | null
  approved_at: string | null
  last_activity_at: string | null
  created_at: string
}

export interface ContributorDashboardData {
  profile: ContributorProfile
  streak: {
    daily_streak_count: number
    weekly_streak_count: number
    monthly_streak_count: number
    best_daily_streak: number
    streak_bonus_active: boolean
    streak_multiplier: number
  } | null
  challenge: {
    target_count: number
    current_active_count: number
    completed_at: string | null
    is_active: boolean
  } | null
  badges: Array<{
    badge_type: string
    badge_label_en: string
    badge_label_ar: string
    earned_at: string
  }>
  alerts: Array<{
    id: string
    alert_type: string
    title_en: string
    title_ar: string
    body_en: string | null
    body_ar: string | null
    is_read: boolean
    created_at: string
  }>
  risk: {
    risk_score: number
    account_state: string
  } | null
}

/**
 * Get contributor profile by auth_user_id (session user)
 */
export async function getContributorByAuthUserId(
  authUserId: string
): Promise<ContributorProfile | null> {
  const db = createAdminClient()
  const { data, error } = await (db as any).from('contributors')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) {
    log.error('[CONTRIBUTORS DAL] getContributorByAuthUserId:', error.message)
    return null
  }
  return data as ContributorProfile | null
}

/**
 * Get contributor profile by ID
 */
export async function getContributorById(
  contributorId: string
): Promise<ContributorProfile | null> {
  const db = createAdminClient()
  const { data, error } = await (db as any).from('contributors')
    .select('*')
    .eq('id', contributorId)
    .maybeSingle()
  if (error) return null
  return data as ContributorProfile | null
}

/**
 * Get contributor profile by referral code
 */
export async function getContributorByReferralCode(
  code: string
): Promise<{ id: string; full_name: string; status: string } | null> {
  const db = createAdminClient()
  const { data, error } = await (db as any).from('contributors')
    .select('id, full_name, status')
    .eq('referral_code', code.toUpperCase())
    .maybeSingle()
  if (error || !data) return null
  return data
}

/**
 * Full dashboard data bundle — single call for dashboard page
 */
export async function getContributorDashboard(
  contributorId: string
): Promise<ContributorDashboardData | null> {
  const db = createAdminClient()

  const [
    profileRes,
    streakRes,
    challengeRes,
    badgesRes,
    alertsRes,
    riskRes
  ] = await Promise.all([
    (db as any).from('contributors').select('*').eq('id', contributorId).single(),
    (db as any).from('contributor_streaks').select('*').eq('contributor_id', contributorId).maybeSingle(),
    (db as any).from('referral_challenges').select('*').eq('contributor_id', contributorId).maybeSingle(),
    (db as any).from('contributor_badges')
      .select('badge_type, badge_label_en, badge_label_ar, earned_at')
      .eq('contributor_id', contributorId)
      .order('earned_at', { ascending: false }),
    (db as any).from('contributor_alerts')
      .select('*')
      .eq('contributor_id', contributorId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5),
    (db as any).from('contributor_risk_scores')
      .select('risk_score, account_state')
      .eq('contributor_id', contributorId)
      .maybeSingle()
  ])

  if (profileRes.error || !profileRes.data) return null

  return {
    profile: profileRes.data as ContributorProfile,
    streak: streakRes.data ?? null,
    challenge: challengeRes.data ?? null,
    badges: badgesRes.data ?? [],
    alerts: alertsRes.data ?? [],
    risk: riskRes.data ?? null
  }
}

/**
 * Leaderboard: top contributors by active_referral_count this month
 */
export async function getLeaderboard(limit = 10): Promise<Array<{
  rank: number
  contributor_id: string
  full_name: string
  active_referral_count: number
  trust_score: number
  role: string
}>> {
  const db = createAdminClient()
  const { data, error } = await (db as any).from('contributors')
    .select('id, full_name, active_referral_count, trust_score, role')
    .in('status', ['active', 'approved'])
    .order('active_referral_count', { ascending: false })
    .order('trust_score', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((c: any, i: number) => ({
    rank: i + 1,
    contributor_id: c.id,
    full_name: c.full_name,
    active_referral_count: c.active_referral_count,
    trust_score: c.trust_score,
    role: c.role
  }))
}

/**
 * Network health calculation
 */
export async function getNetworkHealth(contributorId: string): Promise<{
  total_referrals: number
  active_referrals: number
  health_pct: number
  decay_multiplier: number
} | null> {
  const db = createAdminClient()
  const { data, error } = await (db as any).from('contributors')
    .select('referral_count, active_referral_count, earning_multiplier')
    .eq('id', contributorId)
    .single()

  if (error || !data) return null

  const healthPct = data.referral_count > 0
    ? Math.round((data.active_referral_count / data.referral_count) * 100)
    : 100

  return {
    total_referrals: data.referral_count,
    active_referrals: data.active_referral_count,
    health_pct: healthPct,
    decay_multiplier: Number(data.earning_multiplier)
  }
}

/**
 * Register new contributor (called from /contributors/apply)
 */
export async function createContributorApplication(params: {
  authUserId: string
  fullName: string
  phoneNumber: string
  role: 'field_scout' | 'store_insider' | 'casual'
  governorate?: string
  referralCode?: string
}): Promise<{ id: string; referral_code: string } | { error: string }> {
  const db = createAdminClient()

  // Resolve referrer if code provided
  let referredById: string | null = null
  if (params.referralCode) {
    const { data: referrer } = await (db as any).from('contributors')
      .select('id, status')
      .eq('referral_code', params.referralCode.toUpperCase())
      .maybeSingle()

    if (referrer && ['approved', 'active'].includes(referrer.status)) {
      referredById = referrer.id
    }
  }

  const { data, error } = await (db as any).from('contributors')
    .insert({
      auth_user_id: params.authUserId,
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      role: params.role,
      governorate: params.governorate ?? null,
      referred_by_id: referredById,
      status: 'pending',
      referral_code: '' // auto-generated by DB trigger
    })
    .select('id, referral_code')
    .single()

  if (error) return { error: error.message }
  return data
}

/**
 * Mark alert as read
 */
export async function markAlertRead(alertId: string): Promise<void> {
  const db = createAdminClient()
  await (db as any).from('contributor_alerts')
    .update({ is_read: true })
    .eq('id', alertId)
}

/**
 * HR: list pending verification requests
 */
export async function listPendingVerifications(filters: {
  limit?: number
  offset?: number
}): Promise<{ items: any[]; total: number }> {
  const db = createAdminClient()
  const { data, count, error } = await (db as any).from('contributor_verification_requests')
    .select('*, contributor:contributors(full_name, phone_number, role, status)', { count: 'exact' })
    .eq('hr_decision', 'pending')
    .order('created_at', { ascending: true })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 20) - 1)

  if (error) return { items: [], total: 0 }
  return { items: data ?? [], total: count ?? 0 }
}

/**
 * HR: approve contributor
 */
export async function hrApproveContributor(
  contributorId: string,
  reviewRequestId: string,
  staffId: string,
  notes?: string
): Promise<void> {
  const db = createAdminClient()

  await Promise.all([
    (db as any).from('contributors')
      .update({ status: 'active', approved_at: new Date().toISOString() })
      .eq('id', contributorId),
    (db as any).from('contributor_verification_requests')
      .update({
        hr_decision: 'approved',
        hr_reviewer_staff_id: staffId,
        hr_notes: notes ?? null,
        hr_decided_at: new Date().toISOString()
      })
      .eq('id', reviewRequestId),
    // Create welcome alert
    (db as any).from('contributor_alerts').insert({
      contributor_id: contributorId,
      alert_type: 'hr_decision',
      title_en: '🎉 Application Approved!',
      title_ar: '🎉 تم قبول طلبك!',
      body_en: 'Your contributor application has been approved. Start earning now!',
      body_ar: 'تم قبول طلبك كمساهم. ابدأ الكسب الآن!'
    })
  ])
}
