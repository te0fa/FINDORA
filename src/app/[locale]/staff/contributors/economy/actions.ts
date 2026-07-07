'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateRecruitmentSettings(params: {
  maxSlots: number
  takenSlots: number
  closesAt: string
  isActive: boolean
}) {
  const db = createAdminClient()

  // Find the active limit
  const { data: limit } = await db.from('contributor_scarcity_limits')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (limit) {
    // Update existing active limit
    const { error } = await db.from('contributor_scarcity_limits')
      .update({
        max_slots: params.maxSlots,
        taken_slots: params.takenSlots,
        closes_at: params.closesAt,
        is_active: params.isActive
      })
      .eq('id', limit.id)

    if (error) return { success: false, error: error.message }
  } else {
    // Insert new limit
    const { error } = await db.from('contributor_scarcity_limits')
      .insert({
        max_slots: params.maxSlots,
        taken_slots: params.takenSlots,
        closes_at: params.closesAt,
        is_active: params.isActive
      })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/[locale]/contributors', 'page')
  revalidatePath('/[locale]/staff/contributors/economy', 'page')
  return { success: true }
}

export async function updateEconomyConfig(configs: { config_key: string, value: any }[]) {
  const db = createAdminClient()
  for (const cfg of configs) {
    const { error } = await db.from('economy_config')
      .update({ value: cfg.value })
      .eq('config_key', cfg.config_key)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath('/[locale]/contributors', 'page')
  revalidatePath('/[locale]/staff/contributors/economy', 'page')
  return { success: true }
}

export async function updateContributorLevelsAction(levels: any[]) {
  const db = createAdminClient()
  for (const lvl of levels) {
    const { error } = await db.from('contributor_levels')
      .update({
        name_ar: lvl.name_ar,
        name_en: lvl.name_en,
        required_active_referrals: Number(lvl.required_active_referrals),
        cash_multiplier: Number(lvl.cash_multiplier),
        monthly_cap_egp: lvl.monthly_cap_egp ? Number(lvl.monthly_cap_egp) : null,
        badge_icon: lvl.badge_icon,
        badge_color: lvl.badge_color
      })
      .eq('level_number', lvl.level_number)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath('/[locale]/contributors', 'page')
  revalidatePath('/[locale]/staff/contributors/economy', 'page')
  return { success: true }
}
