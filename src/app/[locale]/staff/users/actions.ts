'use server'

import { revalidatePath } from 'next/cache'
import { 
  updateStaffMemberStatus, 
  createStaffMember, 
  deleteStaffMember, 
  archiveStaffMember, 
  unarchiveStaffMember 
} from '@/lib/dal/staff'
import { 
  blockCustomer, 
  unblockCustomer, 
  deleteCustomer 
} from '@/lib/dal/customers'
import { createAdminClient } from '@/lib/dal/customers'

export async function handleUpdateStaff(formData: FormData) {
  const staffId = formData.get('staffId') as string
  const role = formData.get('role') as string
  const team = formData.get('team') as string
  const currentActive = formData.get('currentActive') === 'true'
  const isToggle = formData.get('toggleActive') === 'true'
  const active = isToggle ? !currentActive : currentActive
  const locale = formData.get('locale') as string
  
  // New details to update
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const password = formData.get('password') as string

  // Extra roles from multi-select or checkboxes
  const extraRoles = formData.getAll('extra_roles') as string[]

  if (!staffId) return

  const adminClient = await createAdminClient()

  // 1. Update DB profile first
  await updateStaffMemberStatus(staffId, {
    staff_role: role,
    team_code: team,
    is_active: active,
    extra_roles: extraRoles
  })

  if (fullName) {
    await adminClient
      .from('staff_members')
      .update({ full_name: fullName })
      .eq('id', staffId)
  }

  // 2. Resolve Auth User ID to update Auth fields
  const { data: staff } = await adminClient
    .from('staff_members')
    .select('auth_user_id')
    .eq('id', staffId)
    .single()

  if (staff?.auth_user_id) {
    const authData: any = {}
    if (email) authData.email = email
    if (password) authData.password = password
    if (phone) authData.phone = phone
    
    const userMetadata: any = {}
    if (fullName) userMetadata.full_name = fullName
    if (phone) userMetadata.phone = phone
    
    if (Object.keys(userMetadata).length > 0) {
      authData.user_metadata = userMetadata
    }

    if (Object.keys(authData).length > 0) {
      await adminClient.auth.admin.updateUserById(staff.auth_user_id, authData)
    }
  }

  revalidatePath(`/${locale}/staff/users`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handlePromoteToStaff(formData: FormData) {
  const customerId = formData.get('customerId') as string
  const role = formData.get('role') as string
  const team = formData.get('team') as string
  const locale = formData.get('locale') as string

  if (!customerId) return

  const { promoteCustomerToStaff } = await import('@/lib/dal/customers')
  await promoteCustomerToStaff(customerId, role, team)

  revalidatePath(`/${locale}/staff/users`)
  revalidatePath(`/${locale}/staff/dashboard`)
}

export async function handleCreateStaff(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const role = formData.get('role') as string
  const team = formData.get('team') as string
  const extraRoles = formData.getAll('extra_roles') as string[]
  const locale = formData.get('locale') as string

  if (!email || !password || !fullName) {
    throw new Error('All required fields must be filled.')
  }

  await createStaffMember({
    email,
    passwordStr: password,
    fullName,
    role,
    team,
    extraRoles,
    phone
  })

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleDeleteStaff(formData: FormData) {
  const staffId = formData.get('staffId') as string
  const locale = formData.get('locale') as string

  if (!staffId) return

  await deleteStaffMember(staffId)

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleToggleArchiveStaff(formData: FormData) {
  const staffId = formData.get('staffId') as string
  const currentArchived = formData.get('currentArchived') === 'true'
  const locale = formData.get('locale') as string

  if (!staffId) return

  if (currentArchived) {
    await unarchiveStaffMember(staffId)
  } else {
    await archiveStaffMember(staffId)
  }

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleBlockCustomer(formData: FormData) {
  const customerId = formData.get('customerId') as string
  const reason = formData.get('reason') as string || 'No reason provided'
  const locale = formData.get('locale') as string

  if (!customerId) return

  await blockCustomer(customerId, reason)

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleUnblockCustomer(formData: FormData) {
  const customerId = formData.get('customerId') as string
  const locale = formData.get('locale') as string

  if (!customerId) return

  await unblockCustomer(customerId)

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleToggleCustomerArchive(formData: FormData) {
  const customerId = formData.get('customerId') as string
  const currentArchived = formData.get('currentArchived') === 'true'
  const locale = formData.get('locale') as string

  if (!customerId) return

  const adminClient = await createAdminClient()
  await adminClient.from('customers').update({
    is_archived: !currentArchived,
    archived_at: !currentArchived ? new Date().toISOString() : null
  }).eq('id', customerId)

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleDeleteCustomer(formData: FormData) {
  const customerId = formData.get('customerId') as string
  const locale = formData.get('locale') as string

  if (!customerId) return

  await deleteCustomer(customerId)

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleCancelRequest(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const reason = formData.get('reason') as string || 'Cancelled by admin'
  const locale = formData.get('locale') as string

  if (!requestId) return

  const adminClient = await createAdminClient()
  await adminClient.from('requests').update({
    current_status: 'cancelled',
    is_cancelled: true,
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason
  }).eq('id', requestId)

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleReactivateRequest(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string

  if (!requestId) return

  const adminClient = await createAdminClient()
  await adminClient.from('requests').update({
    current_status: 'submitted',
    is_cancelled: false,
    cancelled_at: null,
    cancellation_reason: null
  }).eq('id', requestId)

  revalidatePath(`/${locale}/staff/users`)
}

export async function handleBulkDeleteCustomers(customerIds: string[], locale: string) {
  if (!customerIds || customerIds.length === 0) return
  for (const id of customerIds) {
    try {
      await deleteCustomer(id)
    } catch (e) {
      console.error(`Failed to delete customer ${id}:`, e)
    }
  }
  revalidatePath(`/${locale}/staff/users`)
}

export async function handleBulkToggleArchiveCustomers(customerIds: string[], archive: boolean, locale: string) {
  if (!customerIds || customerIds.length === 0) return
  const adminClient = await createAdminClient()
  await adminClient.from('customers').update({
    is_archived: archive,
    archived_at: archive ? new Date().toISOString() : null
  }).in('id', customerIds)
  revalidatePath(`/${locale}/staff/users`)
}

export async function handleBulkBlockCustomers(customerIds: string[], block: boolean, reason: string, locale: string) {
  if (!customerIds || customerIds.length === 0) return
  for (const id of customerIds) {
    try {
      if (block) {
        await blockCustomer(id, reason)
      } else {
        await unblockCustomer(id)
      }
    } catch (e) {
      console.error(`Failed to toggle block status for customer ${id}:`, e)
    }
  }
  revalidatePath(`/${locale}/staff/users`)
}
