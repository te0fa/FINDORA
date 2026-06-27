'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePageContent(routePath: string, blockId: string, contentData: any) {
  const supabase = await createClient()
  
  // 1. Authenticate & Authorize
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: staffRaw } = await supabase
    .from('staff_members')
    .select('id, staff_role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const staffData = staffRaw as { id: string; staff_role: string } | null

  if (!staffData || (staffData.staff_role !== 'admin' && staffData.staff_role !== 'owner' && staffData.staff_role !== 'developer')) {
    // Also check staff_member_roles just in case
    const { data: roles } = await supabase
      .from('staff_member_roles')
      .select('role_code')
      .eq('staff_member_id', staffData?.id || '')
      .eq('is_active', true)
    
    const hasAccess = roles?.some((r: any) => ['admin', 'owner', 'content_manager', 'developer'].includes(r.role_code))
    if (!hasAccess) {
      return { success: false, error: 'Insufficient permissions to edit live content.' }
    }
  }

  // 2. Upsert Content
  const { error } = await (supabase
    .from('page_content') as any)
    .upsert(
      {
        route_path: routePath,
        block_id: blockId,
        content_data: contentData,
        last_edited_by: staffData!.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'route_path,block_id' }
    )

  if (error) {
    console.error('Error updating page content:', error)
    return { success: false, error: error.message }
  }

  // 3. Revalidate the page
  revalidatePath(routePath)
  revalidatePath(`/[locale]${routePath}`, 'page') // Handle localized routes
  
  return { success: true }
}

export async function fetchPageContent(routePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('page_content')
    .select('block_id, content_data')
    .eq('route_path', routePath)

  if (error) {
    console.error('Error fetching page content:', error)
    return {}
  }

  // Transform array into a key-value map for easy consumption: { 'hero-title': {...}, 'hero-desc': {...} }
  const contentMap: Record<string, any> = {}
  data.forEach((item: any) => {
    contentMap[item.block_id] = item.content_data
  })

  return contentMap
}
