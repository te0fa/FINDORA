import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('DAL:marketplace')

export interface Vendor {
  id: string
  business_name_en: string
  business_name_ar: string
  contact_phone: string
  status: string
  created_at: string
}

export interface MarketplaceProduct {
  id: string
  vendor_id: string
  product_name_en: string
  product_name_ar: string
  category: string
  base_price_egp: number
  is_active: boolean
  vendor?: Vendor
}

export interface MarketplaceDeal {
  id: string
  product_id: string
  deal_title_en: string
  deal_title_ar: string
  platform_markup_pct: number
  final_customer_price_egp: number
  is_featured: boolean
  status: string
  product?: MarketplaceProduct
}

const db = createAdminClient()

/**
 * VENDORS
 */
export async function getActiveVendors() {
  const { data, error } = await db
    .from('vendors')
    .select('*')
    .eq('system_status', 'Active')
    .order('created_at', { ascending: false })
  if (error) log.error('[DAL] Error fetching vendors:', error)
  
  return (data || []).map((v) => ({
    id: v.id,
    business_name_en: v.display_name,
    business_name_ar: v.display_name,
    contact_phone: v.whatsapp_number || '',
    status: v.system_status,
    created_at: v.created_at
  }))
}

export async function createVendor(vendorData: Partial<Vendor>) {
  const { data, error } = await db
    .from('vendors')
    .insert({
      display_name: vendorData.business_name_ar || vendorData.business_name_en || '',
      whatsapp_number: vendorData.contact_phone,
      system_status: vendorData.status || 'Pending Verification'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return {
    id: data.id,
    business_name_en: data.display_name,
    business_name_ar: data.display_name,
    contact_phone: data.whatsapp_number || '',
    status: data.system_status,
    created_at: data.created_at
  } as unknown as Vendor
}

/**
 * PRODUCTS
 */
export async function getProductsWithVendors() {
  const { data, error } = await db
    .from('marketplace_products')
    .select('*, vendor:vendors(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) log.error('[DAL] Error fetching products:', error)
  
  return (data || []).map((row: any) => ({
    id: row.id,
    vendor_id: row.vendor_id,
    product_name_en: row.title_en,
    product_name_ar: row.title_ar,
    category: row.category,
    base_price_egp: Number(row.base_price_egp),
    is_active: row.status === 'active',
    vendor: row.vendor ? {
      id: row.vendor.id,
      business_name_en: row.vendor.display_name,
      business_name_ar: row.vendor.display_name,
      contact_phone: row.vendor.whatsapp_number || '',
      status: row.vendor.system_status,
      created_at: row.vendor.created_at
    } : undefined
  }))
}

export async function createProduct(productData: Partial<MarketplaceProduct>) {
  const insertData = {
    vendor_id: productData.vendor_id!,
    title_ar: productData.product_name_ar || '',
    title_en: productData.product_name_en || '',
    description_ar: '',
    description_en: '',
    category: productData.category || 'Electronics',
    base_price_egp: productData.base_price_egp || 0,
    status: productData.is_active === false ? 'suspended' : 'active'
  }

  const { data, error } = await db
    .from('marketplace_products')
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    vendor_id: data.vendor_id,
    product_name_en: data.title_en,
    product_name_ar: data.title_ar,
    category: data.category,
    base_price_egp: Number(data.base_price_egp),
    is_active: data.status === 'active'
  } as unknown as MarketplaceProduct
}

/**
 * DEALS
 */
export async function getPublishedDeals() {
  const { data, error } = await db
    .from('marketplace_deals')
    .select('*, product:marketplace_products(*, vendor:vendors(*))')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  
  if (error) log.error('[DAL] Error fetching deals:', error)
  return data || []
}

export async function createDeal(dealData: Partial<MarketplaceDeal>) {
  // Fetch default markup from config if not provided
  let markup = dealData.platform_markup_pct
  if (!markup) {
    const { data: config } = await db.from('economy_config').select('value').eq('config_key', 'deals_commission').maybeSingle()
    const configRow = config as { value: Record<string, number> } | null
    markup = configRow?.value?.default_markup_pct || 5.0
  }

  // Calculate final price based on the product's base price
  const { data: productRow } = await db.from('marketplace_products').select('base_price_egp').eq('id', dealData.product_id!).maybeSingle()
  const product = productRow as { base_price_egp: number } | null
  if (!product) throw new Error('Product not found')

  const basePrice = Number(product.base_price_egp)
  const finalPrice = basePrice + (basePrice * (Number(markup) / 100))

  const { data, error } = await (db.from('marketplace_deals') as any).insert({
    ...dealData,
    platform_markup_pct: markup,
    final_customer_price_egp: finalPrice
  }).select().single()

  if (error) throw new Error(error.message)
  return data as unknown as MarketplaceDeal
}
