/**
 * FINDORA Economy OS — Gamification Layer
 * Streaks, badges, challenges, alerts — no financial operations here
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Update daily streak when contributor completes an activity
 */
export async function updateDailyStreak(contributorId: string): Promise<void> {
  const db = createAdminClient()

  const { data: streak } = await (db
    .from('contributor_streaks') as any)
    .select('*')
    .eq('contributor_id', contributorId)
    .maybeSingle()

  if (!streak) return

  const today = new Date().toISOString().split('T')[0]
  const lastActive = (streak as any).last_active_date

  // Already counted today
  if (lastActive === today) return

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const isConsecutive = lastActive === yesterday

  const newDailyCount = isConsecutive ? (streak as any).daily_streak_count + 1 : 1
  const bonusActive = newDailyCount >= 7
  let streakMultiplier = 1.0
  if (newDailyCount >= 30) streakMultiplier = 1.2
  else if (newDailyCount >= 7) streakMultiplier = 1.1

  await (db.from('contributor_streaks') as any).update({
    daily_streak_count: newDailyCount,
    best_daily_streak: Math.max(newDailyCount, (streak as any).best_daily_streak),
    last_active_date: today,
    streak_bonus_active: bonusActive,
    streak_multiplier: streakMultiplier,
    updated_at: new Date().toISOString()
  }).eq('contributor_id', contributorId)

  // Award streak badge if reached 7 days
  if (newDailyCount === 7) {
    await (db.from('contributor_badges') as any).insert({
      contributor_id: contributorId,
      badge_type: 'streak_7',
      badge_label_en: '🔥 7-Day Streak',
      badge_label_ar: '🔥 نشاط 7 أيام متتالية',
      metadata: { streak_count: 7 }
    }).onConflict('contributor_id, badge_type').ignore()
  }

  if (newDailyCount === 30) {
    await (db.from('contributor_badges') as any).insert({
      contributor_id: contributorId,
      badge_type: 'streak_30',
      badge_label_en: '⚡ 30-Day Power Streak',
      badge_label_ar: '⚡ نشاط 30 يومًا متتالية',
      metadata: { streak_count: 30 }
    }).onConflict('contributor_id, badge_type').ignore()
  }
}

import { processReward } from './wallet'

/**
 * Handle the 'First Win' Game Loop Stage
 */
export async function handleFirstTaskWin(contributorId: string): Promise<void> {
  const db = createAdminClient()
  const { data, error } = await (db.from('contributor_badges') as any).insert({
    contributor_id: contributorId,
    badge_type: 'first_task',
    badge_label_en: '✅ First Task Complete',
    badge_label_ar: '✅ أول مهمة مكتملة'
  }).select('id').maybeSingle()

  // If badge was just inserted (meaning this is truly their first task)
  if (data && !error) {
    // Award 500 First Win Points
    await processReward({
      contributorId,
      actionType: 'task_reward', // You can map this to a specific type if needed
      baseAmountEgp: 0,
      baseAmountPoints: 500,
      referenceType: 'task',
      referenceId: 'first_win_bonus',
      descriptionEn: 'First Win Bonus',
      descriptionAr: 'مكافأة أول نجاح'
    })
  }
}

/**
 * Check and update referral challenge progress
 */
export async function syncChallengeProgress(
  contributorId: string,
  activeReferrals: number
): Promise<void> {
  const db = createAdminClient()

  const { data: challenge } = await (db
    .from('referral_challenges') as any)
    .select('*')
    .eq('contributor_id', contributorId)
    .eq('is_active', true)
    .maybeSingle()

  if (!challenge) return

  const wasCompleted = !!(challenge as any).completed_at
  const isNowComplete = activeReferrals >= (challenge as any).target_count

  await (db.from('referral_challenges') as any).update({
    current_active_count: activeReferrals,
    completed_at: isNowComplete && !wasCompleted ? new Date().toISOString() : (challenge as any).completed_at
  }).eq('id', (challenge as any).id)

  // Create unlock available alert if newly completed
  if (isNowComplete && !wasCompleted) {
    await (db.from('contributor_alerts') as any).insert({
      contributor_id: contributorId,
      alert_type: 'tier_upgrade',
      title_en: '🏆 Challenge Complete!',
      title_ar: '🏆 اكتملت التحدي!',
      body_en: `You've reached ${activeReferrals} active referrals! New capabilities are now unlocked.`,
      body_ar: `وصلت إلى ${activeReferrals} إحالة نشطة! تم فتح قدرات جديدة.`
    })
  }
}

/**
 * Create network decay warning alert
 */
export async function createDecayAlert(
  contributorId: string,
  activeReferrals: number,
  previousActive: number
): Promise<void> {
  const db = createAdminClient()
  const dropped = previousActive - activeReferrals

  if (dropped <= 0) return

  await (db.from('contributor_alerts') as any).insert({
    contributor_id: contributorId,
    alert_type: 'network_decay',
    title_en: `⚠️ ${dropped} referral(s) became inactive`,
    title_ar: `⚠️ ${dropped} إحالة أصبحت غير نشطة`,
    body_en: `Your active referral count dropped to ${activeReferrals}. This may affect your earning tier.`,
    body_ar: `عدد إحالاتك النشطة انخفض إلى ${activeReferrals}. هذا قد يؤثر على مستوى أرباحك.`,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
  })
}

/**
 * Bulk check and award badges based on current active referral count
 */
export async function syncBadges(
  contributorId: string,
  activeReferrals: number
): Promise<void> {
  const db = createAdminClient()
  await (db as any).rpc('fn_check_award_badges', {
    p_contributor_id: contributorId,
    p_active_referrals: activeReferrals
  })
}
