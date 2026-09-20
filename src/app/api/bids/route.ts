import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBidsForRequest, createBid, updateBid, getVendorAverageResponseSpeed } from '@/lib/dal/bidding'
import { calculateDealScore, getAiBiddingFeedback } from '@/lib/products/bidding-engine'
import { withRateLimit, STANDARD_RATE_LIMIT, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:bids')

// ─── GET — Fetch Bids ────────────────────────────────────────────────────────

async function getBidsHandler(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams
  const requestId = sp.get('request_id')

  if (!requestId) {
    return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user is staff/admin
  const { data: staffMember } = await (supabase as any)
    .from('staff_members')
    .select('id, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (staffMember) {
    // Staff/admin can view all bids for the request
    const bids = await getBidsForRequest(requestId)
    return NextResponse.json({ bids })
  }

  // Normal vendor: resolve vendor from authenticated user ID
  const { data: vendor, error: vendorErr } = await supabase
    .from('vendors')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (vendorErr || !vendor) {
    return NextResponse.json({ error: 'Vendor account not found' }, { status: 403 })
  }

  // Fetch only bids belonging to this authenticated vendor (Database-level scoping)
  const { data: bidsData, error: bidsErr } = await (supabase as any)
    .from('vendor_bids')
    .select(`
      *,
      vendor:vendors(id, display_name, trust_score)
    `)
    .eq('request_id', requestId)
    .eq('vendor_id', vendor.id)
    .eq('is_active', true)
    .order('deal_score', { ascending: false })

  if (bidsErr) {
    log.error('getBidsHandler failed', { error: bidsErr.message, requestId, vendorId: vendor.id })
    return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
  }

  const bids = (bidsData || []).map((b: any) => ({
    ...b,
    vendor: b.vendor ? (Array.isArray(b.vendor) ? b.vendor[0] : b.vendor) : undefined
  }))

  return NextResponse.json({ bids })
}

// ─── Validation Helper ───────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_PRODUCT_CONDITIONS = ['new', 'used', 'refurbished'] as const
type ProductCondition = typeof ALLOWED_PRODUCT_CONDITIONS[number]

export interface ValidatedBidInput {
  request_id: string
  vendor_id: string
  price_amount: number
  delivery_days: number
  warranty_months: number
  product_condition: ProductCondition
  installation_included: boolean
  after_sales_service?: string
  freebies?: string
}

export type ValidationResult =
  | { valid: true; data: ValidatedBidInput }
  | { valid: false; error: string }

export function validateBidInput(body: any): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a valid JSON object' }
  }

  // 1. request_id
  if (!body.request_id || typeof body.request_id !== 'string' || !UUID_REGEX.test(body.request_id)) {
    return { valid: false, error: 'request_id must be a valid UUID' }
  }

  // 2. vendor_id
  if (!body.vendor_id || typeof body.vendor_id !== 'string' || !UUID_REGEX.test(body.vendor_id)) {
    return { valid: false, error: 'vendor_id must be a valid UUID' }
  }

  // 3. price_amount
  const priceVal = body.price_amount
  if (priceVal === null || priceVal === undefined || typeof priceVal === 'boolean' || Array.isArray(priceVal) || typeof priceVal === 'object') {
    return { valid: false, error: 'price_amount must be a valid positive number' }
  }

  let numericPrice: number
  if (typeof priceVal === 'number') {
    if (!Number.isFinite(priceVal)) {
      return { valid: false, error: 'price_amount must be a finite number' }
    }
    const str = priceVal.toString()
    if (str.toLowerCase().includes('e')) {
      return { valid: false, error: 'price_amount cannot use exponential notation' }
    }
    const parts = str.split('.')
    if (parts.length > 1 && parts[1].length > 2) {
      return { valid: false, error: 'price_amount cannot have more than 2 decimal places' }
    }
    numericPrice = priceVal
  } else if (typeof priceVal === 'string') {
    if (!/^\d+(\.\d{1,2})?$/.test(priceVal)) {
      return { valid: false, error: 'price_amount must be a numeric string with at most 2 decimal places' }
    }
    numericPrice = Number(priceVal)
    if (!Number.isFinite(numericPrice)) {
      return { valid: false, error: 'price_amount must be a finite number' }
    }
  } else {
    return { valid: false, error: 'price_amount must be a number or numeric string' }
  }

  if (numericPrice <= 0) {
    return { valid: false, error: 'price_amount must be greater than 0' }
  }
  if (numericPrice > 100_000_000) {
    return { valid: false, error: 'price_amount cannot exceed 100,000,000' }
  }

  // 4. delivery_days
  const deliveryVal = body.delivery_days
  if (deliveryVal === null || deliveryVal === undefined || typeof deliveryVal === 'boolean' || Array.isArray(deliveryVal) || typeof deliveryVal === 'object') {
    return { valid: false, error: 'delivery_days must be a valid integer between 1 and 365' }
  }

  let numericDeliveryDays: number
  if (typeof deliveryVal === 'number') {
    if (!Number.isInteger(deliveryVal)) {
      return { valid: false, error: 'delivery_days must be an integer' }
    }
    numericDeliveryDays = deliveryVal
  } else if (typeof deliveryVal === 'string') {
    if (!/^[1-9]\d*$/.test(deliveryVal)) {
      return { valid: false, error: 'delivery_days must be a positive integer string' }
    }
    numericDeliveryDays = Number(deliveryVal)
    if (!Number.isInteger(numericDeliveryDays)) {
      return { valid: false, error: 'delivery_days must be an integer' }
    }
  } else {
    return { valid: false, error: 'delivery_days must be a number or numeric string' }
  }

  if (numericDeliveryDays < 1 || numericDeliveryDays > 365) {
    return { valid: false, error: 'delivery_days must be between 1 and 365' }
  }

  // 5. warranty_months
  const warrantyVal = body.warranty_months
  let numericWarrantyMonths = 0
  if (warrantyVal !== undefined) {
    if (warrantyVal === null || typeof warrantyVal === 'boolean' || Array.isArray(warrantyVal) || typeof warrantyVal === 'object') {
      return { valid: false, error: 'warranty_months must be an integer between 0 and 120' }
    }

    if (typeof warrantyVal === 'number') {
      if (!Number.isInteger(warrantyVal)) {
        return { valid: false, error: 'warranty_months must be an integer' }
      }
      numericWarrantyMonths = warrantyVal
    } else if (typeof warrantyVal === 'string') {
      if (!/^(0|[1-9]\d*)$/.test(warrantyVal)) {
        return { valid: false, error: 'warranty_months must be a valid integer string' }
      }
      numericWarrantyMonths = Number(warrantyVal)
      if (!Number.isInteger(numericWarrantyMonths)) {
        return { valid: false, error: 'warranty_months must be an integer' }
      }
    } else {
      return { valid: false, error: 'warranty_months must be a number or numeric string' }
    }

    if (numericWarrantyMonths < 0 || numericWarrantyMonths > 120) {
      return { valid: false, error: 'warranty_months must be between 0 and 120' }
    }
  }

  // 6. product_condition
  const conditionVal = body.product_condition
  let product_condition: ProductCondition = 'new'
  if (conditionVal !== undefined) {
    if (typeof conditionVal !== 'string' || !ALLOWED_PRODUCT_CONDITIONS.includes(conditionVal as any)) {
      return { valid: false, error: 'product_condition must be one of: new, used, refurbished' }
    }
    product_condition = conditionVal as ProductCondition
  }

  // 7. installation_included
  const installVal = body.installation_included
  let installation_included = false
  if (installVal !== undefined) {
    if (typeof installVal !== 'boolean') {
      return { valid: false, error: 'installation_included must be a boolean' }
    }
    installation_included = installVal
  }

  // 8. after_sales_service & freebies
  let after_sales_service: string | undefined = undefined
  if (body.after_sales_service !== undefined && body.after_sales_service !== null) {
    if (typeof body.after_sales_service !== 'string') {
      return { valid: false, error: 'after_sales_service must be a string' }
    }
    if (body.after_sales_service.length > 500) {
      return { valid: false, error: 'after_sales_service cannot exceed 500 characters' }
    }
    after_sales_service = body.after_sales_service
  }

  let freebies: string | undefined = undefined
  if (body.freebies !== undefined && body.freebies !== null) {
    if (typeof body.freebies !== 'string') {
      return { valid: false, error: 'freebies must be a string' }
    }
    if (body.freebies.length > 500) {
      return { valid: false, error: 'freebies cannot exceed 500 characters' }
    }
    freebies = body.freebies
  }

  return {
    valid: true,
    data: {
      request_id: body.request_id,
      vendor_id: body.vendor_id,
      price_amount: numericPrice,
      delivery_days: numericDeliveryDays,
      warranty_months: numericWarrantyMonths,
      product_condition,
      installation_included,
      after_sales_service,
      freebies,
    }
  }
}

// ─── POST — Submit / Update Bid ──────────────────────────────────────────────

async function postBidHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const validation = validateBidInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const {
      request_id,
      vendor_id,
      price_amount,
      delivery_days,
      warranty_months,
      product_condition,
      installation_included,
      after_sales_service,
      freebies
    } = validation.data

    // Check if user is staff/admin
    const { data: staffMember } = await (supabase as any)
      .from('staff_members')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const isStaff = !!staffMember

    // 1. Fetch request details to get budget and priority
    const { data: sourcingRequest, error: reqErr } = await supabase
      .from('requests')
      .select('budget, priority')
      .eq('id', request_id)
      .single()

    if (reqErr || !sourcingRequest) {
      return NextResponse.json({ error: 'Sourcing request not found' }, { status: 404 })
    }

    // 2. Fetch vendor details and enforce vendor ownership
    const { data: vendor, error: vendorErr } = await supabase
      .from('vendors')
      .select('id, auth_user_id, trust_score')
      .eq('id', vendor_id)
      .single()

    if (vendorErr || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Security Invariant: A non-staff user may only submit/update bids for their own vendor record
    if (!isStaff && (vendor as any).auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const vendorRating = (vendor as any).trust_score ?? 85

    // Fetch average response speed
    const avgResponseSpeedHours = await getVendorAverageResponseSpeed(vendor_id)

    // 3. Compute Deal Score
    const mockBid = {
      price_amount,
      delivery_days,
      warranty_months,
      product_condition,
      installation_included
    }

    const scoreBreakdown = calculateDealScore(mockBid, sourcingRequest, vendorRating, avgResponseSpeedHours)
    const dealScore = scoreBreakdown.total

    // 4. Check if bid already exists for this vendor on this request
    const { data: existingBid } = await supabase
      .from('vendor_bids')
      .select('id')
      .eq('request_id', request_id)
      .eq('vendor_id', vendor_id)
      .maybeSingle()

    let bid
    if (existingBid) {
      // Update existing bid
      bid = await updateBid((existingBid as any).id, {
        price_amount,
        delivery_days,
        warranty_months,
        product_condition,
        installation_included,
        after_sales_service,
        freebies,
        deal_score: dealScore
      })
    } else {
      // Insert new bid
      bid = await createBid({
        request_id,
        vendor_id,
        price_amount,
        delivery_days,
        warranty_months,
        product_condition,
        installation_included,
        after_sales_service,
        freebies,
        deal_score: dealScore
      })
    }

    // 5. Get AI Feedback
    const aiFeedback = await getAiBiddingFeedback(
      request_id,
      vendor_id,
      price_amount,
      delivery_days,
      warranty_months,
      product_condition,
      installation_included
    )

    return NextResponse.json({
      success: true,
      bid,
      scoreBreakdown,
      aiFeedback
    })
  } catch (error: any) {
    log.error('postBidHandler unexpected error', { error: error?.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET  = withRateLimit(STANDARD_RATE_LIMIT, getBidsHandler)
export const POST = withRateLimit(AUTH_RATE_LIMIT, postBidHandler)
