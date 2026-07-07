'use server'

import { revalidatePath } from 'next/cache'
import { 
  createFindoraDealAdmin, 
  updateFindoraDealAdmin,
  toggleFindoraDealActiveAdmin,
  deleteFindoraDealAdmin,
  hardDeleteFindoraDealAdmin,
  countFindoraDealInquiries
} from '@/lib/dal/marketing'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/dal/customers'
import { redirect } from 'next/navigation'

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

async function uploadProductImage(file: File) {
  if (file.size === 0) return null
  const adminClient = await createAdminClient()
  const safeName = sanitizeFileName(file.name || 'product-image')
  const path = `${Date.now()}-${safeName}`
  
  const { error } = await adminClient.storage
    .from('findora-products')
    .upload(path, file, { contentType: file.type, upsert: false })
    
  if (error) {
    console.error('Storage upload failed, falling back to local/URL:', error)
    return null
  }
  
  const { data: { publicUrl } } = adminClient.storage.from('findora-products').getPublicUrl(path)
  return publicUrl
}

export async function handleCreateDeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageDeals && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const title_en = formData.get('title_en') as string
  const title_ar = formData.get('title_ar') as string
  const description_en = formData.get('description_en') as string
  const description_ar = formData.get('description_ar') as string
  const original_price_raw = formData.get('original_price') as string
  const deal_price_raw = formData.get('deal_price') as string
  let image_path = formData.get('image_path') as string
  const category = formData.get('category') as string
  const featured = formData.get('featured_on_homepage') === 'on'

  const image_file = formData.get('image_file') as File | null
  if (image_file && image_file.size > 0) {
    const uploadedUrl = await uploadProductImage(image_file)
    if (uploadedUrl) image_path = uploadedUrl
  }

  const original_price = original_price_raw ? parseFloat(original_price_raw) : undefined
  const deal_price = parseFloat(deal_price_raw)

  if (!title_en || !title_ar || isNaN(deal_price)) {
    redirect(`/${locale}/staff/marketing/deals?error=invalid_input`)
  }

  if (deal_price < 0) {
    redirect(`/${locale}/staff/marketing/deals?error=negative_price`)
  }

  const slug = `deal-${Date.now()}`
  
  const starts_at_raw = formData.get('starts_at') as string
  const ends_at_raw = formData.get('ends_at') as string
  const starts_at = starts_at_raw ? new Date(starts_at_raw).toISOString() : undefined
  const ends_at = ends_at_raw ? new Date(ends_at_raw).toISOString() : undefined

  const vendor_id = formData.get('vendor_id') as string || null
  const vendor_name_snapshot = formData.get('vendor_name_snapshot') as string || null

  try {
    await createFindoraDealAdmin({
      slug,
      title_en,
      title_ar,
      description_en,
      description_ar,
      original_price,
      deal_price,
      image_path,
      category,
      featured_on_homepage: featured,
      deal_status: 'active',
      is_active: true,
      starts_at,
      ends_at,
      created_by_staff_id: staff.id,
      vendor_id,
      vendor_name_snapshot
    })

    revalidatePath(`/${locale}/staff/marketing/deals`)
    revalidatePath(`/${locale}/deals`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[DealsAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/deals?error=database_error`)
  }

  redirect(`/${locale}/staff/marketing/deals?success=true`)
}

export async function handleUpdateDeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageDeals && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const id = formData.get('id') as string
  
  const title_en = formData.get('title_en') as string
  const title_ar = formData.get('title_ar') as string
  const description_en = formData.get('description_en') as string
  const description_ar = formData.get('description_ar') as string
  const original_price_raw = formData.get('original_price') as string
  const deal_price_raw = formData.get('deal_price') as string
  let image_path = formData.get('image_path') as string
  const category = formData.get('category') as string
  const featured = formData.get('featured_on_homepage') === 'on'

  const image_file = formData.get('image_file') as File | null
  if (image_file && image_file.size > 0) {
    const uploadedUrl = await uploadProductImage(image_file)
    if (uploadedUrl) image_path = uploadedUrl
  }

  const original_price = original_price_raw ? parseFloat(original_price_raw) : null
  const deal_price = parseFloat(deal_price_raw)

  const starts_at_raw = formData.get('starts_at') as string
  const ends_at_raw = formData.get('ends_at') as string
  const starts_at = starts_at_raw ? new Date(starts_at_raw).toISOString() : null
  const ends_at = ends_at_raw ? new Date(ends_at_raw).toISOString() : null

  const vendor_id = formData.get('vendor_id') as string || null
  const vendor_name_snapshot = formData.get('vendor_name_snapshot') as string || null

  try {
    await updateFindoraDealAdmin(id, {
      title_en,
      title_ar,
      description_en,
      description_ar,
      original_price,
      deal_price,
      ...(image_path && { image_path }),
      category,
      featured_on_homepage: featured,
      starts_at,
      ends_at,
      vendor_id,
      vendor_name_snapshot
    })

    revalidatePath(`/${locale}/staff/marketing/deals`)
    revalidatePath(`/${locale}/deals`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[DealsAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/deals?error=update_failed`)
  }

  redirect(`/${locale}/staff/marketing/deals?success=updated`)
}

export async function handleToggleDeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageDeals && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'

  try {
    await toggleFindoraDealActiveAdmin(id, is_active)
    revalidatePath(`/${locale}/staff/marketing/deals`)
    revalidatePath(`/${locale}/deals`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[DealsAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/deals?error=toggle_failed`)
  }

  redirect(`/${locale}/staff/marketing/deals?success=toggled`)
}

export async function handleToggleFeatureDeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageDeals && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const id = formData.get('id') as string
  const featured = formData.get('featured') === 'true'

  try {
    await updateFindoraDealAdmin(id, { featured_on_homepage: featured })
    revalidatePath(`/${locale}/staff/marketing/deals`)
    revalidatePath(`/${locale}/deals`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[DealsAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/deals?error=toggle_feature_failed`)
  }

  redirect(`/${locale}/staff/marketing/deals?success=toggled_feature`)
}

export async function handleDeleteDeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageDeals && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const id = formData.get('id') as string

  try {
    const inquiryCount = await countFindoraDealInquiries(id)
    if (inquiryCount > 0) {
      return redirect(`/${locale}/staff/marketing/deals?error=has_inquiries`)
    }

    // Soft delete / Archive
    await deleteFindoraDealAdmin(id)
    revalidatePath(`/${locale}/staff/marketing/deals`)
    revalidatePath(`/${locale}/deals`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    if (err.message.includes('NEXT_REDIRECT')) throw err
    console.error('[DealsAction] Error:', err.message)
    return redirect(`/${locale}/staff/marketing/deals?error=delete_failed`)
  }

  return redirect(`/${locale}/staff/marketing/deals?success=archived`)
}

export async function handleHardDeleteDeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  // ONLY ADMIN can hard delete
  if (!permissions.canHardDelete) {
    throw new Error('Unauthorized: Hard Delete requires Admin privileges')
  }

  const locale = formData.get('locale') as string
  const id = formData.get('id') as string

  try {
    const adminClient = await createAdminClient()
    await adminClient.from('findora_deal_inquiries').delete().eq('deal_id', id)

    await hardDeleteFindoraDealAdmin(id)
    revalidatePath(`/${locale}/staff/marketing/deals`)
    revalidatePath(`/${locale}/deals`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    if (err.message.includes('NEXT_REDIRECT')) throw err
    console.error('[DealsAction] Error:', err.message)
    return redirect(`/${locale}/staff/marketing/deals?error=hard_delete_failed`)
  }

  return redirect(`/${locale}/staff/marketing/deals?success=deleted_permanently`)
}
