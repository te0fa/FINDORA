'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { executeOnlineResearch } from '@/lib/agents/research/run-online-research'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'

async function getAuthorizedResearchStaff(locale: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staffMember = await getStaffMemberByAuthUserId(user.id)

  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(staffMember)

  if (!permissions.canTriggerResearch) {
    redirect(`/${locale}/staff/dashboard`)
  }

  return { staffMember, permissions }
}

export async function handleManualResearchTrigger(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember } = await getAuthorizedResearchStaff(locale)

  const supabase = await createClient()

  try {
    const { data: job, error } = await (supabase as any)
      .from('jobs')
      .select('id')
      .eq('request_id', requestId)
      .eq('job_type', 'online_research')
      .eq('status', 'claimed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!job?.id) {
      redirect(`/${locale}/staff/workspace/${requestId}?error=no_active_research_job`)
    }

    const triggerResult = await executeOnlineResearch(job.id, requestId)

    // AUDIT LOG (Non-blocking)
    const { logOperationalEvent } = await import('@/lib/dal/audit')
    
    await logOperationalEvent({
      requestId: requestId,
      staffId: staffMember.id,
      eventName: 'MANUAL_RESEARCH_TRIGGERED',
      metadata: { 
        job_id: job.id,
        trigger_result: triggerResult
      }
    });

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    revalidatePath(`/${locale}/staff/queue`)
    redirect(`/${locale}/staff/workspace/${requestId}?success=research_triggered`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=research_trigger_failed`)
  }
}