/**
 * P1-07 Batch 2 — Reader Migration & RSC Sanitization Tests
 */

import React from 'react'
import { POST as historyLookupPOST } from '@/app/api/requests/history-lookup/route'
import { GET as reuseGET } from '@/app/api/requests/[id]/reuse/route'
import OfferRoomPage from '@/app/[locale]/customer/request/[id]/page'
import OfferRoomClient from '@/components/customer/OfferRoomClient'
import { canonicalizeEgyptianMobile } from '@/lib/phone'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAdminFrom = jest.fn()
const mockServerFrom = jest.fn()
const mockVerifyOtp = jest.fn()
const mockGuardLookupRate = jest.fn()
const mockIsFeatureEnabled = jest.fn()
const mockGetFeatureConfig = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockServerFrom,
  })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockAdminFrom,
  })),
}))

jest.mock('@/lib/feature-flags/feature-service', () => ({
  isFeatureEnabled: (...args: any[]) => mockIsFeatureEnabled(...args),
  getFeatureConfig: (...args: any[]) => mockGetFeatureConfig(...args),
}))

jest.mock('@/lib/intelligence/lookup-guard', () => ({
  guardLookupRate: (...args: any[]) => mockGuardLookupRate(...args),
  normalizePhoneForLookup: (phone: string) => phone ? phone.trim() : null,
}))

jest.mock('@/lib/otp/verify', () => ({
  verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
}))

// Mock OfferRoomClient component to inspect props passed to it
jest.mock('@/components/customer/OfferRoomClient', () => {
  return jest.fn((props: any) => React.createElement('div', { 'data-testid': 'offer-room-mock' }, props.request?.product_name))
})

describe('P1-07 Batch 2 — Reader Migration & RSC Sanitization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsFeatureEnabled.mockResolvedValue(true)
    mockGetFeatureConfig.mockResolvedValue({ max_results: 3, lookback_days: 365 })
    mockGuardLookupRate.mockReturnValue({ valid: true })
    mockVerifyOtp.mockResolvedValue(true)
  })

  // ===========================================================================
  // A. RSC Sanitization Tests
  // ===========================================================================
  describe('A. RSC Sanitization (OfferRoomPage)', () => {
    it('selects ONLY safe fields and passes explicitly constructed clientSafeRequest to OfferRoomClient', async () => {
      const mockRawRow = {
        id: 'req-123',
        customer_id: 'cust-sensitive-uuid',
        customer_name: 'Ahmed Sensitive',
        customer_phone: '+201012345678',
        product_name: 'iPhone 15 Pro',
        category: 'electronics',
        target_location: 'Cairo, Egypt',
        max_price: 50000,
        additional_notes: 'Urgent delivery needed',
        status: 'open',
        created_at: '2026-09-18T00:00:00.000Z',
        internal_admin_notes: 'VIP customer',
      }

      const selectCalls: string[] = []

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'customer_requests') {
          return {
            select: (fields: string) => {
              selectCalls.push(fields)
              return {
                eq: () => ({
                  maybeSingle: async () => ({ data: mockRawRow, error: null }),
                }),
              }
            },
          }
        }
        if (table === 'requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { request_code: 'REQ-456' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'contributor_submissions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      })

      const pageElement = await OfferRoomPage({
        params: Promise.resolve({ locale: 'ar', id: 'req-123' }),
        searchParams: Promise.resolve({}),
      })

      expect(selectCalls.length).toBeGreaterThanOrEqual(1)
      const crSelect = selectCalls[0]

      // Prove customer_phone is NOT selected from customer_requests
      expect(crSelect).not.toContain('customer_phone')
      expect(crSelect).not.toContain('customer_id')
      expect(crSelect).not.toContain('customer_name')
      expect(crSelect).not.toContain('*')
      expect(crSelect).toBe('id, product_name, category, target_location, max_price, additional_notes, status, created_at')

      // Inspect props passed to OfferRoomClient in the returned JSX tree
      function findElementByType(node: any, targetType: any): any {
        if (!node || typeof node !== 'object') return null
        if (node.type === targetType) return node
        if (Array.isArray(node)) {
          for (const item of node) {
            const found = findElementByType(item, targetType)
            if (found) return found
          }
        }
        if (node.props?.children) {
          return findElementByType(node.props.children, targetType)
        }
        return null
      }

      const clientElement = findElementByType(pageElement, OfferRoomClient)
      expect(clientElement).not.toBeNull()
      const passedRequest = clientElement.props.request

      // Prove sensitive fields are NOT passed to OfferRoomClient
      expect(passedRequest.customer_phone).toBeUndefined()
      expect(passedRequest.customer_id).toBeUndefined()
      expect(passedRequest.customer_name).toBeUndefined()
      expect(passedRequest.internal_admin_notes).toBeUndefined()

      // Prove allowed fields remain available
      expect(passedRequest.id).toBe('req-123')
      expect(passedRequest.product_name).toBe('iPhone 15 Pro')
      expect(passedRequest.category).toBe('electronics')
      expect(passedRequest.target_location).toBe('Cairo, Egypt')
      expect(passedRequest.max_price).toBe(50000)
      expect(passedRequest.additional_notes).toBe('Urgent delivery needed')
      expect(passedRequest.status).toBe('open')
      expect(passedRequest.created_at).toBe('2026-09-18T00:00:00.000Z')
      expect(passedRequest.request_code).toBe('REQ-456')
    })
  })

  // ===========================================================================
  // B. History Lookup Migration Tests
  // ===========================================================================
  describe('B. History Lookup Migration', () => {
    it('1. Resolves customer by phone_number_normalized and queries customer_requests by customer_id', async () => {
      const mockCustomerId = 'cust-uuid-4644'
      const customerQueries: any[] = []
      const crQueries: any[] = []

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: () => ({
              eq: (col: string, val: string) => {
                customerQueries.push({ col, val })
                return {
                  maybeSingle: async () => ({
                    data: { id: mockCustomerId },
                    error: null,
                  }),
                }
              },
            }),
          }
        }
        if (table === 'customer_requests') {
          return {
            select: () => ({
              eq: (col: string, val: string) => {
                crQueries.push({ col, val })
                return {
                  gte: () => ({
                    order: () => ({
                      limit: async () => ({
                        data: [
                          {
                            id: 'req-1',
                            product_name: 'Laptop Dell',
                            category: 'computers',
                            status: 'open',
                            created_at: '2026-09-18T10:00:00.000Z',
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }
              },
            }),
          }
        }
        return { select: () => ({}) }
      })

      const req = new Request('http://localhost:3000/api/requests/history-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '01012345678', otpToken: 'valid-otp' }),
      })

      const res = await historyLookupPOST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.found).toBe(true)
      expect(json.requests).toHaveLength(1)
      expect(json.requests[0].productName).toBe('Laptop Dell')

      // Prove customer table was queried by canonical phone
      expect(customerQueries).toHaveLength(1)
      expect(customerQueries[0].col).toBe('phone_number_normalized')
      expect(customerQueries[0].val).toBe('+201012345678')

      // Prove customer_requests was queried by customer_id and NOT customer_phone
      expect(crQueries).toHaveLength(1)
      expect(crQueries[0].col).toBe('customer_id')
      expect(crQueries[0].val).toBe(mockCustomerId)

      // Prove response does NOT contain any phone number
      const stringified = JSON.stringify(json)
      expect(stringified).not.toContain('01012345678')
      expect(stringified).not.toContain('+201012345678')
      expect(stringified).not.toContain('customer_phone')
    })

    it('2. Format variations (local, 0-prefix, +20 prefix) canonicalize identically', async () => {
      const inputs = ['01012345678', '+201012345678', '201012345678', '00201012345678']
      const canonicals = inputs.map(canonicalizeEgyptianMobile)

      for (const c of canonicals) {
        expect(c).toBe('+201012345678')
      }
    })

    it('3. Unknown customer returns { found: false } without error', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        return { select: () => ({}) }
      })

      const req = new Request('http://localhost:3000/api/requests/history-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '01099999999', otpToken: 'valid-otp' }),
      })

      const res = await historyLookupPOST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({ found: false })
    })

    it('4. Customer with no requests returns { found: false }', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'cust-no-req' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'customer_requests') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return { select: () => ({}) }
      })

      const req = new Request('http://localhost:3000/api/requests/history-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '01012345678', otpToken: 'valid-otp' }),
      })

      const res = await historyLookupPOST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({ found: false })
    })

    it('5. Invalid phone returns 400 INVALID_PHONE', async () => {
      const req = new Request('http://localhost:3000/api/requests/history-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: 'not-a-phone', otpToken: 'valid-otp' }),
      })

      const res = await historyLookupPOST(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('INVALID_PHONE')
    })
  })

  // ===========================================================================
  // C. Request Reuse Migration Tests
  // ===========================================================================
  describe('C. Request Reuse Migration', () => {
    it('1. Correct customer phone succeeds and returns prefill data without leaking phone', async () => {
      const mockCustomerId = 'cust-123-uuid'
      const mockRequestRow = {
        id: 'req-abc',
        customer_id: mockCustomerId,
        product_name: 'Sony WH-1000XM5',
        category: 'electronics',
        target_location: 'Giza',
        max_price: 15000,
        additional_notes: 'Black color preferred',
        status: 'open',
        created_at: '2026-09-18T00:00:00.000Z',
      }

      const crSelectCols: string[] = []

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customer_requests') {
          return {
            select: (cols: string) => {
              crSelectCols.push(cols)
              return {
                eq: () => ({
                  maybeSingle: async () => ({ data: mockRequestRow, error: null }),
                }),
              }
            },
          }
        }
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { phone_number_normalized: '+201012345678' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { select: () => ({}) }
      })

      const req = new Request('http://localhost:3000/api/requests/req-abc/reuse?phone=01012345678')
      const res = await reuseGET(req, { params: Promise.resolve({ id: 'req-abc' }) })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.productName).toBe('Sony WH-1000XM5')
      expect(json.category).toBe('electronics')
      expect(json.targetLocation).toBe('Giza')
      expect(json.maxPrice).toBe(15000)
      expect(json.notes).toBe('Black color preferred')
      expect(json.sourceType).toBe('manual')

      // Prove customer_requests.customer_phone was NEVER selected
      expect(crSelectCols[0]).not.toContain('customer_phone')
      expect(crSelectCols[0]).toContain('customer_id')

      // Prove response does NOT leak any phone number
      const stringified = JSON.stringify(json)
      expect(stringified).not.toContain('01012345678')
      expect(stringified).not.toContain('+201012345678')
      expect(stringified).not.toContain('customer_phone')
      expect(stringified).not.toContain('phone')
    })

    it('2. Equivalent phone formatting (+20 vs 0) succeeds', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customer_requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'req-1', customer_id: 'cust-1', product_name: 'P', category: 'C', status: 'open' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { phone_number_normalized: '+201012345678' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { select: () => ({}) }
      })

      const req = new Request('http://localhost:3000/api/requests/req-1/reuse?phone=%2B201012345678')
      const res = await reuseGET(req, { params: Promise.resolve({ id: 'req-1' }) })
      expect(res.status).toBe(200)
    })

    it('3. Wrong customer phone returns 403 PHONE_MISMATCH', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customer_requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'req-1', customer_id: 'cust-owner', product_name: 'P', category: 'C', status: 'open' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { phone_number_normalized: '+201012345678' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { select: () => ({}) }
      })

      const req = new Request('http://localhost:3000/api/requests/req-1/reuse?phone=01099999999')
      const res = await reuseGET(req, { params: Promise.resolve({ id: 'req-1' }) })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error).toBe('PHONE_MISMATCH')
    })

    it('4. Missing or invalid phone returns 400 INVALID_PHONE', async () => {
      const req = new Request('http://localhost:3000/api/requests/req-1/reuse?phone=invalid')
      const res = await reuseGET(req, { params: Promise.resolve({ id: 'req-1' }) })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('INVALID_PHONE')
    })
  })
})
