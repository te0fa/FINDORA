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

  // Fetch bids for the request
  const bids = await getBidsForRequest(requestId)
  return NextResponse.json({ bids })
}

// ─── POST — Submit / Update Bid ──────────────────────────────────────────────

async function postBidHandler(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    request_id,
    vendor_id,
    price_amount,
    delivery_days,
    warranty_months = 0,
    product_condition = 'new',
    installation_included = false,
    after_sales_service,
    freebies
  } = body

  if (!request_id || !vendor_id || !price_amount || !delivery_days) {
    return NextResponse.json({ error: 'Missing required bid parameters' }, { status: 400 })
  }

  // 1. Fetch request details to get budget and priority
  const { data: sourcingRequest, error: reqErr } = await supabase
    .from('requests')
    .select('budget, priority')
    .eq('id', request_id)
    .single()

  if (reqErr || !sourcingRequest) {
    return NextResponse.json({ error: 'Sourcing request not found' }, { status: 404 })
  }

  // 2. Fetch vendor details to verify rating
  const { data: vendor, error: vendorErr } = await supabase
    .from('vendors')
    .select('trust_score')
    .eq('id', vendor_id)
    .single()

  if (vendorErr || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const vendorRating = (vendor as any).trust_score ?? 85

  // Fetch average response speed
  const avgResponseSpeedHours = await getVendorAverageResponseSpeed(vendor_id)

  // 3. Compute Deal Score
  const mockBid = {
    price_amount: Number(price_amount),
    delivery_days: Number(delivery_days),
    warranty_months: Number(warranty_months),
    product_condition,
    installation_included: Boolean(installation_included)
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
      price_amount: Number(price_amount),
      delivery_days: Number(delivery_days),
      warranty_months: Number(warranty_months),
      product_condition,
      installation_included: Boolean(installation_included),
      after_sales_service,
      freebies,
      deal_score: dealScore
    })
  } else {
    // Insert new bid
    bid = await createBid({
      request_id,
      vendor_id,
      price_amount: Number(price_amount),
      delivery_days: Number(delivery_days),
      warranty_months: Number(warranty_months),
      product_condition,
      installation_included: Boolean(installation_included),
      after_sales_service,
      freebies,
      deal_score: dealScore
    })
  }

  // 5. Get AI Feedback
  const aiFeedback = await getAiBiddingFeedback(
    request_id,
    vendor_id,
    Number(price_amount),
    Number(delivery_days),
    Number(warranty_months),
    product_condition,
    Boolean(installation_included)
  )

  return NextResponse.json({
    success: true,
    bid,
    scoreBreakdown,
    aiFeedback
  })
}

export const GET  = withRateLimit(STANDARD_RATE_LIMIT, getBidsHandler)
export const POST = withRateLimit(AUTH_RATE_LIMIT, postBidHandler)
