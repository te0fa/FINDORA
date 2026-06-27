import { createAdminClient } from './customers'
import { createClient } from '@/lib/supabase/server'
import type { Specialization, SpecializationTree } from './specializations-client'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:specializations');


export type { Specialization, SpecializationTree }

export interface CreateSpecializationInput {
  slug:          string
  name_en:       string
  name_ar:       string
  parent_id?:    string | null
  display_order?: number
}

export interface UpdateSpecializationInput {
  name_en?:      string
  name_ar?:      string
  parent_id?:    string | null
  display_order?: number
  is_active?:    boolean
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/** Flat list — all specializations including inactive (admin use) */
export async function getAllSpecializations(): Promise<Specialization[]> {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('specializations')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name_en', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

/** Flat list — only active specializations (public use) */
export async function getActiveSpecializations(): Promise<Specialization[]> {
  const client = await createClient() as any
  const { data, error } = await client
    .from('specializations')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name_en', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

/** Hierarchical tree — active specializations nested under parents */
export async function getSpecializationsTree(): Promise<SpecializationTree[]> {
  const all = await getActiveSpecializations()
  return buildTree(all)
}

/** Admin tree — includes inactive */
export async function getSpecializationsTreeAdmin(): Promise<SpecializationTree[]> {
  const all = await getAllSpecializations()
  return buildTree(all)
}

function buildTree(flat: Specialization[]): SpecializationTree[] {
  const map = new Map<string, SpecializationTree>()
  const roots: SpecializationTree[] = []

  for (const item of flat) {
    map.set(item.id, { ...item, children: [] })
  }

  for (const item of flat) {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/** Get single specialization by ID */
export async function getSpecializationById(id: string): Promise<Specialization | null> {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('specializations')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** Get specialization by slug */
export async function getSpecializationBySlug(slug: string): Promise<Specialization | null> {
  const client = await createAdminClient() as any
  const { data, error } = await client
    .from('specializations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createSpecialization(input: CreateSpecializationInput): Promise<Specialization> {
  const client = await createAdminClient() as any

  // Check slug uniqueness
  const { data: existing } = await client
    .from('specializations')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle()

  if (existing) throw new Error(`Slug "${input.slug}" already exists`)

  const { data, error } = await client
    .from('specializations')
    .insert({
      slug:          input.slug,
      name_en:       input.name_en,
      name_ar:       input.name_ar,
      parent_id:     input.parent_id || null,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateSpecialization(id: string, input: UpdateSpecializationInput): Promise<Specialization> {
  const client = await createAdminClient() as any

  const payload: Record<string, unknown> = {}
  if (input.name_en       !== undefined) payload.name_en       = input.name_en
  if (input.name_ar       !== undefined) payload.name_ar       = input.name_ar
  if (input.parent_id     !== undefined) payload.parent_id     = input.parent_id
  if (input.display_order !== undefined) payload.display_order = input.display_order
  if (input.is_active     !== undefined) payload.is_active     = input.is_active

  const { data, error } = await client
    .from('specializations')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── ARCHIVE (staff) ──────────────────────────────────────────────────────────

/** Staff action: deactivate/archive a specialization (not delete) */
export async function archiveSpecialization(id: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client
    .from('specializations')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Restore an archived specialization */
export async function restoreSpecialization(id: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client
    .from('specializations')
    .update({ is_active: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── HARD DELETE (admin only) ─────────────────────────────────────────────────

/** Admin only: permanently delete a specialization */
export async function hardDeleteSpecialization(id: string): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client
    .from('specializations')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── REORDER ──────────────────────────────────────────────────────────────────

export async function reorderSpecializations(
  updates: Array<{ id: string; display_order: number }>
): Promise<void> {
  const client = await createAdminClient() as any
  for (const u of updates) {
    await client
      .from('specializations')
      .update({ display_order: u.display_order })
      .eq('id', u.id)
  }
}

// ─── BEACHHEAD MARKET ACTIONS ──────────────────────────────────────────────────

export interface BeachheadMetrics {
  currentMerchants: number
  targetMerchants: number
  currentDeals: number
  targetDeals: number
  totalRequests: number
  conversionRate: number
  isReady: boolean
}

/** Get live business metrics for a target specialization */
export async function getBeachheadMetrics(specializationId: string, targetMerchants = 10, targetDeals = 5): Promise<BeachheadMetrics> {
  const client = await createAdminClient() as any

  try {
    // 1. Get active merchants count in this specialization
    const { count: merchantCount, error: mErr } = await client
      .from('vendor_categories')
      .select('vendor_id', { count: 'exact', head: true })
      .eq('specialization_id', specializationId)

    if (mErr) throw mErr
    const currentMerchants = merchantCount || 0

    // 2. Find vendor IDs in this specialization
    const { data: vendorsData, error: vErr } = await client
      .from('vendor_categories')
      .select('vendor_id')
      .eq('specialization_id', specializationId)

    if (vErr) throw vErr
    const vendorIds = (vendorsData || []).map((v: any) => v.vendor_id)

    if (vendorIds.length === 0) {
      return {
        currentMerchants,
        targetMerchants,
        currentDeals: 0,
        targetDeals,
        totalRequests: 0,
        conversionRate: 0,
        isReady: false
      }
    }

    // 3. Count requests and completed deals based on merchant quotes
    const { data: quotesData, error: qErr } = await client
      .from('merchant_quotes')
      .select('request_id, merchant_id')
      .in('merchant_id', vendorIds)

    if (qErr) throw qErr
    const requestIds = Array.from(new Set((quotesData || []).map((q: any) => q.request_id)))

    if (requestIds.length === 0) {
      return {
        currentMerchants,
        targetMerchants,
        currentDeals: 0,
        targetDeals,
        totalRequests: 0,
        conversionRate: 0,
        isReady: false
      }
    }

    // 4. Query requests to count total & completed ones
    const { data: requestsData, error: rErr } = await client
      .from('requests')
      .select('id, current_status')
      .in('id', requestIds)

    if (rErr) throw rErr
    const totalRequests = (requestsData || []).length
    const currentDeals = (requestsData || []).filter(
      (r: any) => r.current_status === 'completed' || r.current_status === 'closed'
    ).length

    const conversionRate = totalRequests > 0 ? Math.round((currentDeals / totalRequests) * 1000) / 10 : 0
    const isReady = currentMerchants >= targetMerchants && currentDeals >= targetDeals

    return {
      currentMerchants,
      targetMerchants,
      currentDeals,
      targetDeals,
      totalRequests,
      conversionRate,
      isReady
    }
  } catch (error) {
    log.error(`[BEACHHEAD DAL] Error computing metrics for ${specializationId}:`, error)
    return {
      currentMerchants: 0,
      targetMerchants,
      currentDeals: 0,
      targetDeals,
      totalRequests: 0,
      conversionRate: 0,
      isReady: false
    }
  }
}

/** Set one specialization as active beachhead, disable all others */
export async function setBeachheadActive(id: string): Promise<void> {
  const client = await createAdminClient() as any
  
  // 1. Reset all beachhead flags
  const { error: resetErr } = await client
    .from('specializations')
    .update({ is_beachhead: false })
    .neq('id', id) // update all others
  
  if (resetErr) throw new Error(resetErr.message)

  // 2. Set this one as active beachhead
  const { error: setErr } = await client
    .from('specializations')
    .update({ is_beachhead: true })
    .eq('id', id)

  if (setErr) throw new Error(setErr.message)
}

/** Update beachhead targets, priorities, notes or criteria checks */
export async function updateBeachheadConfig(
  id: string,
  input: {
    priority_stars?: number
    description_ar?: string
    description_en?: string
    target_merchants?: number
    target_deals?: number
    criteria_json?: any
  }
): Promise<void> {
  const client = await createAdminClient() as any
  const { error } = await client
    .from('specializations')
    .update(input)
    .eq('id', id)

  if (error) throw new Error(error.message)
}


// ─── HELPERS ──────────────────────────────────────────────────────────────────


