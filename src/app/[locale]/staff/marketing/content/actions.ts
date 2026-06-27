'use server'

import { revalidatePath } from 'next/cache'
import { 
  upsertContentBlockAdmin, 
  publishContentBlockAdmin 
} from '@/lib/dal/marketing'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ALLOWED_BLOCKS = [
  'homepage_hero',
  'homepage_how_it_works',
  'homepage_faq',
  'service_everyday_purchase_copy'
]

export async function handleSaveContentBlock(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageContent && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const block_key = formData.get('block_key') as string
  const page_key = formData.get('page_key') as string || 'home'
  const section_key = formData.get('section_key') as string || 'general'

  if (!ALLOWED_BLOCKS.includes(block_key)) {
    throw new Error('Invalid block key')
  }

  // Parse JSON from form fields based on block_key
  let content_json: any = {}

  if (block_key === 'homepage_hero') {
    content_json = {
      title_en: formData.get('title_en'),
      title_ar: formData.get('title_ar'),
      subtitle_en: formData.get('subtitle_en'),
      subtitle_ar: formData.get('subtitle_ar'),
      cta_primary_en: formData.get('cta_primary_en'),
      cta_primary_ar: formData.get('cta_primary_ar'),
      cta_secondary_en: formData.get('cta_secondary_en'),
      cta_secondary_ar: formData.get('cta_secondary_ar'),
      image_path: formData.get('image_path')
    }
  } else if (block_key === 'homepage_how_it_works') {
    content_json = {
      section_title_en: formData.get('section_title_en'),
      section_title_ar: formData.get('section_title_ar'),
      steps: JSON.parse(formData.get('steps_json') as string || '[]')
    }
  } else if (block_key === 'homepage_faq') {
    content_json = {
      section_title_en: formData.get('section_title_en'),
      section_title_ar: formData.get('section_title_ar'),
      items: JSON.parse(formData.get('items_json') as string || '[]')
    }
  } else if (block_key === 'service_everyday_purchase_copy') {
    content_json = {
      title_en: formData.get('title_en'),
      title_ar: formData.get('title_ar'),
      description_en: formData.get('description_en'),
      description_ar: formData.get('description_ar'),
      benefits_en: (formData.get('benefits_en') as string || '').split('\n').filter(Boolean),
      benefits_ar: (formData.get('benefits_ar') as string || '').split('\n').filter(Boolean)
    }
  }

  try {
    await upsertContentBlockAdmin({
      block_key,
      page_key,
      section_key,
      content_json,
      updated_by_staff_id: staff.id
    })

    revalidatePath(`/${locale}/staff/marketing/content`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[CMSAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/content?error=save_failed`)
  }

  redirect(`/${locale}/staff/marketing/content?success=saved&block=${block_key}`)
}

export async function handleTogglePublish(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageContent && !permissions.canManageMarketing) {
    throw new Error('Unauthorized')
  }

  const locale = formData.get('locale') as string
  const id = formData.get('id') as string
  const is_published = formData.get('is_published') === 'true'

  try {
    await publishContentBlockAdmin(id, is_published)
    revalidatePath(`/${locale}/staff/marketing/content`)
    revalidatePath(`/${locale}`)
  } catch (err: any) {
    console.error('[CMSAction] Error:', err.message)
    redirect(`/${locale}/staff/marketing/content?error=publish_failed`)
  }

  redirect(`/${locale}/staff/marketing/content?success=published`)
}
