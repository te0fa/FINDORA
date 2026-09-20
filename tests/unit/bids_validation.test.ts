/**
 * FINDORA — P2-01: Bids Input Validation Unit Tests
 *
 * Verifies strict server-side validation for POST /api/bids:
 * 1. request_id: required UUID (rejects non-UUID, null, missing)
 * 2. vendor_id: required UUID (rejects non-UUID, null, missing)
 * 3. price_amount: strictly > 0, <= 100,000,000, max 2 decimals (rejects 0, negative, NaN, Infinity, strings with non-digits, > 2 decimals, > 100M)
 * 4. delivery_days: integer 1..365 (rejects 0, negative, floats, > 365, non-numeric strings)
 * 5. warranty_months: integer 0..120, optional defaults to 0 (rejects null, negative, floats, > 120, non-numeric strings)
 * 6. product_condition: 'new' | 'used' | 'refurbished', optional defaults to 'new' (rejects other strings, non-strings)
 * 7. installation_included: boolean, optional defaults to false (rejects non-booleans)
 * 8. after_sales_service & freebies: optional strings <= 500 chars (rejects non-strings, > 500 chars)
 * 9. Security: Malformed values never reach downstream functions (calculateDealScore, createBid, etc.)
 * 10. Robustness: Graceful error handling (400 for bad input, 500 for unexpected internal errors)
 */

import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

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

import { POST, validateBidInput } from '@/app/api/bids/route'

// ── Test Constants ───────────────────────────────────────────────────────────

const VALID_REQUEST_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-1e2f3a4b5c6d'
const VALID_VENDOR_ID = 'b2c3d4e5-f6a1-4b2c-9d3e-2f3a4b5c6d7e'
const AUTH_USER_ID = 'user-auth-uuid-1234'

function makeQueryChain(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, any> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: terminal.maybeSingle ?? jest.fn().mockResolvedValue({ data: null, error: null }),
    single: terminal.single ?? jest.fn().mockResolvedValue({ data: null, error: null }),
  }
  chain.select.mockReturnThis = () => chain
  chain.eq.mockReturnThis = () => chain
  chain.order.mockReturnThis = () => chain
  return chain
}

describe('P2-01: Pure Validation Function (validateBidInput)', () => {
  const validBaseInput = {
    request_id: VALID_REQUEST_ID,
    vendor_id: VALID_VENDOR_ID,
    price_amount: 150.5,
    delivery_days: 7,
    warranty_months: 12,
    product_condition: 'new',
    installation_included: true,
    after_sales_service: '1 year free maintenance',
    freebies: 'Free phone case',
  }

  describe('1. Valid Inputs & Defaults', () => {
    it('accepts complete valid input', () => {
      const result = validateBidInput(validBaseInput)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.request_id).toBe(VALID_REQUEST_ID)
        expect(result.data.vendor_id).toBe(VALID_VENDOR_ID)
        expect(result.data.price_amount).toBe(150.5)
        expect(result.data.delivery_days).toBe(7)
        expect(result.data.warranty_months).toBe(12)
        expect(result.data.product_condition).toBe('new')
        expect(result.data.installation_included).toBe(true)
        expect(result.data.after_sales_service).toBe('1 year free maintenance')
        expect(result.data.freebies).toBe('Free phone case')
      }
    })

    it('applies correct defaults when optional fields are omitted', () => {
      const minimalInput = {
        request_id: VALID_REQUEST_ID,
        vendor_id: VALID_VENDOR_ID,
        price_amount: 500,
        delivery_days: 3,
      }
      const result = validateBidInput(minimalInput)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.warranty_months).toBe(0)
        expect(result.data.product_condition).toBe('new')
        expect(result.data.installation_included).toBe(false)
        expect(result.data.after_sales_service).toBeUndefined()
        expect(result.data.freebies).toBeUndefined()
      }
    })

    it('accepts minimum boundary values (price: 0.01, delivery: 1, warranty: 0)', () => {
      const result = validateBidInput({
        ...validBaseInput,
        price_amount: 0.01,
        delivery_days: 1,
        warranty_months: 0,
      })
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.price_amount).toBe(0.01)
        expect(result.data.delivery_days).toBe(1)
        expect(result.data.warranty_months).toBe(0)
      }
    })

    it('accepts maximum boundary values (price: 100,000,000, delivery: 365, warranty: 120)', () => {
      const result = validateBidInput({
        ...validBaseInput,
        price_amount: 100_000_000,
        delivery_days: 365,
        warranty_months: 120,
      })
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.price_amount).toBe(100_000_000)
        expect(result.data.delivery_days).toBe(365)
        expect(result.data.warranty_months).toBe(120)
      }
    })

    it('accepts numeric string representations for price, delivery, and warranty', () => {
      const result = validateBidInput({
        ...validBaseInput,
        price_amount: '250.75',
        delivery_days: '14',
        warranty_months: '24',
      })
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.price_amount).toBe(250.75)
        expect(result.data.delivery_days).toBe(14)
        expect(result.data.warranty_months).toBe(24)
      }
    })

    it('accepts all allowed product conditions: new, used, refurbished', () => {
      for (const cond of ['new', 'used', 'refurbished'] as const) {
        const result = validateBidInput({ ...validBaseInput, product_condition: cond })
        expect(result.valid).toBe(true)
        if (result.valid) expect(result.data.product_condition).toBe(cond)
      }
    })

    it('accepts null/undefined and empty strings for optional text fields', () => {
      const result = validateBidInput({
        ...validBaseInput,
        after_sales_service: null,
        freebies: null,
      })
      expect(result.valid).toBe(true)

      const result2 = validateBidInput({
        ...validBaseInput,
        after_sales_service: '',
        freebies: '',
      })
      expect(result2.valid).toBe(true)
    })

    it('accepts text fields up to exactly 500 characters', () => {
      const exact500 = 'x'.repeat(500)
      const result = validateBidInput({
        ...validBaseInput,
        after_sales_service: exact500,
        freebies: exact500,
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('2. Request ID Validation', () => {
    it('rejects missing request_id', () => {
      const { request_id, ...rest } = validBaseInput
      const result = validateBidInput(rest)
      expect(result.valid).toBe(false)
      if (!result.valid) expect(result.error).toContain('request_id')
    })

    it('rejects null request_id', () => {
      const result = validateBidInput({ ...validBaseInput, request_id: null })
      expect(result.valid).toBe(false)
    })

    it('rejects empty string request_id', () => {
      const result = validateBidInput({ ...validBaseInput, request_id: '' })
      expect(result.valid).toBe(false)
    })

    it('rejects non-UUID strings (e.g. arbitrary string, req-123)', () => {
      expect(validateBidInput({ ...validBaseInput, request_id: 'not-a-uuid' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, request_id: 'req-123' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, request_id: '12345' }).valid).toBe(false)
    })

    it('rejects non-string types for request_id (number, boolean, object, array)', () => {
      expect(validateBidInput({ ...validBaseInput, request_id: 12345 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, request_id: true }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, request_id: {} }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, request_id: [] }).valid).toBe(false)
    })
  })

  describe('3. Vendor ID Validation', () => {
    it('rejects missing vendor_id', () => {
      const { vendor_id, ...rest } = validBaseInput
      const result = validateBidInput(rest)
      expect(result.valid).toBe(false)
      if (!result.valid) expect(result.error).toContain('vendor_id')
    })

    it('rejects null vendor_id', () => {
      const result = validateBidInput({ ...validBaseInput, vendor_id: null })
      expect(result.valid).toBe(false)
    })

    it('rejects non-UUID strings for vendor_id', () => {
      expect(validateBidInput({ ...validBaseInput, vendor_id: 'vendor-123' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, vendor_id: 'abc-def' }).valid).toBe(false)
    })

    it('rejects non-string types for vendor_id', () => {
      expect(validateBidInput({ ...validBaseInput, vendor_id: 999 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, vendor_id: {} }).valid).toBe(false)
    })
  })

  describe('4. Price Amount Validation (P2-01 Core)', () => {
    it('rejects missing or undefined price_amount', () => {
      const { price_amount, ...rest } = validBaseInput
      expect(validateBidInput(rest).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: undefined }).valid).toBe(false)
    })

    it('rejects null, array, and object price_amount', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: null }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: [] }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: {} }).valid).toBe(false)
    })

    it('rejects boolean price_amount', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: true }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: false }).valid).toBe(false)
    })

    it('rejects zero (0 and "0", "0.00")', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: 0 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '0' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '0.00' }).valid).toBe(false)
    })

    it('rejects negative numbers and negative numeric strings', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: -1 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: -50.25 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '-10' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '-0.01' }).valid).toBe(false)
    })

    it('rejects non-finite values (NaN, Infinity, -Infinity)', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: NaN }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: Infinity }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: -Infinity }).valid).toBe(false)
    })

    it('rejects strings with non-numeric characters ("100abc", "abc", "$100", "")', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: '100abc' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: 'abc' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '$100' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: ' ' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: 'NaN' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: 'Infinity' }).valid).toBe(false)
    })

    it('rejects values exceeding 100,000,000', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: 100_000_001 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: 999_999_999 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '100000000.01' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '100000001' }).valid).toBe(false)
    })

    it('rejects exponential notation (1e9, "1e9", "1e-5")', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: '1e9' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '1e-5' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: 1e9 }).valid).toBe(false)
    })

    it('rejects prices with more than 2 decimal places (both number and string)', () => {
      expect(validateBidInput({ ...validBaseInput, price_amount: 100.123 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: 0.001 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: 50.9999 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '100.123' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, price_amount: '0.001' }).valid).toBe(false)
    })
  })

  describe('5. Delivery Days Validation', () => {
    it('rejects missing or null delivery_days', () => {
      const { delivery_days, ...rest } = validBaseInput
      expect(validateBidInput(rest).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: null }).valid).toBe(false)
    })

    it('rejects 0 and "0"', () => {
      expect(validateBidInput({ ...validBaseInput, delivery_days: 0 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: '0' }).valid).toBe(false)
    })

    it('rejects negative delivery days (-1, -5, "-5")', () => {
      expect(validateBidInput({ ...validBaseInput, delivery_days: -1 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: -5 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: '-5' }).valid).toBe(false)
    })

    it('rejects floating point values (1.5, 0.5, "1.5")', () => {
      expect(validateBidInput({ ...validBaseInput, delivery_days: 1.5 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: 0.5 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: '1.5' }).valid).toBe(false)
    })

    it('rejects delivery days exceeding 365 (366, 1000, "366")', () => {
      expect(validateBidInput({ ...validBaseInput, delivery_days: 366 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: 10000 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: '366' }).valid).toBe(false)
    })

    it('rejects non-numeric strings ("abc", "7days", "")', () => {
      expect(validateBidInput({ ...validBaseInput, delivery_days: 'abc' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: '7days' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: '' }).valid).toBe(false)
    })

    it('rejects NaN, Infinity, booleans, objects, and arrays', () => {
      expect(validateBidInput({ ...validBaseInput, delivery_days: NaN }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: Infinity }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: true }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: {} }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, delivery_days: [] }).valid).toBe(false)
    })
  })

  describe('6. Warranty Months Validation', () => {
    it('rejects null warranty_months (explicit contract rule)', () => {
      expect(validateBidInput({ ...validBaseInput, warranty_months: null }).valid).toBe(false)
    })

    it('rejects negative warranty_months (-1, "-1")', () => {
      expect(validateBidInput({ ...validBaseInput, warranty_months: -1 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: '-1' }).valid).toBe(false)
    })

    it('rejects floating point warranty_months (1.5, "1.5")', () => {
      expect(validateBidInput({ ...validBaseInput, warranty_months: 1.5 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: '1.5' }).valid).toBe(false)
    })

    it('rejects warranty_months exceeding 120 (121, 500, "121")', () => {
      expect(validateBidInput({ ...validBaseInput, warranty_months: 121 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: 500 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: '121' }).valid).toBe(false)
    })

    it('rejects non-numeric strings ("abc", "twelve", "")', () => {
      expect(validateBidInput({ ...validBaseInput, warranty_months: 'abc' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: 'twelve' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: '' }).valid).toBe(false)
    })

    it('rejects NaN, booleans, objects, and arrays', () => {
      expect(validateBidInput({ ...validBaseInput, warranty_months: NaN }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: true }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: {} }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, warranty_months: [] }).valid).toBe(false)
    })
  })

  describe('7. Product Condition Validation', () => {
    it('rejects unknown condition strings (e.g. "broken", "like_new", "")', () => {
      expect(validateBidInput({ ...validBaseInput, product_condition: 'broken' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, product_condition: 'like_new' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, product_condition: '' }).valid).toBe(false)
    })

    it('rejects case mismatches (e.g. "NEW", "Used")', () => {
      expect(validateBidInput({ ...validBaseInput, product_condition: 'NEW' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, product_condition: 'Used' }).valid).toBe(false)
    })

    it('rejects null and non-string types (123, true, {})', () => {
      expect(validateBidInput({ ...validBaseInput, product_condition: null }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, product_condition: 123 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, product_condition: true }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, product_condition: {} }).valid).toBe(false)
    })
  })

  describe('8. Installation Included Validation', () => {
    it('rejects non-boolean types ("true", "false", 1, 0, null, {})', () => {
      expect(validateBidInput({ ...validBaseInput, installation_included: 'true' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, installation_included: 'false' }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, installation_included: 1 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, installation_included: 0 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, installation_included: null }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, installation_included: {} }).valid).toBe(false)
    })
  })

  describe('9. After-Sales Service & Freebies Validation', () => {
    it('rejects non-string types for after_sales_service and freebies (123, true, {}, [])', () => {
      expect(validateBidInput({ ...validBaseInput, after_sales_service: 123 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, after_sales_service: true }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, after_sales_service: {} }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, freebies: 456 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, freebies: [] }).valid).toBe(false)
    })

    it('rejects strings exceeding 500 characters', () => {
      const over500 = 'x'.repeat(501)
      expect(validateBidInput({ ...validBaseInput, after_sales_service: over500 }).valid).toBe(false)
      expect(validateBidInput({ ...validBaseInput, freebies: over500 }).valid).toBe(false)
    })
  })

  describe('10. Payload Body Shape Validation', () => {
    it('rejects null body, primitives, and arrays', () => {
      expect(validateBidInput(null).valid).toBe(false)
      expect(validateBidInput(undefined).valid).toBe(false)
      expect(validateBidInput('string').valid).toBe(false)
      expect(validateBidInput(123).valid).toBe(false)
      expect(validateBidInput([]).valid).toBe(false)
    })
  })
})

describe('P2-01: Route Handler (POST /api/bids)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: AUTH_USER_ID, email: 'vendor@findora.app' } },
      error: null,
    })

    // Default: not staff
    const staffChain = makeQueryChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    // Default: sourcing request exists
    const reqChain = makeQueryChain({
      single: jest.fn().mockResolvedValue({
        data: { budget: 1000, priority: 'urgent' },
        error: null,
      }),
    })

    // Default: vendor exists and belongs to AUTH_USER_ID
    const vendorChain = makeQueryChain({
      single: jest.fn().mockResolvedValue({
        data: { id: VALID_VENDOR_ID, auth_user_id: AUTH_USER_ID, trust_score: 95 },
        error: null,
      }),
    })

    // Default: no existing bid (insert new)
    const bidChain = makeQueryChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'staff_members') return staffChain
      if (table === 'requests') return reqChain
      if (table === 'vendors') return vendorChain
      if (table === 'vendor_bids') return bidChain
      return makeQueryChain({})
    })

    mockGetVendorAverageResponseSpeed.mockResolvedValue(1.5)
    mockCalculateDealScore.mockReturnValue({
      total: 88,
      priceScore: 50,
      deliveryScore: 20,
      warrantyScore: 10,
      vendorScore: 8,
    })
    mockCreateBid.mockResolvedValue({
      id: 'created-bid-uuid-111',
      request_id: VALID_REQUEST_ID,
      vendor_id: VALID_VENDOR_ID,
      deal_score: 88,
    })
    mockUpdateBid.mockResolvedValue({
      id: 'updated-bid-uuid-222',
      deal_score: 88,
    })
    mockGetAiBiddingFeedback.mockResolvedValue({
      competitiveAnalysis: 'Strong bid',
    })
  })

  function makePostRequest(body: any): NextRequest {
    return new NextRequest('http://localhost:3000/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  }

  const validPayload = {
    request_id: VALID_REQUEST_ID,
    vendor_id: VALID_VENDOR_ID,
    price_amount: 199.99,
    delivery_days: 5,
    warranty_months: 6,
    product_condition: 'new',
    installation_included: false,
    after_sales_service: 'Phone support included',
    freebies: 'Complimentary cable',
  }

  describe('Happy Path', () => {
    it('successfully validates and creates bid with sanitized numeric types', async () => {
      const req = makePostRequest(validPayload)
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.bid).toBeDefined()
      expect(json.scoreBreakdown).toBeDefined()
      expect(json.aiFeedback).toBeDefined()

      // Verify createBid received typed numeric inputs
      expect(mockCreateBid).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: VALID_REQUEST_ID,
          vendor_id: VALID_VENDOR_ID,
          price_amount: 199.99,
          delivery_days: 5,
          warranty_months: 6,
          product_condition: 'new',
          installation_included: false,
          deal_score: 88,
        })
      )

      // Verify calculateDealScore received clean numeric types
      expect(mockCalculateDealScore).toHaveBeenCalledWith(
        expect.objectContaining({
          price_amount: 199.99,
          delivery_days: 5,
          warranty_months: 6,
          product_condition: 'new',
          installation_included: false,
        }),
        expect.anything(),
        95,
        1.5
      )
    })

    it('coerces valid numeric strings to numbers before passing to downstream engine', async () => {
      const payloadWithStrings = {
        ...validPayload,
        price_amount: '450.50',
        delivery_days: '10',
        warranty_months: '12',
      }
      const req = makePostRequest(payloadWithStrings)
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)

      // Downstream MUST receive numbers, never raw strings
      expect(mockCreateBid).toHaveBeenCalledWith(
        expect.objectContaining({
          price_amount: 450.5,
          delivery_days: 10,
          warranty_months: 12,
        })
      )
    })
  })

  describe('Security Boundary: Malformed Input Never Reaches Downstream', () => {
    it('HTTP 400 when price_amount is 0 — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, price_amount: 0 })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBeDefined()
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
      expect(mockUpdateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when price_amount is negative — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, price_amount: -50 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when price_amount exceeds 100,000,000 — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, price_amount: 100_000_001 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when price_amount has > 2 decimal places — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, price_amount: 99.999 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when price_amount is a string with letters ("100abc") — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, price_amount: '100abc' })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when delivery_days is 0 — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, delivery_days: 0 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when delivery_days is a float (1.5) — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, delivery_days: 1.5 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when delivery_days > 365 (366) — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, delivery_days: 366 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when warranty_months is null — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, warranty_months: null })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when warranty_months > 120 — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, warranty_months: 121 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when product_condition is invalid — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, product_condition: 'vintage' })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when installation_included is non-boolean — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, installation_included: 'yes' })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when text fields exceed 500 characters — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, after_sales_service: 'a'.repeat(501) })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when request_id is not a valid UUID — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, request_id: 'not-valid-uuid' })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 when vendor_id is not a valid UUID — downstream never called', async () => {
      const req = makePostRequest({ ...validPayload, vendor_id: 'not-valid-uuid' })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockCalculateDealScore).not.toHaveBeenCalled()
      expect(mockCreateBid).not.toHaveBeenCalled()
    })

    it('HTTP 400 on malformed JSON payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json :: ',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Invalid JSON payload')
    })
  })

  describe('Authentication & Authorization Boundaries', () => {
    it('HTTP 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      const req = makePostRequest(validPayload)
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('HTTP 403 when vendor record does not belong to the authenticated user', async () => {
      // Vendor auth_user_id differs from AUTH_USER_ID
      const vendorChain = makeQueryChain({
        single: jest.fn().mockResolvedValue({
          data: { id: VALID_VENDOR_ID, auth_user_id: 'other-user-uuid', trust_score: 80 },
          error: null,
        }),
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'staff_members') {
          return makeQueryChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
        }
        if (table === 'requests') {
          return makeQueryChain({ single: jest.fn().mockResolvedValue({ data: { budget: 1000 }, error: null }) })
        }
        if (table === 'vendors') return vendorChain
        return makeQueryChain({})
      })

      const req = makePostRequest(validPayload)
      const res = await POST(req)
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('HTTP 404 when sourcing request does not exist', async () => {
      const reqChain = makeQueryChain({
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'staff_members') {
          return makeQueryChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
        }
        if (table === 'requests') return reqChain
        return makeQueryChain({})
      })

      const req = makePostRequest(validPayload)
      const res = await POST(req)
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toBe('Sourcing request not found')
    })

    it('HTTP 500 without leaking stack traces on unexpected internal error', async () => {
      // Force an unexpected exception in createBid
      mockCreateBid.mockRejectedValueOnce(new Error('Fatal database connection error with sensitive credentials'))

      const req = makePostRequest(validPayload)
      const res = await POST(req)
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBe('Internal server error')
      // Ensure error detail/trace is NOT leaked
      expect(JSON.stringify(json)).not.toContain('sensitive credentials')
    })
  })
})
