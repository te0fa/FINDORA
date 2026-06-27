/**
 * src/lib/dal/products.ts
 * Data Access Layer — Products Catalog
 * All DB access for the products table goes through here.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('DAL:products')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductSpecifications {
  ram_gb?: number
  storage_gb?: number
  cpu_brand?: string
  cpu_cores?: number
  cpu_ghz?: number
  gpu?: string
  battery_mah?: number
  display_inches?: number
  display_hz?: number
  camera_mp?: number
  weight_grams?: number
  os?: string
  [key: string]: unknown
}

export interface Product {
  id: string
  title_ar: string
  title_en: string | null
  brand: string | null
  category: string
  subcategory: string | null
  current_price: number | null
  currency_code: string
  source: 'manual' | 'research_item' | 'vendor_feed'
  source_url: string | null
  vendor_id: string | null
  research_item_id: string | null
  specifications: ProductSpecifications
  image_url: string | null
  popularity_score: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProductWithTrend extends Product {
  trend?: {
    trend_7d: string | null
    trend_30d: string | null
    trend_score: number | null
    lowest_price: number | null
    highest_price: number | null
    average_price: number | null
  }
}

export interface CreateProductInput {
  title_ar: string
  title_en?: string
  brand?: string
  category: string
  subcategory?: string
  current_price?: number
  currency_code?: string
  source?: 'manual' | 'research_item' | 'vendor_feed'
  source_url?: string
  vendor_id?: string
  research_item_id?: string
  specifications?: ProductSpecifications
  image_url?: string
  created_by?: string
}

export interface UpdateProductInput {
  title_ar?: string
  title_en?: string
  brand?: string
  category?: string
  subcategory?: string
  current_price?: number
  source_url?: string
  vendor_id?: string
  specifications?: ProductSpecifications
  image_url?: string
  is_active?: boolean
  popularity_score?: number
}

export interface ListProductsOptions {
  category?: string
  brand?: string
  min_price?: number
  max_price?: number
  search?: string
  is_active?: boolean
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'current_price' | 'popularity_score'
  order_dir?: 'asc' | 'desc'
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getProductById(
  id: string,
  includeTrend = false
): Promise<ProductWithTrend | null> {
  const supabase = await createClient()

  const select = includeTrend
    ? '*, price_trends(trend_7d, trend_30d, trend_score, lowest_price, highest_price, average_price)'
    : '*'

  const { data, error } = await (supabase as any)
    .from('products')
    .select(select)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    log.error('getProductById failed', { id, error: error.message })
    return null
  }

  const { price_trends, ...product } = data ?? {}
  return {
    ...product,
    ...(includeTrend && price_trends?.[0] ? { trend: price_trends[0] } : {}),
  }
}

export async function listProducts(
  opts: ListProductsOptions = {}
): Promise<{ products: Product[]; total: number }> {
  const supabase = await createClient()
  const {
    category, brand, min_price, max_price, search,
    is_active = true, limit = 20, offset = 0,
    order_by = 'created_at', order_dir = 'desc',
  } = opts

  let query = (supabase as any)
    .from('products')
    .select('*', { count: 'exact' })

  if (is_active !== undefined) query = query.eq('is_active', is_active)
  if (category) query = query.eq('category', category)
  if (brand) query = query.eq('brand', brand)
  if (min_price !== undefined) query = query.gte('current_price', min_price)
  if (max_price !== undefined) query = query.lte('current_price', max_price)
  if (search) {
    query = query.or(`title_ar.ilike.%${search}%,title_en.ilike.%${search}%,brand.ilike.%${search}%`)
  }

  query = query
    .order(order_by, { ascending: order_dir === 'asc' })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    log.error('listProducts failed', { error: error.message, opts })
    return { products: [], total: 0 }
  }

  return { products: data ?? [], total: count ?? 0 }
}

export async function getProductsByCategory(category: string, limit = 10): Promise<Product[]> {
  const { products } = await listProducts({ category, limit, is_active: true })
  return products
}

export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  const { products } = await listProducts({ search: query, limit })
  return products
}

// Fetch products linked to a research item (for auto-import)
export async function getProductsByResearchItem(
  research_item_id: string
): Promise<Product | null> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('products')
    .select('*')
    .eq('research_item_id', research_item_id)
    .maybeSingle()

  if (error) {
    log.error('getProductsByResearchItem failed', { research_item_id, error: error.message })
    return null
  }
  return data
}

// ─── Write Operations ─────────────────────────────────────────────────────────

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const adminClient = await createAdminClient()

  const { data, error } = await (adminClient as any)
    .from('products')
    .insert({
      title_ar: input.title_ar,
      title_en: input.title_en ?? null,
      brand: input.brand ?? null,
      category: input.category,
      subcategory: input.subcategory ?? null,
      current_price: input.current_price ?? null,
      currency_code: input.currency_code ?? 'EGP',
      source: input.source ?? 'manual',
      source_url: input.source_url ?? null,
      vendor_id: input.vendor_id ?? null,
      research_item_id: input.research_item_id ?? null,
      specifications: input.specifications ?? {},
      image_url: input.image_url ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single()

  if (error) {
    log.error('createProduct failed', { error: error.message, input })
    throw new Error(`Failed to create product: ${error.message}`)
  }

  log.info('Product created', { id: data.id, title: input.title_ar })
  return data
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product | null> {
  const adminClient = await createAdminClient()

  const { data, error } = await (adminClient as any)
    .from('products')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    log.error('updateProduct failed', { id, error: error.message })
    return null
  }

  log.info('Product updated', { id, fields: Object.keys(input) })
  return data
}

export async function archiveProduct(id: string): Promise<boolean> {
  const result = await updateProduct(id, { is_active: false })
  return !!result
}

export async function incrementPopularity(id: string): Promise<void> {
  const adminClient = await createAdminClient()
  await (adminClient as any).rpc('increment_product_popularity', { product_id: id })
}

// ─── Auto-import from research_items ─────────────────────────────────────────

export interface ResearchItemForImport {
  id: string
  product_name_en: string | null
  source_name: string
  listing_url: string | null
  currency_code: string | null
  metadata: Record<string, unknown> | null
}

export async function importProductFromResearchItem(
  item: ResearchItemForImport,
  staffId: string,
  category: string
): Promise<Product | null> {
  // Check if already imported
  const existing = await getProductsByResearchItem(item.id)
  if (existing) {
    log.warn('Research item already imported as product', { itemId: item.id, productId: existing.id })
    return existing
  }

  return createProduct({
    title_ar: item.product_name_en ?? 'منتج غير محدد',
    title_en: item.product_name_en ?? undefined,
    category,
    source: 'research_item',
    source_url: item.listing_url ?? undefined,
    research_item_id: item.id,
    currency_code: item.currency_code ?? 'EGP',
    specifications: (item.metadata as ProductSpecifications) ?? {},
    created_by: staffId,
  })
}

// ─── Category helpers ─────────────────────────────────────────────────────────

export async function getDistinctCategories(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('products')
    .select('category')
    .eq('is_active', true)
    .order('category')

  if (error) return []
  const unique = [...new Set((data ?? []).map((r: any) => r.category as string))]
  return unique.filter(Boolean) as string[]
}

export async function getDistinctBrands(category?: string): Promise<string[]> {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('products')
    .select('brand')
    .eq('is_active', true)
    .not('brand', 'is', null)

  if (category) query = query.eq('category', category)

  const { data, error } = await query.order('brand')
  if (error) return []
  const unique = [...new Set((data ?? []).map((r: any) => r.brand as string))]
  return unique.filter(Boolean) as string[]
}
