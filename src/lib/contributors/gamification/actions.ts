'use server'

import { createClient } from '@/lib/supabase/server'

export async function processGamificationEvent(contributorId: string, eventType: 'submission' | 'referral') {
  const supabase = await createClient()

  // 1. Update Streaks (Only on Submission)
  if (eventType === 'submission') {
    let { data: streak } = await (supabase
      .from('contributor_streaks') as any)
      .select('*')
      .eq('contributor_id', contributorId)
      .single()

    const today = new Date().toISOString().split('T')[0]
    
    if (!streak) {
      // First time
      await (supabase as any).from('contributor_streaks').insert({
        contributor_id: contributorId,
        daily_streak_count: 1,
        best_daily_streak: 1,
        last_active_date: today,
        streak_bonus_active: false
      })
    } else {
      const lastActive = streak.last_active_date
      if (lastActive !== today) {
        const lastActiveDate = new Date(lastActive)
        const currentDate = new Date(today)
        const diffTime = Math.abs(currentDate.getTime() - lastActiveDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        let newStreakCount = streak.daily_streak_count
        
        if (diffDays === 1) {
          newStreakCount += 1 // Kept streak alive
        } else {
          newStreakCount = 1 // Streak broken
        }

        const newBest = Math.max(streak.best_daily_streak, newStreakCount)
        const bonusActive = newStreakCount >= 7

        await (supabase as any).from('contributor_streaks').update({
          daily_streak_count: newStreakCount,
          best_daily_streak: newBest,
          last_active_date: today,
          streak_bonus_active: bonusActive,
          streak_multiplier: bonusActive ? 1.15 : 1.00
        }).eq('contributor_id', contributorId)
      }
    }
  }

  // 2. Evaluate Badges
  // For example: First Submission Badge
  if (eventType === 'submission') {
    const { count } = await (supabase as any).from('contributor_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('contributor_id', contributorId)

    if (count === 1) {
      await awardBadge(contributorId, 'first_submission', 'First Blood', 'أول خطوة')
    } else if (count === 50) {
      await awardBadge(contributorId, 'market_expert', 'Market Expert', 'خبير السوق')
    }
  }
}

async function awardBadge(contributorId: string, type: string, labelEn: string, labelAr: string) {
  const supabase = await createClient()
  await (supabase as any).from('contributor_badges').insert({
    contributor_id: contributorId,
    badge_type: type,
    badge_label_en: labelEn,
    badge_label_ar: labelAr,
    metadata: { awarded_via: 'auto' }
  }).select().single()
}

// Manual Admin overrides
export async function adminOverrideStreak(contributorId: string, newStreak: number) {
  const supabase = await createClient()
  const bonusActive = newStreak >= 7
  await (supabase as any).from('contributor_streaks').update({
    daily_streak_count: newStreak,
    streak_bonus_active: bonusActive,
    streak_multiplier: bonusActive ? 1.15 : 1.00
  }).eq('contributor_id', contributorId)
  return { success: true }
}

export async function adminAwardBadge(contributorId: string, labelEn: string, labelAr: string) {
  const type = `custom_${Date.now()}`
  await awardBadge(contributorId, type, labelEn, labelAr)
  return { success: true }
}
