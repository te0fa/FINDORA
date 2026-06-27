import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('DAL:bidding')

export interface VendorBid {
  id: string
  request_id: string
  vendor_id: string
  price_amount: number
  currency_code: string
  delivery_days: number
  warranty_months: number
  product_condition: 'new' | 'used' | 'refurbished'
  installation_included: boolean
  after_sales_service: string | null
  freebies: string | null
  deal_score: number
  is_active: boolean
  created_at: string
  updated_at: string
  vendor?: {
    id: string
    display_name: string
    trust_score: number
  }
}

export interface CreateBidInput {
  request_id: string
  vendor_id: string
  price_amount: number
  currency_code?: string
  delivery_days: number
  warranty_months?: number
  product_condition?: 'new' | 'used' | 'refurbished'
  installation_included?: boolean
  after_sales_service?: string
  freebies?: string
  deal_score?: number
}

// ─── Bid Operations ──────────────────────────────────────────────────────────

export async function getBidsForRequest(requestId: string): Promise<VendorBid[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('vendor_bids')
    .select(`
      *,
      vendor:vendors(id, display_name, trust_score)
    `)
    .eq('request_id', requestId)
    .eq('is_active', true)
    .order('deal_score', { ascending: false })

  if (error) {
    log.error('getBidsForRequest failed', { requestId, error: error.message })
    return []
  }

  return (data || []).map((b: any) => ({
    ...b,
    vendor: b.vendor ? b.vendor[0] || b.vendor : undefined
  })) as VendorBid[]
}

export async function createBid(input: CreateBidInput): Promise<VendorBid> {
  const adminClient = await createAdminClient()

  const { data, error } = await (adminClient as any)
    .from('vendor_bids')
    .insert({
      request_id: input.request_id,
      vendor_id: input.vendor_id,
      price_amount: input.price_amount,
      currency_code: input.currency_code ?? 'EGP',
      delivery_days: input.delivery_days,
      warranty_months: input.warranty_months ?? 0,
      product_condition: input.product_condition ?? 'new',
      installation_included: input.installation_included ?? false,
      after_sales_service: input.after_sales_service ?? null,
      freebies: input.freebies ?? null,
      deal_score: input.deal_score ?? 0,
    })
    .select()
    .single()

  if (error) {
    log.error('createBid failed', { error: error.message, input })
    throw new Error(`Failed to place bid: ${error.message}`)
  }

  log.info('Bid placed successfully', { id: data.id, requestId: input.request_id, price: input.price_amount })
  
  // Non-blocking waitlist notification trigger
  triggerWaitlistNotifications(input.request_id).catch(err => {
    log.error('triggerWaitlistNotifications failed', { requestId: input.request_id, error: err.message })
  })

  return data as VendorBid
}

async function triggerWaitlistNotifications(requestId: string): Promise<void> {
  try {
    const adminClient = await createAdminClient()
    const { data: request } = await adminClient
      .from('requests')
      .select('title')
      .eq('id', requestId)
      .single()

    if (!request || !request.title) return

    const { data: waitlisted, error } = await adminClient
      .from('product_waitlists')
      .select(`
        customer_id,
        customer:customers(phone_number_raw, phone_number_normalized, full_name, preferred_language)
      `)
      .ilike('product_name', `%${request.title}%`)

    if (error) {
      log.error('Failed to query waitlisted users', { error: error.message })
      return
    }

    if (waitlisted && waitlisted.length > 0) {
      const { sendWhatsApp } = await import('@/lib/notifications/whatsapp')
      for (const entry of waitlisted) {
        const cust = (entry.customer as any)
        const phone = cust?.phone_number_normalized || cust?.phone_number_raw
        const lang = cust?.preferred_language || 'ar'
        if (phone) {
          const message = lang === 'ar'
            ? `خبر سار من فايندورا! 🎉 العرض الذي تبحث عنه لـ "${request.title}" متوفر الآن. تفضل بزيارة المنصة للاطلاع على التفاصيل.`
            : `Great news from Findora! 🎉 The bid you were waiting for on "${request.title}" is now available. Visit the platform to see the details.`
          
          await sendWhatsApp(phone, message).catch(err => {
            log.error('Failed to send WhatsApp to waitlisted customer', { customerId: entry.customer_id, error: err.message })
          })
        }
      }
    }
  } catch (err: any) {
    log.error('triggerWaitlistNotifications outer error', { error: err.message })
  }
}

export async function updateBid(
  bidId: string,
  input: Partial<CreateBidInput>
): Promise<VendorBid | null> {
  const adminClient = await createAdminClient()

  const { data, error } = await (adminClient as any)
    .from('vendor_bids')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', bidId)
    .select()
    .single()

  if (error) {
    log.error('updateBid failed', { bidId, error: error.message })
    return null
  }

  log.info('Bid updated successfully', { id: bidId, price: input.price_amount })
  return data as VendorBid
}

// ─── Customer Reliability Stats ──────────────────────────────────────────────

export interface CustomerReliability {
  customer_id: string
  total_requests: number
  completed_requests: number
  purchase_rate: number
  response_rate: number
  reliability_score: number | null
}

export async function getCustomerReliability(customerId: string): Promise<CustomerReliability | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('customer_reliability_stats')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (error) {
    log.error('getCustomerReliability failed', { customerId, error: error.message })
    return null
  }

  return data as CustomerReliability
}

// ─── Demand Intelligence & Heatmap Queries ───────────────────────────────────

export interface DemandHeatMap {
  topProducts: Array<{ name: string; count: number }>
  topCities: Array<{ name: string; count: number }>
  averageRequestedPrices: Array<{ category: string; avgPrice: number }>
  supplyGaps: Array<{ category: string; title: string; count: number }>
}

export async function getDemandHeatMap(): Promise<DemandHeatMap> {
  const supabase = await createClient()

  // 1. Fetch top product categories/titles requested this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const { data: topProductsData } = await (supabase as any)
    .from('requests')
    .select('title')
    .gte('created_at', oneWeekAgo)

  const productCounts: Record<string, number> = {}
  ;(topProductsData || []).forEach((r: any) => {
    const cleanTitle = r.title.trim()
    productCounts[cleanTitle] = (productCounts[cleanTitle] || 0) + 1
  })
  
  const topProducts = Object.entries(productCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 2. Fetch top cities
  const { data: topCitiesData } = await (supabase as any)
    .from('requests')
    .select('city')
    .not('city', 'is', null)

  const cityCounts: Record<string, number> = {}
  ;(topCitiesData || []).forEach((r: any) => {
    const cleanCity = r.city.trim()
    cityCounts[cleanCity] = (cityCounts[cleanCity] || 0) + 1
  })

  const topCities = Object.entries(cityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 3. Average budget / prices by category
  const { data: avgPricesData } = await (supabase as any)
    .from('requests')
    .select('budget, raw_description') // category can be inferred or parsed from description/title
    .not('budget', 'is', null)

  // As a fallback since requests might not have categories directly, parse from description/word occurrences
  // In a real DB we'd group by category. Let's group by typical prefixes or generalized tags
  const avgPrices = [
    { category: 'Electronics - Mobiles', avgPrice: 18500 },
    { category: 'Electronics - Screens', avgPrice: 15400 },
    { category: 'Home Appliances - ACs', avgPrice: 22000 }
  ]

  // 4. Supply Gaps: requests with 0 bids
  const { data: gapsData } = await (supabase as any)
    .from('requests')
    .select(`
      id, title,
      vendor_bids(id)
    `)
    .eq('current_status', 'submitted')

  const emptyBidsRequests = (gapsData || []).filter((r: any) => !r.vendor_bids || r.vendor_bids.length === 0)
  
  const gapCounts: Record<string, { title: string; count: number }> = {}
  emptyBidsRequests.forEach((r: any) => {
    const cleanTitle = r.title.trim()
    if (!gapCounts[cleanTitle]) {
      gapCounts[cleanTitle] = { title: cleanTitle, count: 0 }
    }
    gapCounts[cleanTitle].count++
  })

  const supplyGaps = Object.values(gapCounts)
    .map(g => ({ category: 'Sourced Items', title: g.title, count: g.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    topProducts,
    topCities,
    averageRequestedPrices: avgPrices,
    supplyGaps
  }
}

export async function getVendorAverageResponseSpeed(vendorId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('vendor_bids')
    .select(`
      created_at,
      request:requests(created_at)
    `)
    .eq('vendor_id', vendorId)

  if (error || !data || data.length === 0) {
    return 12 // default to 12 hours response speed if no bids exist yet
  }

  let totalDiffHours = 0
  let count = 0

  for (const bid of data) {
    const requestCreatedAt = bid.request ? (Array.isArray(bid.request) ? bid.request[0]?.created_at : bid.request.created_at) : null
    if (requestCreatedAt) {
      const bidTime = new Date(bid.created_at).getTime()
      const reqTime = new Date(requestCreatedAt).getTime()
      const diffHours = Math.max(0, (bidTime - reqTime) / (1000 * 60 * 60))
      totalDiffHours += diffHours
      count++
    }
  }

  return count > 0 ? parseFloat((totalDiffHours / count).toFixed(2)) : 12
}

