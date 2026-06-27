import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:customers');

import { createAdminClient } from '@/lib/supabase/admin'
export { createAdminClient }

export async function getCustomerByAuthId(authUserId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (error) return null
  return data
}

export async function getCustomerByPhone(normalizedPhone: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .select('*')
    .eq('phone_number_normalized', normalizedPhone)
    .single()

  if (error) return null
  return data
}

/**
 * Idempotently ensures a customer profile exists for a given auth user.
 */
export async function ensureCustomerProfile(authUserId: string, fullName: string, locale: string = 'ar') {
  const adminClient = await createAdminClient()
  
  // 1. Try to find existing by auth_user_id
  const { data: existing } = await adminClient
    .from('customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (existing) return existing

  // 2. Create if missing
  const customerCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`

  const { data, error } = await adminClient
    .from('customers')
    .insert({
      auth_user_id: authUserId,
      full_name: fullName,
      customer_code: customerCode,
      preferred_language: locale,
      status: 'active'
    } as any)
    .select()
    .single()

  if (error) {
    log.error('Error ensuring customer profile:', error)
    return null
  }

  return data
}

/**
 * PHASE 0.5: Upsert Guest Customer
 * Creates or reuses a customer row based on phone_number_normalized.
 */
export async function upsertGuestCustomerByPhone(
  rawPhone: string,
  fullName: string,
  email?: string,
  locale: string = 'ar'
) {
  const adminClient = await createAdminClient()
  const phoneObj = normalizePhone(rawPhone)
  
  if (!phoneObj) {
    throw new Error('Invalid phone number format')
  }

  // 1. Try to find existing by normalized phone
  const { data: existing } = await adminClient
    .from('customers')
    .select('*')
    .eq('phone_number_normalized', phoneObj.normalized)
    .single()

  if (existing) {
    // Optionally backfill missing fields if provided
    const updates: any = {}
    if (!existing.full_name && fullName) updates.full_name = fullName
    if (!existing.email && email) updates.email = email
    
    if (Object.keys(updates).length > 0) {
      const { data: updated } = await adminClient
        .from('customers')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()
      return updated || existing
    }
    return existing
  }

  // 2. Create new guest customer
  const customerCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`

  const { data, error } = await adminClient
    .from('customers')
    .insert({
      auth_user_id: null,
      full_name: fullName,
      customer_code: customerCode,
      preferred_language: locale,
      phone_number_raw: phoneObj.raw,
      phone_number_normalized: phoneObj.normalized,
      email: email || null,
      status: 'active'
    } as any)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * PHASE 0.5: Account Claim Strategy
 * Links an auth user to an existing guest customer by verified normalized phone.
 */
export async function linkAuthUserToCustomer(authUserId: string, normalizedPhone: string) {
  const adminClient = await createAdminClient()

  // Find guest customer with this phone
  const { data: guestCustomer } = await adminClient
    .from('customers')
    .select('*')
    .eq('phone_number_normalized', normalizedPhone)
    .is('auth_user_id', null)
    .single()

  if (guestCustomer) {
    const { data: linkedCustomer, error } = await adminClient
      .from('customers')
      .update({ auth_user_id: authUserId })
      .eq('id', guestCustomer.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return linkedCustomer
  }

  return null
}

/**
 * PHASE 0.5: Free Trial Eligibility
 */
export async function isCustomerEligibleForFreeTrial(customerId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .select('phone_verified_at, free_trial_used_at')
    .eq('id', customerId)
    .single()

  if (error || !data) return false

  return data.phone_verified_at !== null && data.free_trial_used_at === null
}


/**
 * PHASE 0.5: Consume Free Trial
 */
export async function consumeFreeTrial(customerId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .update({ free_trial_used_at: new Date().toISOString() })
    .eq('id', customerId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * PHASE 0.5: Verify Customer Phone Number
 */
export async function verifyCustomerPhone(customerId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .update({ phone_verified_at: new Date().toISOString() })
    .eq('id', customerId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}


/**
 * PHASE 2.0: Get All Customers Admin
 * Fetches all registered customers, verified status, and free trial status.
 */
export async function getAllCustomersAdmin() {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/**
 * PHASE 2.0: Promote Customer to Staff
 * Hires any registered customer as a staff member with a specific role and team.
 */
export async function promoteCustomerToStaff(customerId: string, role: string, team: string) {
  const adminClient = await createAdminClient()
  
  // 1. Fetch customer details
  const { data: customer, error: fetchErr } = await adminClient
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (fetchErr || !customer) throw new Error('Customer not found')
  if (!customer.auth_user_id) throw new Error('Cannot promote guest customer without auth account')

  // 2. Check if already staff
  const { data: existingStaff } = await adminClient
    .from('staff_members')
    .select('id')
    .eq('auth_user_id', customer.auth_user_id)
    .maybeSingle()

  if (existingStaff) {
    // Reactivate and update role/team
    const { data: updated, error: updateErr } = await adminClient
      .from('staff_members')
      .update({
        staff_role: role,
        team_code: team,
        is_active: true
      })
      .eq('id', existingStaff.id)
      .select()
      .single()

    if (updateErr) throw new Error(updateErr.message)
    return updated
  }

  // 3. Insert new staff member
  const { data: newStaff, error: insertErr } = await adminClient
    .from('staff_members')
    .insert({
      auth_user_id: customer.auth_user_id,
      full_name: customer.full_name,
      staff_role: role,
      team_code: team,
      is_active: true
    })
    .select()
    .single()

  if (insertErr) throw new Error(insertErr.message)
  return newStaff
}

export async function blockCustomer(customerId: string, reason: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .update({
      status: 'blocked',
      blocked_at: new Date().toISOString(),
      block_reason: reason
    })
    .eq('id', customerId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function unblockCustomer(customerId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .update({
      status: 'active',
      blocked_at: null,
      block_reason: null
    })
    .eq('id', customerId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function archiveCustomer(customerId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('customers')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('id', customerId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCustomer(customerId: string) {
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('customers')
    .delete()
    .eq('id', customerId)

  if (error) throw new Error(error.message)
  return true
}

export async function getCustomerOrdersCount(email: string | null, phoneNormalized: string | null) {
  const adminClient = await createAdminClient()
  const orConditions = []
  if (email) orConditions.push(`email.eq.${email}`)
  if (phoneNormalized) orConditions.push(`phone_number_normalized.eq.${phoneNormalized}`)
  
  if (orConditions.length === 0) return 0
  
  const { data: custs, error: custErr } = await adminClient
    .from('customers')
    .select('id')
    .or(orConditions.join(','))
    
  if (custErr || !custs || custs.length === 0) return 0
  
  const ids = custs.map(c => c.id)
  const { count, error } = await adminClient
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .in('customer_id', ids)
  
  if (error) return 0
  return count || 0
}

export async function getCustomerOrders(email: string | null, phoneNormalized: string | null) {
  const adminClient = await createAdminClient()
  const orConditions = []
  if (email) orConditions.push(`email.eq.${email}`)
  if (phoneNormalized) orConditions.push(`phone_number_normalized.eq.${phoneNormalized}`)
  
  if (orConditions.length === 0) return []
  
  const { data: custs, error: custErr } = await adminClient
    .from('customers')
    .select('id')
    .or(orConditions.join(','))
    
  if (custErr || !custs || custs.length === 0) return []
  
  const ids = custs.map(c => c.id)
  const { data: requests, error } = await adminClient
    .from('requests')
    .select('id, request_code, title, current_status, created_at, reviewer_decision, is_archived, is_cancelled, cancellation_reason')
    .in('customer_id', ids)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  return requests || []
}

