'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { buildRequestDeleteBackupAdmin, hardDeleteRequestWithBackupAdmin } from '@/lib/dal/archive'
import { archiveRequestAdmin, restoreRequestAdmin } from '@/lib/dal/requests'

async function ensurePermissions(required: 'manage' | 'hard_delete' = 'manage') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Forbidden')

  const permissions = getStaffUiPermissions(staff)
  
  if (required === 'hard_delete' && !permissions.canHardDelete) {
    throw new Error('Forbidden: Hard delete requires Admin/Owner role')
  }
  
  if (required === 'manage' && !permissions.canManageArchive) {
    throw new Error('Forbidden: Archive management access required')
  }

  return { user, staff, permissions }
}

export async function archiveRequestAction(requestId: string, reason?: string) {
  try {
    const { user } = await ensurePermissions('manage')
    await archiveRequestAdmin(requestId, user.id, reason || 'Manual archive via Archive Center')
    revalidatePath('/[locale]/staff/archive', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function restoreRequestAction(requestId: string) {
  try {
    const { user } = await ensurePermissions('manage')
    await restoreRequestAdmin(requestId, user.id)
    revalidatePath('/[locale]/staff/archive', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createBackupAction(requestId: string) {
  try {
    const { user } = await ensurePermissions('manage')
    const backup = await buildRequestDeleteBackupAdmin(requestId, user.id)
    revalidatePath('/[locale]/staff/archive', 'page')
    return { success: true, request_code: backup?.request_code }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteRequestAction(requestId: string, backupId: string, confirmationCode: string, expectedCode: string, notes?: string) {
  try {
    if (confirmationCode !== expectedCode) {
      throw new Error(`Confirmation code mismatch. Expected: ${expectedCode}`)
    }

    const { user } = await ensurePermissions('hard_delete')
    await hardDeleteRequestWithBackupAdmin({
      requestId,
      backupId,
      actorUserId: user.id,
      notes
    })

    revalidatePath('/[locale]/staff/archive', 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function handleBulkPrepareBackupsAction(requestIds: string[]) {
  try {
    const { user } = await ensurePermissions('manage')
    
    let created = 0
    let skipped = 0
    let failed = 0
    const details: any[] = []

    for (const id of requestIds) {
      try {
        await buildRequestDeleteBackupAdmin(id, user.id)
        created++
        details.push({ id, status: 'created' })
      } catch (err: any) {
        failed++
        details.push({ id, status: 'failed', reason: err.message })
      }
    }

    revalidatePath('/[locale]/staff/archive', 'page')
    return {
      success: true,
      created,
      skipped,
      failed,
      details
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
