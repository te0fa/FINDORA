'use server'

import { 
  assignReviewerToRequest, 
  unassignReviewerFromRequest, 
  autoAssignReviewerToRequest,
  getStaffMemberByAuthUserId,
  getStaffUiPermissions
} from '@/lib/dal/staff'
import { archiveRequestAdmin, restoreRequestAdmin } from '@/lib/dal/requests'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/dal/customers'
import { resolveRequestState } from '@/lib/dal/lifecycle'
import { getStaffActionPermissions } from '@/lib/workflow/action-permissions'

async function getStaffAndPermissions(locale: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')
  
  const permissions = getStaffUiPermissions(staff)
  return { staff, permissions, locale }
}

async function getActionPermissions(requestId: string, locale: string) {
  const { staff, permissions } = await getStaffAndPermissions(locale)
  const adminClient = await createAdminClient()
  
  const { data: request } = await adminClient
    .from('requests')
    .select('id, current_status, reviewer_decision, is_archived, assigned_reviewer_staff_id')
    .eq('id', requestId)
    .single()
    
  if (!request) throw new Error('Request not found')

  const { data: uiStatus } = await adminClient
    .from('v_request_ui_status')
    .select('client_released_at, snapshot_count')
    .eq('request_id', requestId)
    .maybeSingle()

  const state = resolveRequestState({
    ...request,
    client_released_at: uiStatus?.client_released_at
  })

  const actionPermissions = getStaffActionPermissions({
    staff,
    permissions,
    state,
    request,
    snapshotCount: uiStatus?.snapshot_count || 0
  })

  return { staff, actionPermissions }
}

export async function handleAssignReviewer(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const reviewerId = formData.get('reviewerId') as string
  const locale = formData.get('locale') as string || 'en'

  const { staff, permissions } = await getStaffAndPermissions(locale)
  if (!permissions.isAdmin) throw new Error('Admin only')

  await assignReviewerToRequest({
    requestId,
    reviewerStaffId: reviewerId,
    assignedByStaffId: staff.id
  })

  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleAutoAssignReviewer(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string || 'en'

  const { staff, permissions } = await getStaffAndPermissions(locale)
  if (!permissions.isAdmin) throw new Error('Admin only')

  await autoAssignReviewerToRequest(requestId, staff.id)

  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleUnassignReviewer(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string || 'en'

  const { staff, permissions } = await getStaffAndPermissions(locale)
  if (!permissions.isAdmin) throw new Error('Admin only')

  await unassignReviewerFromRequest(requestId, staff.id)

  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleArchiveRequest(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const reason = formData.get('reason') as string
  const locale = formData.get('locale') as string || 'en'

  const { staff, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canMoveToArchive) {
    throw new Error('BLOCK: Unauthorized archive action or request is not in a terminal state.')
  }

  await archiveRequestAdmin(requestId, staff.auth_user_id, reason)

  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleRestoreRequest(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string || 'en'

  const { staff, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canRestoreArchive) {
    throw new Error('BLOCK: Unauthorized restore action.')
  }

  await restoreRequestAdmin(requestId, staff.auth_user_id)

  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleBulkArchiveRequests(requestIds: string[], reason: string, locale: string) {
  if (!requestIds || requestIds.length === 0) return
  const { staff } = await getStaffAndPermissions(locale)
  for (const id of requestIds) {
    try {
      await archiveRequestAdmin(id, staff.auth_user_id, reason)
    } catch (e) {
      console.error(`Failed to archive request ${id}:`, e)
    }
  }
  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleBulkRestoreRequests(requestIds: string[], locale: string) {
  if (!requestIds || requestIds.length === 0) return
  const { staff } = await getStaffAndPermissions(locale)
  for (const id of requestIds) {
    try {
      await restoreRequestAdmin(id, staff.auth_user_id)
    } catch (e) {
      console.error(`Failed to restore request ${id}:`, e)
    }
  }
  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleBulkDeleteRequests(requestIds: string[], locale: string) {
  if (!requestIds || requestIds.length === 0) return
  const adminClient = await createAdminClient()
  await adminClient.from('requests').update({
    is_soft_deleted: true,
    soft_deleted_at: new Date().toISOString(),
    soft_delete_reason: 'Bulk deleted by admin'
  }).in('id', requestIds)
  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleBulkAssignReviewer(requestIds: string[], reviewerId: string | null, locale: string) {
  if (!requestIds || requestIds.length === 0) return
  const { staff, permissions } = await getStaffAndPermissions(locale)
  if (!permissions.isAdmin) throw new Error('Admin only')

  for (const id of requestIds) {
    try {
      if (reviewerId) {
        await assignReviewerToRequest({
          requestId: id,
          reviewerStaffId: reviewerId,
          assignedByStaffId: staff.id
        })
      } else {
        await unassignReviewerFromRequest(id, staff.id)
      }
    } catch (e) {
      console.error(`Failed to assign/unassign reviewer for request ${id}:`, e)
    }
  }
  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
}
