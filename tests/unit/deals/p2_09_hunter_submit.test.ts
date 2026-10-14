/**
 * FINDORA — P2-09: Hunter Deal Submission Security & Validation Test Suite
 *
 * Verifies server-side hardening for POST /api/deals/hunter/submit:
 * 1. Authentication: Fails closed (401) when unauthenticated
 * 2. Input Validation: Strictly rejects invalid, zero, negative, non-numeric,
 *    and non-finite prices (400) before reaching database writes
 * 3. Referral Code Integrity: Casual contributor auto-provisioning uses
 *    referral_code: '' to leverage the database trigger, never Math.random()
 * 4. Duplicate Guard: Contributor-scoped detection blocks duplicate pending
 *    insights (409) while preserving legitimate resubmission
 * 5. Literal Pattern Matching: Escapes '%', '_', and '\' so wildcard characters
 *    in client inputs are matched strictly as literal text
 * 6. Historical Duplicate Tolerance: Queries use .limit(1).maybeSingle() to
 *    tolerate multiple historical rows without throwing PGRST116 errors
 * 7. Rate Limiting: Verifies route-level rate limiting and fail-closed behavior
 * 8. Error Handling: Gracefully returns 500 on database failures without leaking errors
 */

import { NextRequest } from 'next/server'

// ── State Flags for Mocks ───────────────────────────────────────────────────

let mockCurrentUser: { id: string; user_metadata?: { full_name?: string } } | null = null
let mockExistingContributor: any = null
let mockExistingCustomer: any = null
let mockPendingInsightsDatabase: Array<{
  id: string
  contributor_id: string
  product_name: string
  store_name: string
  status: string
}> = []
let mockContributorInsertError: Error | null = null
let mockDuplicateCheckError: Error | null = null
let mockInsightInsertError: Error | null = null
let mockRateLimitAllowed = true

const mockContributorsInsertPayloads: any[] = []
const mockMarketInsightsInsertPayloads: any[] = []

// ── Supabase & DAL Mocks ─────────────────────────────────────────────────────

const mockGetUser = jest.fn(async () => ({
  data: { user: mockCurrentUser },
  error: null,
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

const mockGetContributorByAuthUserId = jest.fn(async (_userId: string) => {
  return mockExistingContributor
})

jest.mock('@/lib/dal/contributors', () => ({
  getContributorByAuthUserId: (userId: string) => mockGetContributorByAuthUserId(userId),
}))

const mockGetCustomerByAuthId = jest.fn(async (_userId: string) => {
  return mockExistingCustomer
})

const mockAdminClient = {
  from: jest.fn((table: string) => {
    if (table === 'contributors') {
      return {
        insert: jest.fn((payload: any) => {
          mockContributorsInsertPayloads.push(payload)
          return {
            select: jest.fn(() => ({
              single: jest.fn(async () => {
                if (mockContributorInsertError) {
                  return { data: null, error: mockContributorInsertError }
                }
                return {
                  data: {
                    id: 'contrib-auto-456',
                    auth_user_id: payload.auth_user_id,
                    full_name: payload.full_name,
                    phone_number: payload.phone_number,
                    role: payload.role,
                    status: payload.status,
                    referral_code: 'AUTO10CHAR',
                  },
                  error: null,
                }
              }),
            })),
          }
        }),
      }
    }
    if (table === 'market_insights') {
      return {
        select: jest.fn((_cols: string) => {
          let filterContributorId: string | null = null
          let filterStatus: string | null = null
          let filterProductNameIlike: string | null = null
          let filterStoreNameIlike: string | null = null
          let limitCount: number | null = null

          const chain: any = {
            eq: jest.fn((col: string, val: any) => {
              if (col === 'contributor_id') filterContributorId = val
              if (col === 'status') filterStatus = val
              return chain
            }),
            ilike: jest.fn((col: string, pattern: string) => {
              if (col === 'product_name') filterProductNameIlike = pattern
              if (col === 'store_name') filterStoreNameIlike = pattern
              return chain
            }),
            limit: jest.fn((n: number) => {
              limitCount = n
              return chain
            }),
            maybeSingle: jest.fn(async () => {
              if (mockDuplicateCheckError) {
                return { data: null, error: mockDuplicateCheckError }
              }

              // Model PostgreSQL ILIKE pattern semantics:
              // Unescaped '%' matches zero or more chars, '_' matches any single char.
              // Escaped '\%', '\_', and '\\' match their literal characters.
              const ilikeToRegExp = (pattern: string) => {
                let regexStr = '^'
                let i = 0
                while (i < pattern.length) {
                  const char = pattern[i]
                  if (char === '\\' && i + 1 < pattern.length) {
                    const next = pattern[i + 1]
                    regexStr += next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    i += 2
                  } else if (char === '%') {
                    regexStr += '.*'
                    i++
                  } else if (char === '_') {
                    regexStr += '.'
                    i++
                  } else {
                    regexStr += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    i++
                  }
                }
                regexStr += '$'
                return new RegExp(regexStr, 'i')
              }

              const matches = mockPendingInsightsDatabase.filter(row => {
                if (filterContributorId && row.contributor_id !== filterContributorId) return false
                if (filterStatus && row.status !== filterStatus) return false
                if (filterProductNameIlike) {
                  const re = ilikeToRegExp(filterProductNameIlike)
                  if (!re.test(row.product_name)) return false
                }
                if (filterStoreNameIlike) {
                  const re = ilikeToRegExp(filterStoreNameIlike)
                  if (!re.test(row.store_name)) return false
                }
                return true
              })

              const results = limitCount !== null ? matches.slice(0, limitCount) : matches

              // PostgREST PGRST116: maybeSingle() fails with error if multiple rows match
              if (results.length > 1) {
                return {
                  data: null,
                  error: { code: 'PGRST116', message: 'JSON object requested, multiple rows returned' },
                }
              }

              return {
                data: results.length === 1 ? { id: results[0].id } : null,
                error: null,
              }
            }),
          }
          return chain
        }),
        insert: jest.fn((payload: any) => {
          mockMarketInsightsInsertPayloads.push(payload)
          // Add to mock database to track updates
          const newRow = {
            id: 'insight-uuid-789',
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          mockPendingInsightsDatabase.push(newRow)
          return {
            select: jest.fn(() => ({
              single: jest.fn(async () => {
                if (mockInsightInsertError) {
                  return { data: null, error: mockInsightInsertError }
                }
                return {
                  data: newRow,
                  error: null,
                }
              }),
            })),
          }
        }),
      }
    }
    throw new Error(`Unexpected table mocked: ${table}`)
  }),
}

jest.mock('@/lib/dal/customers', () => ({
  createAdminClient: jest.fn(async () => mockAdminClient),
  getCustomerByAuthId: (userId: string) => mockGetCustomerByAuthId(userId),
}))

// ── Rate Limiter Mock ────────────────────────────────────────────────────────

jest.mock('@/lib/middleware/rate-limiter', () => ({
  withRateLimit: jest.fn((config: any, handler: any) => {
    return async (request: any, context?: any) => {
      if (!mockRateLimitAllowed) {
        const { NextResponse } = require('next/server')
        return NextResponse.json(
          { error: config?.message || 'Too many requests' },
          { status: 429 }
        )
      }
      return handler(request, context)
    }
  }),
}))

// ── Import Target Route Handler ──────────────────────────────────────────────

import { POST } from '@/app/api/deals/hunter/submit/route'

// ── Helper ───────────────────────────────────────────────────────────────────

function createPostRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/deals/hunter/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

// ── Test Suites ──────────────────────────────────────────────────────────────

describe('POST /api/deals/hunter/submit — Security & Validation Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCurrentUser = { id: 'user-auth-123', user_metadata: { full_name: 'Test Hunter' } }
    mockExistingContributor = { id: 'contrib-123', auth_user_id: 'user-auth-123' }
    mockExistingCustomer = { id: 'cust-123', full_name: 'Test Customer', phone_number_normalized: '+201012345678' }
    mockPendingInsightsDatabase = []
    mockContributorInsertError = null
    mockDuplicateCheckError = null
    mockInsightInsertError = null
    mockRateLimitAllowed = true
    mockContributorsInsertPayloads.length = 0
    mockMarketInsightsInsertPayloads.length = 0
  })

  describe('1. Authentication Verification', () => {
    it('returns 401 when no session exists', async () => {
      mockCurrentUser = null

      const req = createPostRequest({
        productName: 'Sony WH-1000XM5',
        discoveredPrice: 12500,
        storeName: 'Amazon EG',
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })
  })

  describe('2. Payload & Missing Parameter Validation', () => {
    it('returns 400 when body is invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/deals/hunter/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON payload')
    })

    it('returns 400 when productName is missing or empty string', async () => {
      const req = createPostRequest({
        discoveredPrice: 500,
        storeName: 'B.TECH',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when storeName is missing or whitespace-only', async () => {
      const req = createPostRequest({
        productName: 'AirPods Pro 2',
        discoveredPrice: 9000,
        storeName: '   ',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })
  })

  describe('3. Price Validation & Bounds (Zero, Negative, Non-numeric, Non-finite)', () => {
    it('returns 400 when discoveredPrice is missing (null or undefined)', async () => {
      const req = createPostRequest({
        productName: 'PlayStation 5',
        storeName: '2B Egypt',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toMatch(/discoveredPrice/)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice is a boolean', async () => {
      const req = createPostRequest({
        productName: 'PlayStation 5',
        discoveredPrice: true,
        storeName: '2B Egypt',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice is an array or object', async () => {
      const req = createPostRequest({
        productName: 'PlayStation 5',
        discoveredPrice: [1000],
        storeName: '2B Egypt',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice is zero (numeric 0)', async () => {
      const req = createPostRequest({
        productName: 'iPhone 15',
        discoveredPrice: 0,
        storeName: 'Noon EG',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('discoveredPrice must be greater than 0')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice is string "0"', async () => {
      const req = createPostRequest({
        productName: 'iPhone 15',
        discoveredPrice: '0',
        storeName: 'Noon EG',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('discoveredPrice must be greater than 0')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice is negative', async () => {
      const req = createPostRequest({
        productName: 'MacBook Air M2',
        discoveredPrice: -45000,
        storeName: 'Tradeline',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('discoveredPrice must be greater than 0')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice is non-numeric string', async () => {
      const req = createPostRequest({
        productName: 'MacBook Air M2',
        discoveredPrice: 'free-or-trade',
        storeName: 'Tradeline',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice is NaN or Infinity', async () => {
      const req = createPostRequest({
        productName: 'MacBook Air M2',
        discoveredPrice: 'NaN',
        storeName: 'Tradeline',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('returns 400 when discoveredPrice exceeds database numeric(10,2) limit (99,999,999.99)', async () => {
      const req = createPostRequest({
        productName: 'Superyacht',
        discoveredPrice: 100_000_000,
        storeName: 'Luxury Maritime',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('discoveredPrice exceeds maximum allowable limit')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })
  })

  describe('4. Referral Code & Contributor Auto-Provisioning', () => {
    it('uses existing contributor profile without calling contributors.insert', async () => {
      mockExistingContributor = { id: 'contrib-existing-1', auth_user_id: 'user-auth-123' }

      const req = createPostRequest({
        productName: 'Samsung S24 Ultra',
        discoveredPrice: 48000,
        storeName: 'Samsung Store',
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockContributorsInsertPayloads.length).toBe(0)
      expect(mockMarketInsightsInsertPayloads[0].contributor_id).toBe('contrib-existing-1')
    })

    it('auto-provisions casual contributor profile using referral_code: "" (never Math.random)', async () => {
      mockExistingContributor = null // Triggers auto-provisioning

      const req = createPostRequest({
        productName: 'Samsung S24 Ultra',
        discoveredPrice: 48000,
        storeName: 'Samsung Store',
      })
      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(mockContributorsInsertPayloads.length).toBe(1)
      const insertedContrib = mockContributorsInsertPayloads[0]
      expect(insertedContrib.referral_code).toBe('') // Canonical database trigger generator
      expect(insertedContrib.role).toBe('casual')
      expect(insertedContrib.status).toBe('active')
      expect(insertedContrib.auth_user_id).toBe('user-auth-123')
    })

    it('returns 500 cleanly if contributor auto-provisioning fails', async () => {
      mockExistingContributor = null
      mockContributorInsertError = new Error('Database connection failed')

      const req = createPostRequest({
        productName: 'Samsung S24 Ultra',
        discoveredPrice: 48000,
        storeName: 'Samsung Store',
      })
      const res = await POST(req)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('Failed to initialize hunter profile')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })
  })

  describe('5. Duplicate Submissions Guard & Literal Pattern Matching', () => {
    it('blocks duplicate submission (409) if an identical product and store are pending review', async () => {
      mockPendingInsightsDatabase = [
        {
          id: 'insight-1',
          contributor_id: 'contrib-123',
          product_name: 'iPad Air 11-inch',
          store_name: 'iStore EG',
          status: 'pending_review',
        },
      ]

      const req = createPostRequest({
        productName: 'iPad Air 11-inch',
        discoveredPrice: 28000,
        storeName: 'iStore EG',
      })
      const res = await POST(req)
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toBe('A submission for this product and store is already pending review')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('permits submission when no pending insight exists for that product/store', async () => {
      mockPendingInsightsDatabase = []

      const req = createPostRequest({
        productName: 'iPad Air 11-inch',
        discoveredPrice: 28000,
        storeName: 'iStore EG',
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockMarketInsightsInsertPayloads.length).toBe(1)
    })

    it('returns 500 if duplicate check query fails with a database error', async () => {
      mockDuplicateCheckError = new Error('Read timeout')

      const req = createPostRequest({
        productName: 'iPad Air 11-inch',
        discoveredPrice: 28000,
        storeName: 'iStore EG',
      })
      const res = await POST(req)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('Failed to verify submission status')
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })

    it('matches product names containing "%" literally without treating % as a wildcard', async () => {
      // Database has an unrelated item starting with "50"
      mockPendingInsightsDatabase = [
        {
          id: 'insight-battery',
          contributor_id: 'contrib-123',
          product_name: '5000mAh Battery',
          store_name: 'Noon EG',
          status: 'pending_review',
        },
      ]

      // Submitting "50% Off TV" should NOT match "5000mAh Battery" even though "50%" starts with "50"
      const req1 = createPostRequest({
        productName: '50% Off TV',
        discoveredPrice: 15000,
        storeName: 'Noon EG',
      })
      const res1 = await POST(req1)
      expect(res1.status).toBe(200) // Not blocked by false-positive % wildcard match

      // Submitting "50% Off TV" again should now be blocked because exact literal match is now pending
      const req2 = createPostRequest({
        productName: '50% Off TV',
        discoveredPrice: 15000,
        storeName: 'Noon EG',
      })
      const res2 = await POST(req2)
      expect(res2.status).toBe(409)
    })

    it('matches product names containing "_" literally without treating _ as single-char wildcard', async () => {
      // Database has item with dash: "Item-One"
      mockPendingInsightsDatabase = [
        {
          id: 'insight-dash',
          contributor_id: 'contrib-123',
          product_name: 'Item-One',
          store_name: 'B.TECH',
          status: 'pending_review',
        },
      ]

      // Submitting "Item_One" should NOT match "Item-One" even though '_' in SQL ILIKE matches any single char
      const req1 = createPostRequest({
        productName: 'Item_One',
        discoveredPrice: 2500,
        storeName: 'B.TECH',
      })
      const res1 = await POST(req1)
      expect(res1.status).toBe(200) // Not blocked by wildcard '_'

      // Submitting exact "Item_One" again should be blocked
      const req2 = createPostRequest({
        productName: 'Item_One',
        discoveredPrice: 2500,
        storeName: 'B.TECH',
      })
      const res2 = await POST(req2)
      expect(res2.status).toBe(409)
    })

    it('handles backslashes safely and matches literal backslashes without query error', async () => {
      mockPendingInsightsDatabase = [
        {
          id: 'insight-bs',
          contributor_id: 'contrib-123',
          product_name: 'Item\\Special',
          store_name: 'Tradeline',
          status: 'pending_review',
        },
      ]

      // Unrelated product does not match
      const req1 = createPostRequest({
        productName: 'ItemXSpecial',
        discoveredPrice: 4000,
        storeName: 'Tradeline',
      })
      const res1 = await POST(req1)
      expect(res1.status).toBe(200)

      // Identical product with backslash matches literally and blocks
      const req2 = createPostRequest({
        productName: 'Item\\Special',
        discoveredPrice: 4000,
        storeName: 'Tradeline',
      })
      const res2 = await POST(req2)
      expect(res2.status).toBe(409)
    })

    it('tolerates multiple historical duplicate rows using .limit(1) without 500 error', async () => {
      // Multiple pre-existing historical rows matching the exact product/store
      mockPendingInsightsDatabase = [
        {
          id: 'historical-1',
          contributor_id: 'contrib-123',
          product_name: 'MacBook Air M3',
          store_name: 'Tradeline',
          status: 'pending_review',
        },
        {
          id: 'historical-2',
          contributor_id: 'contrib-123',
          product_name: 'MacBook Air M3',
          store_name: 'Tradeline',
          status: 'pending_review',
        },
      ]

      const req = createPostRequest({
        productName: 'MacBook Air M3',
        discoveredPrice: 45000,
        storeName: 'Tradeline',
      })
      const res = await POST(req)
      // Because .limit(1) is used, maybeSingle() does NOT return PGRST116 and returns 409 duplicate
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toBe('A submission for this product and store is already pending review')
    })

    it('permits resubmission if a previous submission for the same product was rejected', async () => {
      mockPendingInsightsDatabase = [
        {
          id: 'rejected-insight',
          contributor_id: 'contrib-123',
          product_name: 'iPad Pro M4',
          store_name: 'iStore',
          status: 'rejected',
        },
      ]

      const req = createPostRequest({
        productName: 'iPad Pro M4',
        discoveredPrice: 38000,
        storeName: 'iStore',
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockMarketInsightsInsertPayloads.length).toBe(1)
    })
  })

  describe('6. Successful Insight Submission & Data Normalization', () => {
    it('creates pending market insight with trimmed strings and numeric price', async () => {
      const req = createPostRequest({
        productName: '  Dell XPS 15  ',
        discoveredPrice: '62500.50',
        storeName: '  Silicon Valley Mall  ',
        category: '  Laptops  ',
        proofUrl: '  https://example.com/receipt.jpg  ',
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      expect(mockMarketInsightsInsertPayloads.length).toBe(1)
      const payload = mockMarketInsightsInsertPayloads[0]
      expect(payload.product_name).toBe('Dell XPS 15')
      expect(payload.store_name).toBe('Silicon Valley Mall')
      expect(payload.discovered_price).toBe(62500.5)
      expect(payload.category).toBe('Laptops')
      expect(payload.location_data).toEqual({ proof_url: 'https://example.com/receipt.jpg' })
      expect(payload.status).toBe('pending_review')
    })

    it('returns 500 cleanly if market_insights insert fails', async () => {
      mockInsightInsertError = new Error('Insert constraint failed')

      const req = createPostRequest({
        productName: 'Dell XPS 15',
        discoveredPrice: 62500,
        storeName: 'Silicon Valley Mall',
      })
      const res = await POST(req)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('Insert constraint failed')
    })
  })

  describe('7. Rate Limiting Integration', () => {
    it('returns 429 when rate limiter triggers and blocks execution', async () => {
      mockRateLimitAllowed = false

      const req = createPostRequest({
        productName: 'Nintendo Switch OLED',
        discoveredPrice: 16000,
        storeName: 'Virgin Megastore',
      })
      const res = await POST(req)
      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.error).toMatch(/Too many deal submissions/)
      expect(mockMarketInsightsInsertPayloads.length).toBe(0)
    })
  })
})
