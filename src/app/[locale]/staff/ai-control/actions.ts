'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { 
  updateAIFeatureConfig, 
  assignAIManagerRole, 
  revokeAIManagerRole 
} from '@/lib/dal/ai-control'

async function checkPermission(requireAdmin = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (requireAdmin) {
    if (staff.staff_role !== 'admin') {
      throw new Error('Forbidden: Admin role required')
    }
  } else {
    if (!permissions.canManageAI) {
      throw new Error('Forbidden: AI Manager role required')
    }
  }
  return { user, staff }
}

export async function toggleAIFeatureAction(featureKey: string, status: 'enabled' | 'disabled' | 'restricted', value?: string) {
  await checkPermission()
  await updateAIFeatureConfig(featureKey, { status, value })
  revalidatePath('/[locale]/staff/ai-control', 'page')
}

export async function updateAILimitsAction(featureKey: string, dailyLimit: number | null, monthlyLimit: number | null) {
  await checkPermission()
  await updateAIFeatureConfig(featureKey, { daily_limit: dailyLimit, monthly_limit: monthlyLimit })
  revalidatePath('/[locale]/staff/ai-control', 'page')
}

export async function resetAIFeatureDefaultsAction(featureKey: string) {
  await checkPermission()
  
  // Default limits and values for features
  const defaultLimits: Record<string, { daily: number; monthly: number }> = {
    flag_ai_parse_request: { daily: 1000, monthly: 30000 },
    flag_ai_pricing_suggestions: { daily: 1000, monthly: 30000 },
    flag_ai_rfq_generation: { daily: 200, monthly: 6000 },
    flag_ai_report_chat: { daily: 500, monthly: 15000 },
    flag_ai_support_chat: { daily: 500, monthly: 15000 },
    flag_ai_receipt_ocr: { daily: 200, monthly: 6000 },
    flag_ai_demand_expansion: { daily: 500, monthly: 15000 },
    flag_ai_copilot_agents: { daily: 2000, monthly: 60000 },
    flag_ai_intake_review: { daily: 1000, monthly: 30000 },
  }

  const limits = defaultLimits[featureKey] || { daily: 100, monthly: 1000 }
  await updateAIFeatureConfig(featureKey, { 
    status: 'enabled', 
    daily_limit: limits.daily, 
    monthly_limit: limits.monthly,
    value: 'true'
  })
  revalidatePath('/[locale]/staff/ai-control', 'page')
}

export async function assignAIManagerRoleAction(staffMemberId: string) {
  await checkPermission(true) // Admin only
  await assignAIManagerRole(staffMemberId)
  revalidatePath('/[locale]/staff/ai-control', 'page')
}

export async function revokeAIManagerRoleAction(staffMemberId: string) {
  await checkPermission(true) // Admin only
  await revokeAIManagerRole(staffMemberId)
  revalidatePath('/[locale]/staff/ai-control', 'page')
}
