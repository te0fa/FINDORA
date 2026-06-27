import { createAdminClient } from './customers'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('DAL:vendors')

// ─── Types ───────────────────────────────────────────────────────────────────

export type AccountTier  = 'Bronze' | 'Silver' | 'Gold'
export type SystemStatus = 'Active' | 'Suspended' | 'Pending Verification'

export interface VendorSpecialization {
  id:      string
  slug:    string
  name_en: string
  name_ar: string
}

export interface Vendor {
  id:                     string
  display_name:           string
  commercial_reg_number:  string | null
  tax_card_number:        string | null
  whatsapp_number:        string | null
  governorate:            string | null
  area:                   string | null
  trust_score:            number
  total_successful_deals: number
  reported_issues:        number
  account_tier:           AccountTier
  system_status:          SystemStatus
  notes:                  string | null
  portal_enabled:         boolean
  portal_email:           string | null
  created_at:             string
  updated_at:             string
  specializations?:       VendorSpecialization[]
  /** @deprecated use specializations */
  categories?:            string[]
}

export interface VendorWithCategories extends Vendor {
  specializations: VendorSpecialization[]
  /** @deprecated kept for backward-compat */
  categories: string[]
  avg_rating?:   number | null
  review_count?: number
  profile_details?: {
    business_name_ar: string
    business_name_en: string | null
    merchant_type: string
    category: string
    city: string | null
    address: string | null
    secondary_phone: string | null
    email: string | null
    website: string | null
  } | null
}

export interface VendorReview {
  id:                    string
  vendor_id:             string
  request_id:            string | null
  customer_id:           string | null
  platform_rating:       number | null
  platform_comment:      string | null
  vendor_rating:         number | null
  vendor_availability:   number | null
  vendor_price_accuracy: number | null
  vendor_communication:  number | null
  is_published:          boolean
  is_archived:           boolean
  created_at:            string
}

export interface CreateVendorInput {
  display_name:           string
  commercial_reg_number?: string
  tax_card_number?:       string
  whatsapp_number?:       string
  governorate?:           string
  area?:                  string
  notes?:                 string
  portal_enabled?:        boolean
  portal_email?:          string
  specialization_ids:     string[]  // new: FK to specializations table
}

export interface UpdateVendorInput {
  display_name?:          string
  commercial_reg_number?: string
  tax_card_number?:       string
  whatsapp_number?:       string
  governorate?:           string
  area?:                  string
  notes?:                 string
  system_status?:         SystemStatus
  portal_enabled?:        boolean
  portal_email?:          string
  specialization_ids?:    string[]
}

export interface SystemMessage {
  id:         string
  vendor_id:  string
  sent_by:    string | null
  message:    string
  created_at: string
  staff_name?: string | null
}

export interface VendorAuditEntry {
  id:         string
  vendor_id:  string
  actor_id:   string | null
  event_name: string
  old_value:  Record<string, unknown> | null
  new_value:  Record<string, unknown> | null
  created_at: string
  actor_name?: string | null
}

export interface VendorPortalToken {
  id:          string
  vendor_id:   string
  token:       string
  portal_email: string | null
  is_active:   boolean
  last_used_at: string | null
  created_at:  string
  expires_at:  string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcTier(score: number): AccountTier {
  if (score >= 90) return 'Gold'
  if (score >= 70) return 'Silver'
  return 'Bronze'
}

async function fetchSpecializationsForVendors(
  client: any,
  vendorIds: string[]
): Promise<Map<string, VendorSpecialization[]>> {
  if (vendorIds.length === 0) return new Map()

  const { data } = await client
    .from('vendor_categories')
    .select('vendor_id, specialization_id, specializations(id, slug, name_en, name_ar)')
    .in('vendor_id', vendorIds)

  const map = new Map<string, VendorSpecialization[]>()
  for (const row of (data || [])) {
    if (!row.specializations) continue
    const spec = row.specializations as VendorSpecialization
    if (!map.has(row.vendor_id)) map.set(row.vendor_id, [])
    map.get(row.vendor_id)!.push(spec)
  }
  return map
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getAllVendors(): Promise<VendorWithCategories[]> {
  const client = await createAdminClient() as any

  const { data: vendors, error } = await client
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const vendorIds = (vendors || []).map((v: any) => v.id)
  const specMap = await fetchSpecializationsForVendors(client, vendorIds)

  return (vendors || []).map((v: Vendor) => {
    const specs = specMap.get(v.id) || []
    return {
      ...v,
      specializations: specs,
      categories: specs.map(s => s.slug), // backward-compat
    }
  })
}

export async function getVendorById(vendorId: string): Promise<VendorWithCategories | null> {
  const client = await createAdminClient() as any

  const { data: vendor, error } = await client
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!vendor) return null

  const specMap = await fetchSpecializationsForVendors(client, [vendorId])
  const specs = specMap.get(vendorId) || []

  // Fetch avg rating
  const { data: reviewStats } = await client
    .from('vendor_reviews')
    .select('vendor_rating, vendor_availability, vendor_price_accuracy, vendor_communication')
    .eq('vendor_id', vendorId)
    .eq('is_published', true)
    .eq('is_archived', false)

  let avg_rating: number | null = null
  let review_count = 0
  if (reviewStats && reviewStats.length > 0) {
    review_count = reviewStats.length
    const total = reviewStats.reduce((sum: number, r: any) => {
      const vals = [r.vendor_rating, r.vendor_availability, r.vendor_price_accuracy, r.vendor_communication]
        .filter((v): v is number => v !== null)
      return sum + (vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0)
    }, 0)
    avg_rating = Math.round((total / review_count) * 10) / 10
  }

  const { data: profile } = await client
    .from('vendor_profile_details')
    .select('*')
    .eq('vendor_id', vendorId)
    .maybeSingle()

  return {
    ...vendor,
    specializations: specs,
    categories: specs.map(s => s.slug),
    avg_rating,
    review_count,
    profile_details: profile || null,
  }
}

/**
 * Search vendors by name (fuzzy) — for the VendorPicker component.
 * Returns lightweight vendor list with trust score and specializations.
 */
export async function searchVendors(
  query: string,
  specializationId?: string,
  limit = 20
): Promise<Array<Pick<VendorWithCategories, 'id' | 'display_name' | 'trust_score' | 'account_tier' | 'system_status' | 'total_successful_deals' | 'specializations' | 'categories'>>> {
  const client = await createAdminClient() as any

  let qb = client
    .from('vendors')
    .select('id, display_name, trust_score, account_tier, system_status, total_successful_deals')
    .ilike('display_name', `%${query}%`)
    .limit(limit)
    .order('trust_score', { ascending: false })

  const { data: vendors, error } = await qb
  if (error) throw new Error(error.message)

  const vendorIds = (vendors || []).map((v: any) => v.id)
  const specMap = await fetchSpecializationsForVendors(client, vendorIds)

  let results = (vendors || []).map((v: any) => ({
    ...v,
    specializations: specMap.get(v.id) || [],
    categories: (specMap.get(v.id) || []).map((s: VendorSpecialization) => s.slug),
  }))

  // Filter by specialization if requested
  if (specializationId) {
    results = results.filter((v: any) =>
      v.specializations.some((s: VendorSpecialization) => s.id === specializationId)
    )
  }

  return results
}

/**
 * Find vendors with similar names — for duplicate detection.
 * Uses case-insensitive substring matching on both AR and EN characters.
 */
export async function findSimilarVendors(name: string): Promise<Array<Pick<Vendor, 'id' | 'display_name' | 'system_status'>>> {
  const client = await createAdminClient() as any

  // Normalize: remove common Arabic/English noise
  const normalized = name.trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_&]/g, '')

  if (normalized.length < 2) return []

  // Search for any vendor whose name contains any significant word from the query
  const words = normalized.split(' ').filter(w => w.length > 2)
  if (words.length === 0) return []

  // Use ilike with the full normalized name and individual words
  const filters = words.map(w => `display_name.ilike.%${w}%`).join(',')
  const { data, error } = await client
    .from('vendors')
    .select('id, display_name, system_status')
    .or(filters)
    .limit(5)

  if (error) return []
  return data || []
}

export async function getVendorSystemMessages(vendorId: string): Promise<SystemMessage[]> {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('vendor_system_messages')
    .select('*, staff_members(full_name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((m: any) => ({
    id:         m.id,
    vendor_id:  m.vendor_id,
    sent_by:    m.sent_by,
    message:    m.message,
    created_at: m.created_at,
    staff_name: m.staff_members?.full_name ?? null
  }))
}

export async function getVendorAuditLog(vendorId: string): Promise<VendorAuditEntry[]> {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('vendor_audit_log')
    .select('*, staff_members(full_name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  return (data || []).map((e: any) => ({
    ...e,
    actor_name: e.staff_members?.full_name ?? null
  }))
}

export async function getVendorReviews(vendorId: string): Promise<VendorReview[]> {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('vendor_reviews')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getVendorPortalToken(vendorId: string): Promise<VendorPortalToken | null> {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('vendor_portal_tokens')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const client = await createAdminClient() as any

  const { data: vendor, error } = await client
    .from('vendors')
    .insert({
      display_name:          input.display_name,
      commercial_reg_number: input.commercial_reg_number || null,
      tax_card_number:       input.tax_card_number || null,
      whatsapp_number:       input.whatsapp_number || null,
      governorate:           input.governorate || null,
      area:                  input.area || null,
      notes:                 input.notes || null,
      portal_enabled:        input.portal_enabled || false,
      portal_email:          input.portal_email || null,
      trust_score:           100,
      account_tier:          calcTier(100),
      system_status:         'Pending Verification'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Insert specializations
  if (input.specialization_ids && input.specialization_ids.length > 0) {
    const rows = input.specialization_ids.map(sid => ({
      vendor_id:         vendor.id,
      specialization_id: sid,
      category:          sid, // legacy column
    }))
    const { error: catErr } = await client.from('vendor_categories').insert(rows)
    if (catErr) throw new Error(catErr.message)
  }

  return vendor
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateVendor(vendorId: string, input: UpdateVendorInput): Promise<Vendor> {
  const client = await createAdminClient() as any

  const payload: Record<string, unknown> = {}
  if (input.display_name          !== undefined) payload.display_name          = input.display_name
  if (input.commercial_reg_number !== undefined) payload.commercial_reg_number = input.commercial_reg_number
  if (input.tax_card_number       !== undefined) payload.tax_card_number       = input.tax_card_number
  if (input.whatsapp_number       !== undefined) payload.whatsapp_number       = input.whatsapp_number
  if (input.governorate           !== undefined) payload.governorate           = input.governorate
  if (input.area                  !== undefined) payload.area                  = input.area
  if (input.notes                 !== undefined) payload.notes                 = input.notes
  if (input.system_status         !== undefined) payload.system_status         = input.system_status
  if (input.portal_enabled        !== undefined) payload.portal_enabled        = input.portal_enabled
  if (input.portal_email          !== undefined) payload.portal_email          = input.portal_email

  const { data: vendor, error } = await client
    .from('vendors')
    .update(payload)
    .eq('id', vendorId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Update specializations if provided
  if (input.specialization_ids !== undefined) {
    await client.from('vendor_categories').delete().eq('vendor_id', vendorId)
    if (input.specialization_ids.length > 0) {
      const rows = input.specialization_ids.map(sid => ({
        vendor_id:         vendorId,
        specialization_id: sid,
        category:          sid,
      }))
      const { error: catErr } = await client.from('vendor_categories').insert(rows)
      if (catErr) throw new Error(catErr.message)
    }
  }

  return vendor
}

// ─── ARCHIVE (staff) / HARD DELETE (admin only) ───────────────────────────────

export async function archiveVendor(vendorId: string, actorStaffId?: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client
    .from('vendors')
    .update({ system_status: 'Suspended' })
    .eq('id', vendorId)
  if (error) throw new Error(error.message)

  await client.from('vendor_audit_log').insert({
    vendor_id:  vendorId,
    actor_id:   actorStaffId || null,
    event_name: 'VENDOR_ARCHIVED',
    new_value:  { system_status: 'Suspended' }
  })
}

export async function hardDeleteVendor(vendorId: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client.from('vendors').delete().eq('id', vendorId)
  if (error) throw new Error(error.message)
}

// ─── SUSPEND / ACTIVATE ───────────────────────────────────────────────────────

export async function suspendVendor(vendorId: string, actorStaffId?: string, reason?: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client.rpc('fn_vendor_suspend', {
    p_vendor_id: vendorId,
    p_actor_id:  actorStaffId || null,
    p_reason:    reason || null
  })
  if (error) throw new Error(error.message)
}

export async function activateVendor(vendorId: string, actorStaffId?: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client.rpc('fn_vendor_activate', {
    p_vendor_id: vendorId,
    p_actor_id:  actorStaffId || null
  })
  if (error) throw new Error(error.message)
}

// ─── TRUST SCORE ──────────────────────────────────────────────────────────────

export async function adjustVendorTrustScore(
  vendorId:      string,
  delta:         number,
  actorStaffId?: string,
  reason?:       string
): Promise<{ old_score: number; new_score: number }> {
  const client = await createAdminClient() as any
  const { data, error } = await client.rpc('fn_vendor_adjust_trust', {
    p_vendor_id: vendorId,
    p_delta:     delta,
    p_actor_id:  actorStaffId || null,
    p_reason:    reason || null
  })
  if (error) throw new Error(error.message)
  return data
}

export async function refreshVendorTrustFromReviews(vendorId: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client.rpc('fn_refresh_vendor_trust_from_reviews', {
    p_vendor_id: vendorId
  })
  if (error) log.error('Failed to refresh vendor trust:', error.message)
}

// ─── SYSTEM MESSAGES ──────────────────────────────────────────────────────────

export async function sendVendorSystemMessage(
  vendorId: string,
  message:  string,
  staffId?: string
): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client.from('vendor_system_messages').insert({
    vendor_id: vendorId,
    sent_by:   staffId || null,
    message
  })
  if (error) throw new Error(error.message)
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export async function createReviewToken(
  vendorId:   string,
  requestId?: string,
  customerId?: string
): Promise<string> {
  const client = await createAdminClient() as any
  const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

  const { error } = await client.from('vendor_reviews').insert({
    vendor_id:       vendorId,
    request_id:      requestId || null,
    customer_id:     customerId || null,
    review_token:    token,
    token_expires_at: expiresAt,
  })
  if (error) throw new Error(error.message)
  return token
}

export async function getReviewByToken(token: string) {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('vendor_reviews')
    .select('id, vendor_id, token_expires_at, platform_rating, vendors(display_name)')
    .eq('review_token', token)
    .maybeSingle()

  if (error) return null
  return data
}

export async function submitReview(
  token: string,
  answers: {
    platform_rating?:       number
    platform_comment?:      string
    vendor_rating?:         number
    vendor_availability?:   number
    vendor_price_accuracy?: number
    vendor_communication?:  number
  }
): Promise<{ vendorId: string }> {
  const client = await createAdminClient() as any

  const { data: review, error: findErr } = await client
    .from('vendor_reviews')
    .select('id, vendor_id, token_expires_at, platform_rating')
    .eq('review_token', token)
    .maybeSingle()

  if (findErr || !review) throw new Error('Invalid review token')
  if (new Date(review.token_expires_at) < new Date()) throw new Error('Review token expired')
  if (review.platform_rating !== null) throw new Error('Review already submitted')

  const { error: updateErr } = await client
    .from('vendor_reviews')
    .update({
      ...answers,
      is_published: false, // admin approves first
    })
    .eq('review_token', token)

  if (updateErr) throw new Error(updateErr.message)

  // Trigger trust score refresh
  await refreshVendorTrustFromReviews(review.vendor_id)

  return { vendorId: review.vendor_id }
}

export async function publishReview(reviewId: string): Promise<void> {
  const client = await createAdminClient() as any
  const { data: review, error: findErr } = await client
    .from('vendor_reviews')
    .select('vendor_id')
    .eq('id', reviewId)
    .single()
  if (findErr) throw new Error(findErr.message)

  const { error } = await client
    .from('vendor_reviews')
    .update({ is_published: true })
    .eq('id', reviewId)
  if (error) throw new Error(error.message)

  await refreshVendorTrustFromReviews(review.vendor_id)
}

export async function archiveReview(reviewId: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client
    .from('vendor_reviews')
    .update({ is_archived: true, is_published: false })
    .eq('id', reviewId)
  if (error) throw new Error(error.message)
}

// ─── PORTAL TOKENS ────────────────────────────────────────────────────────────

export async function generatePortalToken(
  vendorId:    string,
  portalEmail?: string,
  createdBy?:  string
): Promise<VendorPortalToken> {
  const client = await createAdminClient() as any

  // Deactivate existing tokens
  await client
    .from('vendor_portal_tokens')
    .update({ is_active: false })
    .eq('vendor_id', vendorId)

  const { data, error } = await client
    .from('vendor_portal_tokens')
    .insert({
      vendor_id:    vendorId,
      portal_email: portalEmail || null,
      created_by:   createdBy || null,
      is_active:    true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Enable portal on vendor record
  await client.from('vendors').update({ portal_enabled: true, portal_email: portalEmail || null }).eq('id', vendorId)

  return data
}

// ─── AUTOMATION ───────────────────────────────────────────────────────────────

export async function buildVendorAutomationPayload(vendorId: string, requestData: {
  request_id:   string
  request_code: string
  title:        string
  budget?:      number
  governorate?: string
}): Promise<Record<string, unknown>> {
  const vendor = await getVendorById(vendorId)
  if (!vendor) throw new Error('Vendor not found')
  if (!vendor.whatsapp_number) throw new Error('Vendor has no automation WhatsApp number')

  const payload = {
    vendor_id:      vendor.id,
    vendor_name:    vendor.display_name,
    whatsapp_to:    vendor.whatsapp_number,
    request_id:     requestData.request_id,
    request_code:   requestData.request_code,
    request_title:  requestData.title,
    budget:         requestData.budget ?? null,
    governorate:    requestData.governorate ?? null,
    timestamp:      new Date().toISOString(),
    schema_version: '1.0'
  }

  const client = await createAdminClient() as any
  await client.from('vendor_automation_logs').insert({
    vendor_id:    vendorId,
    direction:    'outbound',
    message_type: 'request_notification',
    payload,
    status:       'queued'
  })

  return payload
}

export async function logVendorInboundEvent(vendorId: string | null, payload: Record<string, unknown>): Promise<void> {
  const client = await createAdminClient() as any
  await client.from('vendor_automation_logs').insert({
    vendor_id:    vendorId,
    direction:    'inbound',
    message_type: (payload.type as string) || 'unknown',
    payload,
    status:       'received'
  })
}
