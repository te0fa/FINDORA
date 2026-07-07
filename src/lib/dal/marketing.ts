import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { resolvePricing } from '../pricing/resolver'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('DAL:marketing')


/**
 * Helper to safely execute Supabase queries and catch connection/network/syntax errors.
 * Logs detailed environment status, query context, and exact error objects, then returns safe fallbacks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeSupabaseQuery<T = any>(
  queryFn: () => Promise<{ data: T; error: unknown } | unknown>,
  contextName: string,
  fallbackValue: T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    log.debug(`Executing query: ${contextName}`)

    const result = await queryFn()
    const data = result && typeof result === 'object' && 'data' in result
      ? (result as { data: T; error: unknown }).data
      : result as T
    const error = result && typeof result === 'object' && 'error' in result
      ? (result as { data: T; error: { message?: string; details?: string; hint?: string; code?: string } | null }).error
      : null

    if (error) {
      log.error(`Supabase error: ${contextName}`, {
        message: error.message,
        code: error.code,
        hint: error.hint,
      })
      return fallbackValue
    }

    const lengthInfo = Array.isArray(data) ? data.length : 'single'
    log.debug(`Query succeeded: ${contextName}`, { count: lengthInfo })
    return data
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`Connection error: ${contextName}`, { message })
    return fallbackValue
  }
}

/**
 * PUBLIC READ FUNCTIONS
 * These use the standard client which honors RLS.
 */

export function isPricingActive(p: any): boolean {
  if (!p) return false
  if (p.is_active !== true) return false
  
  const now = new Date()
  const startsAt = p.starts_at ? new Date(p.starts_at) : null
  const expiresAt = p.ends_at || p.expires_at ? new Date(p.ends_at || p.expires_at) : null

  if (startsAt && startsAt > now) return false
  if (expiresAt && expiresAt <= now) return false

  return true
}

export async function getActivePricing(serviceType: string, client?: any) {
  const resolved = await resolvePricing(serviceType, client)
  return {
    price: resolved.price,
    is_promo: resolved.is_promo,
    original_price: resolved.original_price,
    expires_at: resolved.expires_at
  }
}

export async function getActiveServicePricing(client?: any) {
  const supabase = client || await createClient()
  
  const data = await safeSupabaseQuery(
    async () => await (supabase as any)
      .from('service_pricing_versions')
      .select(`
        *,
        service:service_catalog (
          service_key,
          title_en,
          title_ar,
          description_en,
          description_ar
        )
      `)
      .eq('is_active', true)
      .order('version_no', { ascending: false }),
    'getActiveServicePricing',
    []
  )

  // Guard Against Duplicate Active Rows in query layer:
  // For each service key, we only keep the newest record that is currently active.
  const uniquePricing: any[] = []
  const seenKeys = new Set<string>()

  for (const row of (data || [])) {
    if (isPricingActive(row)) {
      if (!seenKeys.has(row.service_key)) {
        seenKeys.add(row.service_key)
        
        // Map to expected landing page format
        uniquePricing.push({
          id: row.id,
          service_key: row.service_key,
          current_price: Number(row.current_price),
          original_price: row.original_price ? Number(row.original_price) : null,
          currency_code: row.currency_code || 'EGP',
          promo_label_en: row.promo_label_en,
          promo_label_ar: row.promo_label_ar,
          is_active: true,
          service: row.service
        })
      }
    }
  }

  return uniquePricing
}

export async function getActiveHomepageAnnouncements(client?: any) {
  const supabase = client || await createClient()
  const now = new Date().toISOString()
  
  return safeSupabaseQuery(
    async () => await (supabase as any)
      .from('homepage_announcements')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
    'getActiveHomepageAnnouncements',
    []
  )
}

export async function getActiveFindoraDeals(client?: any) {
  const supabase = client || await createClient()
  const now = new Date().toISOString()
  
  return safeSupabaseQuery(
    async () => await (supabase as any)
      .from('findora_deals')
      .select('*')
      .eq('is_active', true)
      .eq('deal_status', 'active')
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false }),
    'getActiveFindoraDeals',
    []
  )
}

export async function getPublishedContentBlock(slug: string, client?: any) {
  const supabase = client || await createClient()
  
  return safeSupabaseQuery(
    async () => await (supabase as any)
      .from('site_content_blocks')
      .select('*')
      .eq('block_key', slug)
      .eq('is_published', true)
      .maybeSingle(),
    `getPublishedContentBlock:${slug}`,
    null
  )
}

export async function getPublishedContentBlocks(slugs: string[], client?: any) {
  const supabase = client || await createClient()
  
  return safeSupabaseQuery(
    async () => await (supabase as any)
      .from('site_content_blocks')
      .select('*')
      .in('block_key', slugs)
      .eq('is_published', true)
      .order('display_order', { ascending: true }),
    'getPublishedContentBlocks',
    []
  )
}

/**
 * STAFF/ADMIN FUNCTIONS
 * These use the admin client to bypass RLS for management views.
 */

export async function getServiceCatalogAdmin(client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_catalog')
      .select('*')
      .order('display_order', { ascending: true }),
    'getServiceCatalogAdmin',
    []
  )
}

export async function getPricingVersionsAdmin(client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .select('*, service:service_catalog(title_en, title_ar)')
      .or('promo_label_en.is.null,promo_label_en.neq.__HARD_DELETED__')
      .order('created_at', { ascending: false }),
    'getPricingVersionsAdmin',
    []
  )
}

export async function getAnnouncementsAdmin(client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('homepage_announcements')
      .select('*')
      .order('created_at', { ascending: false }),
    'getAnnouncementsAdmin',
    []
  )
}

export async function getDealsAdmin(client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('findora_deals')
      .select('*, vendors(display_name, trust_score)')
      .order('created_at', { ascending: false }),
    'getDealsAdmin',
    []
  )
}

export async function getContentBlocksAdmin(client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('site_content_blocks')
      .select('*')
      .order('page_key', { ascending: true })
      .order('display_order', { ascending: true }),
    'getContentBlocksAdmin',
    []
  )
}

/**
 * PRICING MUTATIONS (ADMIN)
 */

export async function createServicePricingVersionAdmin(params: {
  service_key: string
  original_price?: number
  current_price: number
  currency_code?: string
  promo_label_en?: string
  promo_label_ar?: string
  starts_at?: string | null
  ends_at?: string | null
  is_active?: boolean
  created_by_staff_id?: string
}, client?: any) {
  const adminClient = client || await createAdminClient()
  
  try {
    // 1. Find next version number
    const latest = await safeSupabaseQuery(
      async () => await (adminClient as any)
        .from('service_pricing_versions')
        .select('version_no')
        .eq('service_key', params.service_key)
        .order('version_no', { ascending: false })
        .limit(1)
        .maybeSingle(),
      'createServicePricingVersionAdmin:getLatest',
      null
    )
    
    const nextVersion = ((latest as any)?.version_no || 0) + 1

    // 2. Determine if this is a PROMO version (has promo labels) or BASE version
    const isPromoVersion = !!(params.promo_label_en || params.promo_label_ar)
    
    if (params.is_active !== false) {
      if (isPromoVersion) {
        // Promo: only deactivate previous ACTIVE PROMO records (not base price)
        // Base price records (no promo_label) stay active so the table still shows the real price
        await safeSupabaseQuery(
          async () => await (adminClient as any)
            .from('service_pricing_versions')
            .update({ is_active: false })
            .eq('service_key', params.service_key)
            .eq('is_active', true)
            .not('promo_label_en', 'is', null),
          'createServicePricingVersionAdmin:deactivateOldPromos',
          null
        )
      } else {
        // Base price update: deactivate ALL previous versions for this service
        await safeSupabaseQuery(
          async () => await (adminClient as any)
            .from('service_pricing_versions')
            .update({ is_active: false })
            .eq('service_key', params.service_key),
          'createServicePricingVersionAdmin:deactivateAll',
          null
        )
      }
    }
    
    // 3. Insert new version
    return await safeSupabaseQuery(
      async () => await (adminClient as any)
        .from('service_pricing_versions')
        .insert({
          ...params,
          version_no: nextVersion
        })
        .select()
        .single(),
      'createServicePricingVersionAdmin:insert',
      null
    )
  } catch (err: any) {
    console.error('[Supabase DAL Error: createServicePricingVersionAdmin] Failed to orchestrate operations:', err.message)
    return null
  }
}

export async function getActivePricingForService(serviceKey: string, client?: any) {
  const supabase = client || await createClient()
  
  const records = await safeSupabaseQuery(
    async () => await (supabase as any)
      .from('service_pricing_versions')
      .select('*')
      .eq('service_key', serviceKey)
      .eq('is_active', true)
      .order('version_no', { ascending: false }),
    `getActivePricingForService:${serviceKey}`,
    []
  )

  const activeRow = (records || []).find((r: any) => isPricingActive(r))
  return activeRow || null
}

export async function deactivateActivePricingForServiceAdmin(serviceKey: string, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .update({ is_active: false })
      .eq('service_key', serviceKey)
      .eq('is_active', true)
      .select(),
    `deactivateActivePricingForServiceAdmin:${serviceKey}`,
    null
  )
}

export async function togglePricingActiveAdmin(id: string, isActive: boolean, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
    `togglePricingActiveAdmin:${id}`,
    null
  )
}

export async function deletePricingVersionAdmin(id: string, client?: any) {
  const adminClient = client || await createAdminClient()
  
  // Soft-delete: mark as deleted rather than hard-deleting so history is preserved
  const result = await safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .update({ 
        is_active: false, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single(),
    `deletePricingVersionAdmin:${id}`,
    null
  )
  return result !== null
}

export async function bulkDeletePricingVersionsAdmin(ids: string[], client?: any) {
  const adminClient = client || await createAdminClient()
  
  const result = await safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .update({ 
        is_active: false, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select(),
    `bulkDeletePricingVersionsAdmin`,
    null
  )
  return result !== null
}

export async function updateServiceBasePriceAdmin(id: string, newPrice: number, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .update({ 
        current_price: newPrice,
        original_price: newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single(),
    `updateServiceBasePriceAdmin:${id}`,
    null
  )
}

export async function restorePricingVersionAdmin(id: string, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .update({ 
        deleted_at: null, 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single(),
    `restorePricingVersionAdmin:${id}`,
    null
  )
}

/**
 * ANNOUNCEMENT MUTATIONS (ADMIN)
 */

export async function createHomepageAnnouncementAdmin(params: {
  slug: string
  title_en: string
  title_ar: string
  body_en?: string
  body_ar?: string
  announcement_type?: string
  link_url?: string
  priority?: number
  is_active?: boolean
  created_by_staff_id?: string
}, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('homepage_announcements')
      .insert(params)
      .select()
      .single(),
    `createHomepageAnnouncementAdmin:${params.slug}`,
    null
  )
}

export async function updateHomepageAnnouncementAdmin(id: string, params: any, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('homepage_announcements')
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
    `updateHomepageAnnouncementAdmin:${id}`,
    null
  )
}

export async function toggleHomepageAnnouncementActiveAdmin(id: string, isActive: boolean, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('homepage_announcements')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
    `toggleHomepageAnnouncementActiveAdmin:${id}`,
    null
  )
}

/**
 * DEALS FUNCTIONS (PUBLIC)
 */

export async function getFeaturedFindoraDeals(limit: number = 3, client?: any) {
  const supabase = client || await createClient()
  const now = new Date().toISOString()
  
  return safeSupabaseQuery(
    async () => await (supabase as any)
      .from('findora_deals')
      .select('*')
      .eq('is_active', true)
      .eq('deal_status', 'active')
      .eq('featured_on_homepage', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit),
    'getFeaturedFindoraDeals',
    []
  )
}

export async function createFindoraDealInquiry(params: {
  deal_id: string
  customer_name?: string
  customer_phone: string
  customer_email?: string
  notes?: string
  customer_id?: string
}, client?: any) {
  const supabase = client || await createClient()
  
  return safeSupabaseQuery(
    async () => await (supabase as any)
      .from('findora_deal_inquiries')
      .insert(params)
      .select()
      .single(),
    `createFindoraDealInquiry:${params.deal_id}`,
    null
  )
}

/**
 * DEALS MUTATIONS (ADMIN)
 */

export async function createFindoraDealAdmin(params: {
  slug: string
  title_en: string
  title_ar: string
  description_en?: string
  description_ar?: string
  original_price?: number
  deal_price: number
  image_path?: string
  category?: string
  deal_status?: string
  featured_on_homepage?: boolean
  display_order?: number
  is_active?: boolean
  starts_at?: string
  ends_at?: string
  created_by_staff_id?: string
  vendor_id?: string | null
  vendor_name_snapshot?: string | null
}, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('findora_deals')
      .insert(params)
      .select()
      .single(),
    `createFindoraDealAdmin:${params.slug}`,
    null
  )
}

export async function updateFindoraDealAdmin(id: string, params: any, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('findora_deals')
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
    `updateFindoraDealAdmin:${id}`,
    null
  )
}

export async function toggleFindoraDealActiveAdmin(id: string, isActive: boolean, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('findora_deals')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
    `toggleFindoraDealActiveAdmin:${id}`,
    null
  )
}

export async function deleteFindoraDealAdmin(id: string, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('findora_deals')
      .update({ 
        deal_status: 'archived',
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id),
    `deleteFindoraDealAdmin:${id}`,
    false
  ).then(res => res !== false)
}

export async function hardDeleteFindoraDealAdmin(id: string, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('findora_deals')
      .update({ 
        deal_status: 'draft',
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id),
    `hardDeleteFindoraDealAdmin:${id}`,
    false
  ).then(res => res !== false)
}

export async function countFindoraDealInquiries(dealId: string, client?: any) {
  const adminClient = client || await createAdminClient()
  
  const countRes = await safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('findora_deal_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('deal_id', dealId),
    `countFindoraDealInquiries:${dealId}`,
    null
  )
  
  return (countRes as any)?.count || 0
}

export async function getFindoraDealBySlug(slug: string, client?: any) {
  const supabase = client || await createClient()
  
  return safeSupabaseQuery(
    async () => await (supabase as any)
      .from('findora_deals')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle(),
    `getFindoraDealBySlug:${slug}`,
    null
  )
}

/**
 * CMS FUNCTIONS (ADMIN)
 */

export async function getContentBlockAdmin(slug: string, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('site_content_blocks')
      .select('*')
      .eq('block_key', slug)
      .maybeSingle(),
    `getContentBlockAdmin:${slug}`,
    null
  )
}

export async function upsertContentBlockAdmin(params: {
  block_key: string
  page_key: string
  section_key: string
  content_json: any
  updated_by_staff_id?: string
}, client?: any) {
  const adminClient = client || await createAdminClient()
  
  try {
    // 1. Get old snapshot for audit
    const oldBlock = await safeSupabaseQuery(
      async () => await (adminClient as any)
        .from('site_content_blocks')
        .select('content_json')
        .eq('block_key', params.block_key)
        .maybeSingle(),
      'upsertContentBlockAdmin:getOld',
      null
    )

    // 2. Upsert block
    const data = await safeSupabaseQuery(
      async () => await (adminClient as any)
        .from('site_content_blocks')
        .upsert({
          ...params,
          updated_at: new Date().toISOString()
        }, { onConflict: 'block_key' })
        .select()
        .single(),
      'upsertContentBlockAdmin:upsert',
      null
    )
    
    // 3. Write audit (fire-and-forget or safe await)
    await writeContentAudit(
      params.block_key,
      (oldBlock as any)?.content_json || {},
      params.content_json,
      params.updated_by_staff_id,
      'Updated via CMS Dashboard',
      adminClient
    )

    return data
  } catch (err: any) {
    console.error('[Supabase DAL Error: upsertContentBlockAdmin] Failed to orchestrate operations:', err.message)
    return null
  }
}

export async function publishContentBlockAdmin(id: string, isPublished: boolean, client?: any) {
  const adminClient = client || await createAdminClient()
  
  return safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('site_content_blocks')
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
    `publishContentBlockAdmin:${id}`,
    null
  )
}

export async function writeContentAudit(
  blockKey: string,
  oldSnapshot: any,
  newSnapshot: any,
  staffId?: string,
  reason?: string,
  client?: any
) {
  const adminClient = client || await createAdminClient()
  
  await safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('site_content_audit')
      .insert({
        block_key: blockKey,
        old_snapshot: oldSnapshot,
        new_snapshot: newSnapshot,
        changed_by_staff_id: staffId,
        change_reason: reason
      }),
    `writeContentAudit:${blockKey}`,
    null
  )
}

export async function getPromoAnalyticsAdmin(client?: any) {
  const adminClient = client || await createAdminClient()
  
  // 1. Fetch pricing versions with their service titles
  const versions = await safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('service_pricing_versions')
      .select('*, service:service_catalog(title_en, title_ar)')
      .order('created_at', { ascending: true }),
    'getPromoAnalyticsAdmin:versions',
    []
  )
  
  // 2. Fetch requests (all needed for mapping)
  const requests = await safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('requests')
      .select('id, customer_id, request_kind, created_at'),
    'getPromoAnalyticsAdmin:requests',
    []
  )
  
  // 3. Fetch confirmed payments
  const payments = await safeSupabaseQuery(
    async () => await (adminClient as any)
      .from('payments')
      .select('request_id, amount')
      .eq('payment_status', 'confirmed'),
    'getPromoAnalyticsAdmin:payments',
    []
  )
  
  // Build a map of request_id to sum of confirmed payment amounts
  const paymentMap = new Map<string, number>()
  for (const p of (payments || [])) {
    paymentMap.set(p.request_id, (paymentMap.get(p.request_id) || 0) + Number(p.amount))
  }
  
  // Sort versions by service_key and version_no to determine active bounds
  const serviceVersionsMap = new Map<string, any[]>()
  for (const v of (versions || [])) {
    if (!serviceVersionsMap.has(v.service_key)) {
      serviceVersionsMap.set(v.service_key, [])
    }
    serviceVersionsMap.get(v.service_key)!.push(v)
  }
  
  const analytics = []
  
  for (const v of (versions || [])) {
    // A promo is defined as a version with promo labels, or where original_price differs from current_price
    const isPromo = !!(v.promo_label_en || v.promo_label_ar || (v.original_price && Number(v.original_price) !== Number(v.current_price)))
    
    // We only include promos in the analytics log
    if (!isPromo) continue
    
    // Determine active period bounds
    const promoStart = new Date(v.starts_at || v.created_at).getTime()
    
    // Find when the next version of this service key started to cap this one, if ends_at is not set
    const sameServiceVersions = serviceVersionsMap.get(v.service_key) || []
    const nextVersion = sameServiceVersions.find((sv: any) => sv.version_no === v.version_no + 1)
    
    let promoEnd = new Date().getTime() // default to now
    if (v.deleted_at) {
      promoEnd = new Date(v.deleted_at).getTime()
    } else if (v.ends_at || v.expires_at) {
      promoEnd = new Date(v.ends_at || v.expires_at).getTime()
    } else if (nextVersion) {
      promoEnd = new Date(nextVersion.starts_at || nextVersion.created_at).getTime()
    }
    
    // Calculate running duration in days
    const durationMs = promoEnd - promoStart
    const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)))
    
    // Filter requests that fall in this service and date range
    const matchingRequests = (requests || []).filter((r: any) => {
      if (r.request_kind !== v.service_key) return false
      const reqTime = new Date(r.created_at).getTime()
      return reqTime >= promoStart && reqTime <= promoEnd
    })
    
    // Count unique customers
    const uniqueCustomers = new Set(matchingRequests.map((r: any) => r.customer_id)).size
    
    // Sum profits/revenue
    let totalRevenue = 0
    for (const r of matchingRequests) {
      totalRevenue += paymentMap.get(r.id) || 0
    }
    
    // Score & Rating
    let rating = 0
    if (uniqueCustomers > 0) {
      if (totalRevenue >= 5000) rating = 5
      else if (totalRevenue >= 2500) rating = 4
      else if (totalRevenue >= 1000) rating = 3
      else if (totalRevenue >= 200) rating = 2
      else rating = 1
    }
    
    analytics.push({
      id: v.id,
      serviceKey: v.service_key,
      serviceTitleEn: v.service?.title_en || v.service_key,
      serviceTitleAr: v.service?.title_ar || v.service_key,
      promoLabelEn: v.promo_label_en || 'Limited Time Offer',
      promoLabelAr: v.promo_label_ar || 'عرض لفترة محدودة',
      versionNo: v.version_no,
      price: v.current_price,
      originalPrice: v.original_price,
      currency: v.currency_code || 'EGP',
      startsAt: v.starts_at || v.created_at,
      endsAt: v.ends_at || v.expires_at || (v.deleted_at ? v.deleted_at : null),
      isActive: v.is_active && !v.deleted_at && (v.ends_at || v.expires_at ? new Date(v.ends_at || v.expires_at) > new Date() : true),
      durationDays,
      customersCount: uniqueCustomers,
      revenue: totalRevenue,
      rating
    })
  }
  
  // Sort descending by startsAt (newest promos first)
  return analytics.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
}
