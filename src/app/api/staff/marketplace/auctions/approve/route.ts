import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { queueCommunication } from '@/lib/dal/communications'
import { withRateLimit, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:staff/marketplace/auctions/approve')

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function approveBidHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate staff user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Enforce staff permissions
    const staff = await getStaffMemberByAuthUserId(user.id)
    const perms = getStaffUiPermissions(staff)
    if (!perms.canManageDeals && !perms.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    // 3. Parse and validate payload
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const requestId = body.request_id || body.requestId
    const bidId = body.bid_id || body.bidId

    if (!requestId || typeof requestId !== 'string' || !UUID_REGEX.test(requestId)) {
      return NextResponse.json({ error: 'request_id must be a valid UUID' }, { status: 400 })
    }

    if (!bidId || typeof bidId !== 'string' || !UUID_REGEX.test(bidId)) {
      return NextResponse.json({ error: 'bid_id must be a valid UUID' }, { status: 400 })
    }

    // 4. Invoke atomic approval RPC via service_role client
    const adminClient = createAdminClient()
    const { data: rpcData, error: rpcError } = await (adminClient as any).rpc('fn_staff_approve_vendor_bid', {
      p_request_id: requestId,
      p_bid_id: bidId,
    })

    if (rpcError) {
      log.error('fn_staff_approve_vendor_bid failed', { error: rpcError.message, requestId, bidId })

      const msg = rpcError.message || ''
      const code = rpcError.code || ''

      if (code === 'P0002' || msg.includes('NOT_FOUND')) {
        return NextResponse.json({ error: msg || 'Resource not found' }, { status: 404 })
      }
      if (code === 'P0003' || msg.includes('CONFLICT') || msg.includes('already has an approved bid')) {
        return NextResponse.json({ error: msg || 'Request already has an approved bid', code: 'CONFLICT' }, { status: 409 })
      }
      if (code === 'P0005' || msg.includes('archived')) {
        return NextResponse.json({ error: msg || 'Request is archived', code: 'PRECONDITION_FAILED' }, { status: 409 })
      }
      if (code === 'P0007' || msg.includes('inactive')) {
        return NextResponse.json({ error: msg || 'Bid is inactive', code: 'PRECONDITION_FAILED' }, { status: 400 })
      }

      return NextResponse.json({ error: msg || 'Failed to approve bid' }, { status: 500 })
    }

    log.info('Vendor bid approved successfully by staff', {
      staffId: staff?.id,
      requestId,
      bidId,
      vendorId: rpcData?.vendorId,
    })

    // 5. Post-commit customer communication hook
    if (rpcData?.customerId) {
      try {
        await queueCommunication({
          customerId: rpcData.customerId,
          requestId: rpcData.requestId,
          templateCode: 'bid_selected_offer_approved',
          variables: {
            price_amount: String(rpcData.priceAmount || ''),
          }
        })
      } catch (commErr: any) {
        log.warn('Failed to queue customer communication for approved bid', { error: commErr?.message })
      }
    }

    return NextResponse.json({
      success: true,
      data: rpcData,
    })
  } catch (error: any) {
    log.error('approveBidHandler unexpected error', { error: error?.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = withRateLimit(AUTH_RATE_LIMIT, approveBidHandler)
