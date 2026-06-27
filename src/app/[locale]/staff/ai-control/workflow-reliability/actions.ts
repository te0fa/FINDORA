'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/dal/customers'
import { getStaffMemberByAuthUserId } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { retryFailedWorkflow } from '@/lib/workflow/orchestrator'

async function checkStaffAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Forbidden')

  return staff
}

export async function retryWorkflowAction(requestId: string, locale: string) {
  await checkStaffAuth()
  
  await retryFailedWorkflow(requestId)
  
  revalidatePath(`/${locale}/staff/ai-control/workflow-reliability`)
}
