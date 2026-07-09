'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'

export interface SiteContactSettings {
  email: string
  facebook_url: string
  facebook_enabled: boolean
  twitter_url: string
  twitter_enabled: boolean
  linkedin_url: string
  linkedin_enabled: boolean
  whatsapp_number: string
  whatsapp_enabled: boolean
}

async function checkPermission() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Unauthorized')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin && !permissions.canManageCommunications) {
    throw new Error('Forbidden: Admin or Communications role required')
  }
  return { user, staff }
}

export async function getSiteContactSettingsAction() {
  await checkPermission()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('economy_config')
    .select('value')
    .eq('config_key', 'site_contact_settings')
    .maybeSingle()

  if (error || !data) {
    // Return defaults if not found
    return {
      email: 'info@findora.app',
      facebook_url: 'https://facebook.com/findora.app',
      facebook_enabled: true,
      twitter_url: 'https://twitter.com/findora_app',
      twitter_enabled: true,
      linkedin_url: 'https://linkedin.com/company/findora',
      linkedin_enabled: true,
      whatsapp_number: '201000000000',
      whatsapp_enabled: true,
    } as SiteContactSettings
  }

  return (data.value as unknown) as SiteContactSettings
}

export async function updateSiteContactSettingsAction(settings: SiteContactSettings) {
  const { staff } = await checkPermission()
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('economy_config')
    .select('config_key')
    .eq('config_key', 'site_contact_settings')
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('economy_config')
      .update({
        value: settings as any,
        updated_by_staff_id: staff.id,
        updated_at: new Date().toISOString()
      })
      .eq('config_key', 'site_contact_settings')

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('economy_config')
      .insert({
        config_key: 'site_contact_settings',
        value: settings as any,
        description_en: 'Global contact details and social links for website footer',
        description_ar: 'بيانات التواصل والروابط الاجتماعية العامة لفوتر الموقع',
        is_system_controlled: false,
        updated_by_staff_id: staff.id,
        updated_at: new Date().toISOString()
      })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/[locale]', 'page')
  return { success: true }
}
