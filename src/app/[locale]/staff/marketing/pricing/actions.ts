'use server'

import { revalidatePath } from 'next/cache'
import { 
  createServicePricingVersionAdmin, 
  togglePricingActiveAdmin, 
  deletePricingVersionAdmin,
  restorePricingVersionAdmin,
  updateServiceBasePriceAdmin,
  bulkDeletePricingVersionsAdmin
} from '@/lib/dal/marketing'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function checkStaffAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManagePricing && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }
  return { staff }
}

export async function handleCreatePricingVersion(formData: FormData) {
  const { staff } = await checkStaffAuth()

  const locale = formData.get('locale') as string
  const service_key = formData.get('service_key') as string
  const original_price_raw = formData.get('original_price') as string
  const current_price_raw = formData.get('current_price') as string
  const currency_code = formData.get('currency_code') as string || 'EGP'
  const promo_label_en = formData.get('promo_label_en') as string
  const promo_label_ar = formData.get('promo_label_ar') as string
  
  // Date/Time Pickers (Start/End Date support)
  const starts_at_raw = formData.get('starts_at') as string
  const expires_at_raw = formData.get('expires_at') as string
  
  // is_active toggle (defaults to true unless manually disabled)
  const is_active_raw = formData.get('is_active') as string
  const is_active = is_active_raw !== 'false'

  const original_price = parseFloat(original_price_raw)
  const current_price = parseFloat(current_price_raw)

  if (!service_key || isNaN(current_price)) {
    redirect(`/${locale}/staff/marketing/pricing?error=invalid_input`)
  }

  // Basic validation
  if (!isNaN(original_price) && current_price > original_price) {
    redirect(`/${locale}/staff/marketing/pricing?error=current_price_exceeds_original`)
  }

  const starts_at = starts_at_raw ? new Date(starts_at_raw).toISOString() : null
  const ends_at = expires_at_raw ? new Date(expires_at_raw).toISOString() : null

  try {
    const record = await createServicePricingVersionAdmin({
      service_key,
      original_price: isNaN(original_price) ? undefined : original_price,
      current_price,
      currency_code,
      promo_label_en,
      promo_label_ar,
      starts_at,
      ends_at,
      is_active,
      created_by_staff_id: staff.id
    })

    console.log({
      action: "pricing_mutation",
      type: "create",
      id: record?.id || "new",
      timestamp: new Date().toISOString()
    })

    revalidatePath(`/${locale}/staff/marketing/pricing`)
    revalidatePath(`/${locale}`)
    revalidatePath('/', 'layout')
  } catch (err: any) {
    console.error('[PricingAction] Create Error:', err.message)
    redirect(`/${locale}/staff/marketing/pricing?error=database_error`)
  }

  redirect(`/${locale}/staff/marketing/pricing?success=true`)
}

export async function handleTogglePricingActive(id: string, isActive: boolean, locale: string) {
  try {
    await checkStaffAuth()
    await togglePricingActiveAdmin(id, isActive)
    
    console.log({
      action: "pricing_mutation",
      type: isActive ? "activate" : "deactivate",
      id,
      timestamp: new Date().toISOString()
    })

    revalidatePath(`/${locale}/staff/marketing/pricing`)
    revalidatePath(`/${locale}`)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('[PricingAction] Toggle Error:', err.message)
    return { error: err.message }
  }
}

export async function handleDeletePricingVersion(id: string, locale: string) {
  try {
    await checkStaffAuth()
    await deletePricingVersionAdmin(id)
    
    console.log({
      action: "pricing_mutation",
      type: "delete",
      id,
      timestamp: new Date().toISOString()
    })

    revalidatePath(`/${locale}/staff/marketing/pricing`)
    revalidatePath(`/${locale}`)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('[PricingAction] Delete Error:', err.message)
    return { error: err.message }
  }
}

export async function handleRestorePricingVersion(id: string, locale: string) {
  try {
    await checkStaffAuth()
    await restorePricingVersionAdmin(id)
    
    console.log({
      action: "pricing_mutation",
      type: "restore",
      id,
      timestamp: new Date().toISOString()
    })

    revalidatePath(`/${locale}/staff/marketing/pricing`)
    revalidatePath(`/${locale}`)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('[PricingAction] Restore Error:', err.message)
    return { error: err.message }
  }
}

export async function handleUpdateBasePrice(
  serviceKey: string, 
  pricingId: string | undefined, 
  newPrice: number, 
  locale: string
) {
  try {
    const { staff } = await checkStaffAuth()
    
    if (pricingId) {
      // Update the specific base version's price (both current AND original to keep it a base record)
      await updateServiceBasePriceAdmin(pricingId, newPrice)
    } else {
      // No base version exists yet — create one
      // createServicePricingVersionAdmin will NOT deactivate promos since no promo_label
      await createServicePricingVersionAdmin({
        service_key: serviceKey,
        current_price: newPrice,
        original_price: newPrice,
        currency_code: 'EGP',
        is_active: true,
        created_by_staff_id: staff.id
      })
    }
    
    console.log({
      action: "pricing_mutation",
      type: "update_base_price",
      serviceKey,
      pricingId: pricingId || "created",
      newPrice,
      timestamp: new Date().toISOString()
    })

    revalidatePath(`/${locale}/staff/marketing/pricing`)
    revalidatePath(`/${locale}`)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('[PricingAction] UpdateBasePrice Error:', err.message)
    return { error: err.message }
  }
}

export async function handleBulkDeletePricingVersions(ids: string[], locale: string) {
  try {
    await checkStaffAuth()
    await bulkDeletePricingVersionsAdmin(ids)
    
    console.log({
      action: "pricing_mutation",
      type: "bulk_delete",
      ids,
      timestamp: new Date().toISOString()
    })

    revalidatePath(`/${locale}/staff/marketing/pricing`)
    revalidatePath(`/${locale}`)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('[PricingAction] Bulk Delete Error:', err.message)
    return { error: err.message }
  }
}
