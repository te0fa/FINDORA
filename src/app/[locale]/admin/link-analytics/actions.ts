/**
 * src/app/[locale]/admin/link-analytics/actions.ts
 * Server action for client-side date range toggle re-fetch.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import {
  getLinkAttemptSummary,
  getTopRejectedDomains,
  getRecentAttempts,
  type LinkAttemptSummary,
  type TopRejectedDomain,
  type LinkAttemptRow,
} from '@/lib/dal/link-attempts'

async function checkPermission() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.canManageAI && !permissions.isAdmin) {
    throw new Error('Forbidden')
  }
}

export async function getAnalyticsAction(days: 7 | 30): Promise<{
  summary: LinkAttemptSummary
  topRejected: TopRejectedDomain[]
  recent: LinkAttemptRow[]
}> {
  await checkPermission()
  const [summary, topRejected, recent] = await Promise.all([
    getLinkAttemptSummary(days),
    getTopRejectedDomains(days, 20),
    getRecentAttempts(50),
  ])
  return { summary, topRejected, recent }
}
