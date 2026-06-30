/**
 * src/app/[locale]/admin/link-domains/actions.ts
 * Server actions for allowed_link_domains CRUD.
 * Auth: guarded by canManageAI || isAdmin (same pattern as admin/feature-flags).
 * Cache: invalidateDomainCache() called after every write for instant propagation.
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { invalidateDomainCache } from '@/lib/intelligence/domain-cache'

async function checkPermission() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.canManageAI && !permissions.isAdmin) {
    throw new Error('Forbidden: AI Manager or Admin role required')
  }

  return { user, staff }
}

/** Validates that a string looks like a bare domain (no protocol, no path) */
function isBareDomain(value: string): boolean {
  // Allow: domain.com, sub.domain.com, domain.com.eg
  // Reject: http://..., domain.com/path, domain.com?query
  return /^[a-zA-Z0-9][a-zA-Z0-9\-._]{0,251}[a-zA-Z0-9]$/.test(value) &&
    !value.includes('/')  &&
    !value.includes(':')  &&
    !value.includes('?')  &&
    !value.includes('#')
}

export async function addDomainAction(
  domain: string,
  label: string
): Promise<{ success: boolean; error?: string }> {
  const { user } = await checkPermission()

  const clean = domain.trim().toLowerCase()
  if (!isBareDomain(clean)) {
    return { success: false, error: 'الدومين يجب أن يكون بصيغة صحيحة مثل: amazon.eg (بدون http:// أو مسار)' }
  }
  if (!label.trim()) {
    return { success: false, error: 'يرجى إدخال اسم للدومين' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('allowed_link_domains').insert({
    domain: clean,
    label:  label.trim(),
    added_by: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'هذا الدومين موجود بالفعل' }
    }
    return { success: false, error: error.message }
  }

  // Bust cache immediately so link-guard picks up the new domain within milliseconds
  invalidateDomainCache()
  revalidatePath('/[locale]/admin/link-domains', 'page')
  return { success: true }
}

export async function toggleDomainAction(
  id: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  await checkPermission()

  const admin = createAdminClient()
  const { error } = await admin
    .from('allowed_link_domains')
    .update({ enabled })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  invalidateDomainCache()
  revalidatePath('/[locale]/admin/link-domains', 'page')
  return { success: true }
}

export async function deleteDomainAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await checkPermission()

  const admin = createAdminClient()
  const { error } = await admin
    .from('allowed_link_domains')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  invalidateDomainCache()
  revalidatePath('/[locale]/admin/link-domains', 'page')
  return { success: true }
}
