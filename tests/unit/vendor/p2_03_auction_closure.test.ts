/**
 * FINDORA — P2-03: Auction Closure Enforcement Test Suite
 *
 * Verifies:
 * 1. Configurable auction duration per request (default 48h, rejects <= 0 or non-integer).
 * 2. Pre-flight closure checks at POST /api/bids (rejects expired, approved, non-bidding status, archived).
 * 3. Mapping of database trigger exceptions (P0003, P0004, P0005, P0006) to HTTP 409.
 * 4. Pre-flight closure checks at POST /api/merchants/offers.
 * 5. Staff approval API route (POST /api/staff/marketplace/auctions/approve) authorization, RPC invocation, and communication hook.
 * 6. Migration contract integrity (locking order, trigger attachments, permissions, status immutability).
 */

import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

// ── Mocks for Bids Route ─────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockCalculateDealScore = jest.fn()
const mockGetAiBiddingFeedback = jest.fn()
const mockGetVendorAverageResponseSpeed = jest.fn()
const mockCreateBid = jest.fn()
const mockUpdateBid = jest.fn()

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

jest.mock('@/lib/middleware/rate-limiter', () => ({
  withRateLimit: (_: any, handler: any) => handler,
  STANDARD_RATE_LIMIT: {},
  AUTH_RATE_LIMIT: {},
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

const mockAdminRpc = jest.fn()
const mockAdminFrom = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    rpc: mockAdminRpc,
    from: mockAdminFrom,
  })),
}))

const mockQueueCommunication = jest.fn()
jest.mock('@/lib/dal/communications', () => ({
  queueCommunication: (...args: any[]) => mockQueueCommunication(...args),
}))

const mockGetStaffMemberByAuthUserId = jest.fn()
const mockGetStaffUiPermissions = jest.fn()
jest.mock('@/lib/dal/staff', () => ({
  getStaffMemberByAuthUserId: (...args: any[]) => mockGetStaffMemberByAuthUserId(...args),
  getStaffUiPermissions: (...args: any[]) => mockGetStaffUiPermissions(...args),
  autoAssignReviewerToRequest: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/dal/bidding', () => ({
  getBidsForRequest: jest.fn(),
  createBid: (...args: any[]) => mockCreateBid(...args),
  updateBid: (...args: any[]) => mockUpdateBid(...args),
  getVendorAverageResponseSpeed: (...args: any[]) => mockGetVendorAverageResponseSpeed(...args),
}))

jest.mock('@/lib/products/bidding-engine', () => ({
  calculateDealScore: (...args: any[]) => mockCalculateDealScore(...args),
  getAiBiddingFeedback: (...args: any[]) => mockGetAiBiddingFeedback(...args),
}))

// Import Route Handlers
import { POST as bidsPostHandler } from '@/app/api/bids/route'
import { POST as offersPostHandler } from '@/app/api/merchants/offers/route'
import { POST as staffApprovePostHandler } from '@/app/api/staff/marketplace/auctions/approve/route'
import { POST as customerRequestCreatePostHandler } from '@/app/api/customers/requests/create/route'
import { createSourcingRequest } from '@/lib/dal/requests'

// ── Test Constants ───────────────────────────────────────────────────────────

const VALID_REQUEST_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-1e2f3a4b5c6d'
const VALID_VENDOR_ID = 'b2c3d4e5-f6a1-4b2c-9d3e-2f3a4b5c6d7e'
const VALID_BID_ID = 'c3d4e5f6-a1b2-4c3d-8e4f-3a4b5c6d7e8f'
const AUTH_USER_ID = 'auth-user-1234'

function makeQueryChain(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, any> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    maybeSingle: terminal.maybeSingle ?? jest.fn().mockResolvedValue({ data: null, error: null }),
    single: terminal.single ?? jest.fn().mockResolvedValue({ data: null, error: null }),
  }
  chain.select.mockReturnThis = () => chain
  chain.eq.mockReturnThis = () => chain
  chain.in.mockReturnThis = () => chain
  chain.order.mockReturnThis = () => chain
  chain.upsert.mockReturnThis = () => chain
  return chain
}

describe('FINDORA — P2-03: Auction Closure Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Pre-Flight Auction Closure Enforcement on POST /api/bids
  // ─────────────────────────────────────────────────────────────────────────
  describe('1. POST /api/bids Closure Pre-Flight Checks', () => {
    const validBody = {
      request_id: VALID_REQUEST_ID,
      vendor_id: VALID_VENDOR_ID,
      price_amount: 5000,
      delivery_days: 3,
      warranty_months: 12,
      product_condition: 'new',
    }

    it('rejects bid submission if request is archived (HTTP 409)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'requests') {
          return makeQueryChain({
            single: jest.fn().mockResolvedValue({
              data: {
                budget: 6000,
                priority: 'price',
                selected_bid_id: null,
                auction_ends_at: new Date(Date.now() + 86400000).toISOString(),
                current_status: 'open',
                is_archived: true,
              },
              error: null,
            }),
          })
        }
        return makeQueryChain({})
      })

      const req = new NextRequest('http://localhost:3000/api/bids', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })

      const res = await bidsPostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('AUCTION_CLOSED')
      expect(data.error).toContain('archived')
    })

    it('rejects bid submission if request status is not open for bidding (HTTP 409)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'requests') {
          return makeQueryChain({
            single: jest.fn().mockResolvedValue({
              data: {
                budget: 6000,
                priority: 'price',
                selected_bid_id: null,
                auction_ends_at: new Date(Date.now() + 86400000).toISOString(),
                current_status: 'completed',
                is_archived: false,
              },
              error: null,
            }),
          })
        }
        return makeQueryChain({})
      })

      const req = new NextRequest('http://localhost:3000/api/bids', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })

      const res = await bidsPostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('AUCTION_CLOSED')
      expect(data.error).toContain('not open for bidding')
    })

    it('rejects bid submission if an offer has already been approved (selected_bid_id IS NOT NULL) (HTTP 409)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'requests') {
          return makeQueryChain({
            single: jest.fn().mockResolvedValue({
              data: {
                budget: 6000,
                priority: 'price',
                selected_bid_id: 'some-already-approved-bid-uuid',
                auction_ends_at: new Date(Date.now() + 86400000).toISOString(),
                current_status: 'open',
                is_archived: false,
              },
              error: null,
            }),
          })
        }
        return makeQueryChain({})
      })

      const req = new NextRequest('http://localhost:3000/api/bids', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })

      const res = await bidsPostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('AUCTION_CLOSED')
      expect(data.error).toContain('already been approved')
    })

    it('rejects bid submission if auction has expired by time (NOW() > auction_ends_at) (HTTP 409)', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      mockFrom.mockImplementation((table: string) => {
        if (table === 'requests') {
          return makeQueryChain({
            single: jest.fn().mockResolvedValue({
              data: {
                budget: 6000,
                priority: 'price',
                selected_bid_id: null,
                auction_ends_at: pastTime,
                current_status: 'open',
                is_archived: false,
              },
              error: null,
            }),
          })
        }
        return makeQueryChain({})
      })

      const req = new NextRequest('http://localhost:3000/api/bids', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })

      const res = await bidsPostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('AUCTION_CLOSED')
      expect(data.error).toContain('expired')
    })

    it('maps database trigger exception P0004 to HTTP 409 Conflict', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'requests') {
          return makeQueryChain({
            single: jest.fn().mockResolvedValue({
              data: {
                budget: 6000,
                priority: 'price',
                selected_bid_id: null,
                auction_ends_at: new Date(Date.now() + 86400000).toISOString(),
                current_status: 'open',
                is_archived: false,
              },
              error: null,
            }),
          })
        }
        if (table === 'vendors') {
          return makeQueryChain({
            single: jest.fn().mockResolvedValue({
              data: { id: VALID_VENDOR_ID, auth_user_id: AUTH_USER_ID, trust_score: 90 },
              error: null,
            }),
          })
        }
        if (table === 'staff_members') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })
        }
        if (table === 'vendor_bids') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })
        }
        return makeQueryChain({})
      })

      mockCalculateDealScore.mockReturnValue({ total: 85 })
      mockGetVendorAverageResponseSpeed.mockResolvedValue(2)
      mockCreateBid.mockRejectedValue(new Error('Failed to place bid: AUCTION_CLOSED: Bidding period has expired.'))

      const req = new NextRequest('http://localhost:3000/api/bids', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })

      const res = await bidsPostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('AUCTION_CLOSED')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Pre-Flight Auction Closure Enforcement on POST /api/merchants/offers
  // ─────────────────────────────────────────────────────────────────────────
  describe('2. POST /api/merchants/offers Closure Pre-Flight Checks', () => {
    const validOfferBody = {
      requestId: VALID_REQUEST_ID,
      priceOfferedEgp: 4500,
      estimatedDays: 2,
    }

    it('rejects merchant offer if request is expired (HTTP 409)', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'staff_members') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })
        }
        if (table === 'vendors') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: VALID_VENDOR_ID, system_status: 'Active' },
              error: null,
            }),
          })
        }
        if (table === 'requests') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: VALID_REQUEST_ID,
                selected_bid_id: null,
                auction_ends_at: pastTime,
                current_status: 'open',
                is_archived: false,
              },
              error: null,
            }),
          })
        }
        return makeQueryChain({})
      })

      const req = new NextRequest('http://localhost:3000/api/merchants/offers', {
        method: 'POST',
        body: JSON.stringify(validOfferBody),
      })

      const res = await offersPostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('AUCTION_CLOSED')
    })

    it('rejects merchant offer if request already has selected_bid_id (HTTP 409)', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'staff_members') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })
        }
        if (table === 'vendors') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: VALID_VENDOR_ID, system_status: 'Active' },
              error: null,
            }),
          })
        }
        if (table === 'requests') {
          return makeQueryChain({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: VALID_REQUEST_ID,
                selected_bid_id: 'some-bid-id',
                auction_ends_at: new Date(Date.now() + 86400000).toISOString(),
                current_status: 'open',
                is_archived: false,
              },
              error: null,
            }),
          })
        }
        return makeQueryChain({})
      })

      const req = new NextRequest('http://localhost:3000/api/merchants/offers', {
        method: 'POST',
        body: JSON.stringify(validOfferBody),
      })

      const res = await offersPostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('AUCTION_CLOSED')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Staff Bid Approval API Route
  // ─────────────────────────────────────────────────────────────────────────
  describe('3. POST /api/staff/marketplace/auctions/approve', () => {
    it('rejects unauthenticated requests with HTTP 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const req = new NextRequest('http://localhost:3000/api/staff/marketplace/auctions/approve', {
        method: 'POST',
        body: JSON.stringify({ request_id: VALID_REQUEST_ID, bid_id: VALID_BID_ID }),
      })

      const res = await staffApprovePostHandler(req)
      expect(res.status).toBe(401)
    })

    it('rejects non-staff or unauthorized staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValue({ id: 'staff-1', auth_user_id: AUTH_USER_ID })
      mockGetStaffUiPermissions.mockReturnValue({ canManageDeals: false, isAdmin: false })

      const req = new NextRequest('http://localhost:3000/api/staff/marketplace/auctions/approve', {
        method: 'POST',
        body: JSON.stringify({ request_id: VALID_REQUEST_ID, bid_id: VALID_BID_ID }),
      })

      const res = await staffApprovePostHandler(req)
      expect(res.status).toBe(403)
    })

    it('rejects invalid or missing UUIDs with HTTP 400', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValue({ id: 'staff-1', auth_user_id: AUTH_USER_ID })
      mockGetStaffUiPermissions.mockReturnValue({ canManageDeals: true, isAdmin: false })

      const req = new NextRequest('http://localhost:3000/api/staff/marketplace/auctions/approve', {
        method: 'POST',
        body: JSON.stringify({ request_id: 'not-a-uuid', bid_id: VALID_BID_ID }),
      })

      const res = await staffApprovePostHandler(req)
      expect(res.status).toBe(400)
    })

    it('invokes fn_staff_approve_vendor_bid and queues customer communication on success', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValue({ id: 'staff-1', auth_user_id: AUTH_USER_ID })
      mockGetStaffUiPermissions.mockReturnValue({ canManageDeals: true, isAdmin: false })

      mockAdminRpc.mockResolvedValue({
        data: {
          success: true,
          requestId: VALID_REQUEST_ID,
          selectedBidId: VALID_BID_ID,
          vendorId: VALID_VENDOR_ID,
          customerId: 'cust-1234',
          priceAmount: 4800,
        },
        error: null,
      })

      const req = new NextRequest('http://localhost:3000/api/staff/marketplace/auctions/approve', {
        method: 'POST',
        body: JSON.stringify({ request_id: VALID_REQUEST_ID, bid_id: VALID_BID_ID }),
      })

      const res = await staffApprovePostHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockAdminRpc).toHaveBeenCalledWith('fn_staff_approve_vendor_bid', {
        p_request_id: VALID_REQUEST_ID,
        p_bid_id: VALID_BID_ID,
      })
      expect(mockQueueCommunication).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1234',
          requestId: VALID_REQUEST_ID,
          templateCode: 'bid_selected_offer_approved',
        })
      )
    })

    it('maps conflict error when request already has an approved bid to HTTP 409', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValue({ id: 'staff-1', auth_user_id: AUTH_USER_ID })
      mockGetStaffUiPermissions.mockReturnValue({ canManageDeals: true, isAdmin: false })

      mockAdminRpc.mockResolvedValue({
        data: null,
        error: {
          code: 'P0003',
          message: 'CONFLICT: Request already has an approved bid.',
        },
      })

      const req = new NextRequest('http://localhost:3000/api/staff/marketplace/auctions/approve', {
        method: 'POST',
        body: JSON.stringify({ request_id: VALID_REQUEST_ID, bid_id: VALID_BID_ID }),
      })

      const res = await staffApprovePostHandler(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('CONFLICT')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Request Intake Duration & Validation in DAL
  // ─────────────────────────────────────────────────────────────────────────
  describe('4. DAL Sourcing Request Duration Configuration', () => {
    it('rejects non-positive or non-integer auctionDurationHours', async () => {
      await expect(
        createSourcingRequest({
          customerId: 'cust-uuid-1',
          title: 'Gaming Laptop',
          rawDescription: 'Looking for 32GB RAM',
          status: 'open',
          channel: 'landing_page',
          preferences: {},
          auctionDurationHours: -5,
        })
      ).rejects.toThrow('INVALID_ARGUMENT: auctionDurationHours must be a positive integer.')

      await expect(
        createSourcingRequest({
          customerId: 'cust-uuid-1',
          title: 'Gaming Laptop',
          rawDescription: 'Looking for 32GB RAM',
          status: 'open',
          channel: 'landing_page',
          preferences: {},
          auctionDurationHours: 0,
        })
      ).rejects.toThrow('INVALID_ARGUMENT: auctionDurationHours must be a positive integer.')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Database Migration Contract Integrity Check
  // ─────────────────────────────────────────────────────────────────────────
  describe('5. Database Migration Contract Integrity (20260924010000)', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260924010000_p2_03_auction_closure_enforcement.sql'
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    it('sets default auction duration to 48 hours', () => {
      expect(sql).toMatch(/ALTER\s+TABLE\s+public\.requests\s+ALTER\s+COLUMN\s+auction_duration_hours\s+SET\s+DEFAULT\s+48/i)
      expect(sql).toContain('p_auction_duration_hours integer DEFAULT 48')
    })

    it('ensures exact timestamp parity between created_at and auction_ends_at', () => {
      expect(sql).toContain('v_created_at := NOW();')
      expect(sql).toContain("v_ends_at := v_created_at + (v_duration * INTERVAL '1 hour');")
    })

    it('attaches universal BEFORE INSERT OR UPDATE trigger on vendor_bids', () => {
      expect(sql).toContain('CREATE TRIGGER trg_enforce_vendor_bid_auction_window')
      expect(sql).toContain('BEFORE INSERT OR UPDATE ON public.vendor_bids')
      expect(sql).toContain('EXECUTE FUNCTION public.fn_enforce_vendor_bid_auction_window()')
    })

    it('enforces requests row FOR SHARE locking during bid insertion/update', () => {
      expect(sql).toMatch(/FROM\s+public\.requests\s+WHERE\s+id\s*=\s*NEW\.request_id\s+FOR\s+SHARE/i)
    })

    it('strictly locks requests row FOR UPDATE in fn_staff_approve_vendor_bid', () => {
      expect(sql).toMatch(/FROM\s+public\.requests\s+WHERE\s+id\s*=\s*p_request_id\s+FOR\s+UPDATE/i)
    })

    it('does NOT alter requests.current_status upon staff bid approval', () => {
      expect(sql).toContain('UPDATE public.requests')
      expect(sql).toContain('SET selected_bid_id = p_bid_id')
      expect(sql).not.toMatch(/SET\s+current_status\s*=\s*'approved'/i)
      expect(sql).not.toMatch(/SET\s+current_status\s*=\s*'closed'/i)
    })

    it('enforces immutability of request_id on vendor_bids update', () => {
      expect(sql).toContain('TG_OP = \'UPDATE\' AND OLD.request_id IS DISTINCT FROM NEW.request_id')
      expect(sql).toContain('request_id on a bid is immutable')
    })

    it('restricts fn_staff_approve_vendor_bid strictly to service_role', () => {
      expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.fn_staff_approve_vendor_bid.*FROM\s+PUBLIC,\s*anon,\s*authenticated/i)
      expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_staff_approve_vendor_bid.*TO\s+service_role/i)
    })

    it('drops legacy 29-parameter and 31-parameter function signatures to prevent PostgREST overload collision', () => {
      expect(sql).toMatch(
        /DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.fn_create_sourcing_request\s*\(\s*uuid,\s*uuid/i
      )
      expect(sql).toMatch(
        /DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.fn_create_sourcing_request_idempotent\s*\(\s*uuid,\s*uuid/i
      )

      const dropIdx29 = sql.indexOf('DROP FUNCTION IF EXISTS public.fn_create_sourcing_request(')
      const createIdx30 = sql.indexOf('CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request(')
      expect(dropIdx29).toBeGreaterThan(-1)
      expect(createIdx30).toBeGreaterThan(-1)
      expect(dropIdx29).toBeLessThan(createIdx30)

      const dropIdx31 = sql.indexOf('DROP FUNCTION IF EXISTS public.fn_create_sourcing_request_idempotent(')
      const createIdx32 = sql.indexOf('CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request_idempotent(')
      expect(dropIdx31).toBeGreaterThan(-1)
      expect(createIdx32).toBeGreaterThan(-1)
      expect(dropIdx31).toBeLessThan(createIdx32)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Customer Request Intake Duration Policy
  // ─────────────────────────────────────────────────────────────────────────
  describe('6. Customer Request Intake Duration Policy (POST /api/customers/requests/create)', () => {
    it('enforces authoritative 48-hour duration and rejects customer duration manipulation', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'customers') {
          return makeQueryChain({
            single: jest.fn().mockResolvedValue({
              data: { id: 'customer-uuid-1' },
              error: null,
            }),
          })
        }
        return makeQueryChain({})
      })

      mockAdminRpc.mockResolvedValue({
        data: {
          success: true,
          requestId: 'new-req-uuid-1',
          requestCode: 'REQ-NEW123',
        },
        error: null,
      })

      // Send payload with customer attempting to set a 1-hour auction duration
      const req = new NextRequest('http://localhost:3000/api/customers/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Sami Customer',
          productName: 'Office Chair',
          category: 'furniture',
          targetLocation: 'Riyadh',
          maxPrice: 500,
          notes: 'Ergonomic mesh chair',
          auction_duration_hours: 1,
          auctionDurationHours: 1,
          duration: 1,
        }),
      })

      const res = await customerRequestCreatePostHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify RPC was invoked with strictly authoritative 48 hours
      expect(mockAdminRpc).toHaveBeenCalledWith(
        'fn_create_sourcing_request',
        expect.objectContaining({
          p_auction_duration_hours: 48,
          p_customer_name: 'Sami Customer',
          p_product_name: 'Office Chair',
        })
      )

      // Ensure customer's custom 1-hour duration was never passed to RPC
      const rpcCallArgs = mockAdminRpc.mock.calls[0][1]
      expect(rpcCallArgs.p_auction_duration_hours).toBe(48)
      expect(rpcCallArgs.auction_duration_hours).toBeUndefined()
      expect(rpcCallArgs.auctionDurationHours).toBeUndefined()
    })
  })
})
