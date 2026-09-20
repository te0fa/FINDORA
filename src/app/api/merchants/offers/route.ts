/**
 * /api/merchants/offers — Merchant Offer Compatibility Route
 *
 * Backed by the authoritative `vendors` + `vendor_bids` tables.
 *
 * P0-07 remediation: all references to the retired `merchant_profiles` and
 * `merchant_offers` tables have been replaced with the current architecture.
 *
 * POST: Authenticated vendor submits or updates a bid for a sourcing request.
 * GET:  Authenticated vendor retrieves their own bids.
 *       Staff can retrieve bids, optionally filtered by vendorId query param.
 *
 * Security invariant: vendor identity is ALWAYS derived from
 * auth.uid() → vendors.auth_user_id. No client-supplied merchantId/vendorId
 * is used to establish ownership.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:merchants/offers')

// Only Active vendors may submit offers.
// 'Suspended' and 'Pending Verification' are explicitly denied.
const ALLOWED_VENDOR_STATUSES = ['Active'] as const

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Parse and validate body ─────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { requestId, priceOfferedEgp, estimatedDays, notes } = body as Record<string, unknown>

    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }
    if (!priceOfferedEgp || Number(priceOfferedEgp) <= 0) {
      return NextResponse.json({ error: 'A valid priceOfferedEgp is required' }, { status: 400 })
    }
    if (!estimatedDays || Number(estimatedDays) <= 0) {
      return NextResponse.json({ error: 'estimatedDays is required and must be positive' }, { status: 400 })
    }

    const db = createAdminClient()

    // ── 3. Check staff role ───────────────────────────────────────────────
    const { data: staffMember } = await (db as any)
      .from('staff_members')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const isStaff = !!staffMember

    // ── 4. Resolve vendor identity from authenticated session ─────────────
    // Ownership derived from auth.uid() only. Never trust a client-supplied ID.
    const { data: vendor, error: vendorErr } = await (db as any)
      .from('vendors')
      .select('id, system_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!isStaff && (vendorErr || !vendor)) {
      return NextResponse.json({ error: 'Vendor account not found' }, { status: 403 })
    }

    // ── 5. Enforce vendor status ──────────────────────────────────────────
    if (!isStaff && !ALLOWED_VENDOR_STATUSES.includes(vendor.system_status)) {
      return NextResponse.json(
        { error: 'Vendor account is not eligible to submit offers' },
        { status: 403 }
      )
    }

    // For staff acting on behalf of a vendor, accept vendorId from body
    const effectiveVendorId: string = isStaff
      ? ((body.vendorId as string | undefined) ?? vendor?.id)
      : vendor.id

    if (!effectiveVendorId) {
      return NextResponse.json({ error: 'Vendor identity could not be resolved' }, { status: 400 })
    }

    // ── 6. Verify sourcing request exists (authoritative requests table) ──
    const { data: sourcingRequest, error: reqErr } = await (db as any)
      .from('requests')
      .select('id, selected_bid_id, auction_ends_at, current_status, is_archived')
      .eq('id', requestId)
      .maybeSingle()

    if (reqErr || !sourcingRequest) {
      return NextResponse.json({ error: 'Sourcing request not found' }, { status: 404 })
    }

    // Pre-flight auction closure checks (P2-03)
    if (sourcingRequest.is_archived) {
      return NextResponse.json({ error: 'AUCTION_CLOSED: Sourcing request is archived.', code: 'AUCTION_CLOSED' }, { status: 409 })
    }

    const currentStatus = sourcingRequest.current_status || 'open'
    if (!['open', 'submitted', 'assigned'].includes(currentStatus)) {
      return NextResponse.json({ error: `AUCTION_CLOSED: Sourcing request is not open for bidding (status: ${sourcingRequest.current_status}).`, code: 'AUCTION_CLOSED' }, { status: 409 })
    }

    if (sourcingRequest.selected_bid_id) {
      return NextResponse.json({ error: 'AUCTION_CLOSED: An offer has already been approved for this request.', code: 'AUCTION_CLOSED' }, { status: 409 })
    }

    if (sourcingRequest.auction_ends_at && new Date() > new Date(sourcingRequest.auction_ends_at)) {
      return NextResponse.json({ error: 'AUCTION_CLOSED: Bidding period has expired.', code: 'AUCTION_CLOSED' }, { status: 409 })
    }

    // ── 7. Upsert bid into vendor_bids ────────────────────────────────────
    // UNIQUE constraint (request_id, vendor_id) prevents duplicates at DB level.
    // vendor_bids.delivery_days is NOT NULL — estimatedDays is required above.
    const { data: bid, error: bidError } = await (db as any)
      .from('vendor_bids')
      .upsert(
        {
          vendor_id: effectiveVendorId,
          request_id: requestId,
          price_amount: Number(priceOfferedEgp),
          delivery_days: Number(estimatedDays),
          warranty_months: 0,
          product_condition: 'new',
          installation_included: false,
          after_sales_service: typeof notes === 'string' ? notes : null,
          deal_score: 0,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'request_id,vendor_id' }
      )
      .select('id')
      .single()

    if (bidError || !bid) {
      log.error('vendor_bids upsert failed', { error: bidError?.message })
      if (
        bidError?.message?.includes('AUCTION_CLOSED') ||
        bidError?.message?.includes('P0003') ||
        bidError?.message?.includes('P0004') ||
        bidError?.message?.includes('P0005') ||
        bidError?.message?.includes('P0006') ||
        bidError?.code === 'P0003' ||
        bidError?.code === 'P0004' ||
        bidError?.code === 'P0005' ||
        bidError?.code === 'P0006'
      ) {
        return NextResponse.json({ error: bidError?.message || 'AUCTION_CLOSED', code: 'AUCTION_CLOSED' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to submit offer' }, { status: 500 })
    }

    log.info('Merchant offer submitted', { bidId: bid.id, vendorId: effectiveVendorId })
    return NextResponse.json({ success: true, offerId: bid.id })
  } catch (err: any) {
    log.error('merchants/offers POST error', { error: err?.message })
    if (
      err?.message?.includes('AUCTION_CLOSED') ||
      err?.message?.includes('P0003') ||
      err?.message?.includes('P0004') ||
      err?.message?.includes('P0005') ||
      err?.message?.includes('P0006') ||
      err?.code === 'P0003' ||
      err?.code === 'P0004' ||
      err?.code === 'P0005' ||
      err?.code === 'P0006'
    ) {
      return NextResponse.json({ error: err?.message || 'AUCTION_CLOSED', code: 'AUCTION_CLOSED' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // ── 1. Authenticate ────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createAdminClient()

    // ── 2. Check staff role ───────────────────────────────────────────────
    const { data: staffMember } = await (db as any)
      .from('staff_members')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (staffMember) {
      // Staff can view all bids, optionally filtered by vendorId.
      // Accept both 'vendorId' (new) and 'merchantId' (legacy param) for compat.
      const vendorIdParam =
        request.nextUrl.searchParams.get('vendorId') ||
        request.nextUrl.searchParams.get('merchantId')

      let query = (db as any)
        .from('vendor_bids')
        .select('id, request_id, vendor_id, price_amount, delivery_days, deal_score, is_active, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (vendorIdParam) {
        query = query.eq('vendor_id', vendorIdParam)
      }

      const { data, error } = await query
      if (error) {
        log.error('Staff vendor_bids query failed', { error: error.message })
        return NextResponse.json({ error: 'Failed to retrieve offers' }, { status: 500 })
      }
      return NextResponse.json({ offers: data ?? [] })
    }

    // ── 3. Resolve vendor from authenticated session ───────────────────────
    // Never trust a query parameter to establish ownership.
    const { data: vendor, error: vendorErr } = await (db as any)
      .from('vendors')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (vendorErr || !vendor) {
      return NextResponse.json({ error: 'Vendor account not found' }, { status: 403 })
    }

    // ── 4. Retrieve only this vendor's bids (DB-scoped) ──────────────────
    const { data, error } = await (db as any)
      .from('vendor_bids')
      .select('id, request_id, price_amount, delivery_days, deal_score, is_active, created_at, updated_at')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('vendor_bids query failed', { error: error.message, vendorId: vendor.id })
      return NextResponse.json({ error: 'Failed to retrieve offers' }, { status: 500 })
    }

    return NextResponse.json({ offers: data ?? [] })
  } catch (err: any) {
    log.error('merchants/offers GET error', { error: err?.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
