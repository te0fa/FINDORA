'use server'

import { revalidatePath } from 'next/cache'
import { 
  createHomepageAnnouncementAdmin, 
  toggleHomepageAnnouncementActiveAdmin 
} from '@/lib/dal/marketing'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function handleCreateAnnouncement(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageNews && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const title_en = formData.get('title_en') as string
  const title_ar = formData.get('title_ar') as string
  const body_en = formData.get('body_en') as string
  const body_ar = formData.get('body_ar') as string
  const link_url = formData.get('link_url') as string
  const priority_raw = formData.get('priority') as string
  const announcement_type = formData.get('announcement_type') as string || 'news'

  const priority = parseInt(priority_raw) || 0

  if (!title_en || !title_ar) {
    redirect(`/${locale}/staff/marketing/news?error=missing_titles`)
  }

  const slug = `announcement-${Date.now()}`

  try {
    await createHomepageAnnouncementAdmin({
      slug,
      title_en,
      title_ar,
      body_en,
      body_ar,
      announcement_type,
      link_url,
      priority,
      is_active: true,
      created_by_staff_id: staff.id
    })

    revalidatePath(`/${locale}/staff/marketing/news`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[NewsAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/news?error=database_error`)
  }

  redirect(`/${locale}/staff/marketing/news?success=true`)
}

export async function handleToggleAnnouncement(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageNews && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'

  try {
    await toggleHomepageAnnouncementActiveAdmin(id, is_active)
    revalidatePath(`/${locale}/staff/marketing/news`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[NewsAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/news?error=toggle_failed`)
  }

  redirect(`/${locale}/staff/marketing/news?success=toggled`)
}
