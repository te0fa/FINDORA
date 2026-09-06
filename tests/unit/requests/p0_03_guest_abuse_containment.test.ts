/**
 * P0-03-A — Guest Request Abuse Containment Unit Tests
 *
 * Verifies:
 * 1. Turnstile Verification Helper:
 *    - Valid tokens pass verification.
 *    - Invalid tokens fail with INVALID_OR_EXPIRED_TOKEN.
 *    - Missing tokens fail with MISSING_TURNSTILE_TOKEN.
 *    - Missing secret key in production fails closed with TURNSTILE_CONFIGURATION_ERROR.
 *    - Non-production supports 'mock-turnstile-pass' and 'mock-turnstile-fail'.
 *
 * 2. Dedicated Proxy Rate Limiting Configuration:
 *    - Dedicated limit of 5 requests / 600 seconds for /api/customers/requests/create.
 *
 * 3. Route Request Hardening & Payload Bounds:
 *    - Missing/invalid Turnstile token yields HTTP 403.
 *    - Oversized customerName (> 100 chars) yields HTTP 400.
 *    - Oversized productName (> 150 chars) yields HTTP 400.
 *    - Oversized notes (> 2000 chars) yields HTTP 400.
 *    - Negative or excessive maxPrice yields HTTP 400.
 *    - Negative or excessive quantity yields HTTP 400.
 *    - Oversized metadata (> 10KB) yields HTTP 400.
 *
 * 4. Decoupled AI & Demand Expansion:
 *    - Synchronous Gemini RFQ is NOT invoked during intake.
 *    - Synchronous expandDemandAndCreateTasks is NOT invoked during intake.
 *    - Staff auto-assignment (autoAssignReviewerToRequest) is preserved.
 *    - Canonical fn_create_sourcing_request is invoked atomically.
 *    - Idempotency key from header or body is preserved safely in metadata.
 */

import { POST } from '@/app/api/customers/requests/create/route'
import { verifyTurnstileToken } from '@/lib/security/turnstile'
import { getRateLimitConfig } from '@/proxy'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRpc = jest.fn()
const mockGetUser = jest.fn()
const mockAdminFrom = jest.fn()
const mockServerFrom = jest.fn()
const mockUpsertGuestCustomerByPhone = jest.fn()
const mockExpandDemandAndCreateTasks = jest.fn()
const mockAutoAssignReviewerToRequest = jest.fn()
const mockGenerateRfqDocument = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockServerFrom,
  })),
}))

jest.mock('@/lib/dal/customers', () => ({
  createAdminClient: jest.fn(() => ({
    rpc: mockRpc,
    from: mockAdminFrom,
  })),
  upsertGuestCustomerByPhone: (...args: any[]) => mockUpsertGuestCustomerByPhone(...args),
}))

jest.mock('@/lib/intelligence/demand-expansion', () => ({
  expandDemandAndCreateTasks: (...args: any[]) => mockExpandDemandAndCreateTasks(...args),
}))

jest.mock('@/lib/dal/staff', () => ({
  autoAssignReviewerToRequest: (...args: any[]) => mockAutoAssignReviewerToRequest(...args),
}))

jest.mock('@/lib/gemini/client', () => ({
  generateRfqDocument: (...args: any[]) => mockGenerateRfqDocument(...args),
}))

describe('P0-03-A: Turnstile Verification Helper', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('fails closed in production if TURNSTILE_SECRET_KEY is missing', async () => {
    (process.env as any).NODE_ENV = 'production'
    delete process.env.TURNSTILE_SECRET_KEY

    const result = await verifyTurnstileToken('some-token')
    expect(result.success).toBe(false)
    expect(result.error).toBe('TURNSTILE_CONFIGURATION_ERROR')
  })

  it('returns MISSING_TURNSTILE_TOKEN when token is empty and secret is set', async () => {
    process.env.TURNSTILE_SECRET_KEY = '0x4AAAAAAtestsecret'

    const result = await verifyTurnstileToken('')
    expect(result.success).toBe(false)
    expect(result.error).toBe('MISSING_TURNSTILE_TOKEN')
  })

  it('allows mock-turnstile-pass in non-production environments', async () => {
    (process.env as any).NODE_ENV = 'development'
    process.env.TURNSTILE_SECRET_KEY = '0x4AAAAAAtestsecret'

    const result = await verifyTurnstileToken('mock-turnstile-pass')
    expect(result.success).toBe(true)
  })

  it('rejects mock-turnstile-fail in non-production environments', async () => {
    (process.env as any).NODE_ENV = 'development'
    process.env.TURNSTILE_SECRET_KEY = '0x4AAAAAAtestsecret'

    const result = await verifyTurnstileToken('mock-turnstile-fail')
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_TURNSTILE_TOKEN')
  })

  it('verifies token against Cloudflare API when valid secret is configured', async () => {
    (process.env as any).NODE_ENV = 'production'
    process.env.TURNSTILE_SECRET_KEY = 'real-secret-key'

    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, 'error-codes': [] }),
    }) as any

    try {
      const result = await verifyTurnstileToken('valid-cf-token', '1.2.3.4')
      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
        })
      )
    } finally {
      global.fetch = originalFetch
    }
  })

  it('rejects token when Cloudflare API reports invalid token', async () => {
    (process.env as any).NODE_ENV = 'production'
    process.env.TURNSTILE_SECRET_KEY = 'real-secret-key'

    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }) as any

    try {
      const result = await verifyTurnstileToken('bad-cf-token', '1.2.3.4')
      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_OR_EXPIRED_TOKEN')
    } finally {
      global.fetch = originalFetch
    }
  })
})

describe('P0-03-A: Dedicated Proxy Rate Limiting Configuration', () => {
  it('applies dedicated limit of 5 requests per 600s to customer request creation endpoint', () => {
    const configDirect = getRateLimitConfig('/api/customers/requests/create')
    expect(configDirect).toEqual({ limit: 5, windowSeconds: 600 })

    const configWithLocaleAr = getRateLimitConfig('/ar/api/customers/requests/create')
    expect(configWithLocaleAr).toEqual({ limit: 5, windowSeconds: 600 })

    const configWithLocaleEn = getRateLimitConfig('/en/api/customers/requests/create')
    expect(configWithLocaleEn).toEqual({ limit: 5, windowSeconds: 600 })

    const configSubpath = getRateLimitConfig('/api/customers/requests/create/sub')
    expect(configSubpath).toEqual({ limit: 5, windowSeconds: 600 })
  })

  it('keeps general APIs at higher threshold without affecting customer creation endpoint', () => {
    const generalConfig = getRateLimitConfig('/api/customers/general-query')
    expect(generalConfig).toEqual({ limit: 1000, windowSeconds: 60 })
  })
})

describe('P0-03-A: Route Intake Hardening & Payload Bounds', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }

    // Mock existing customer
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-p003' } }, error: null })
    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'cust-p003-id' } }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })
    mockRpc.mockResolvedValue({ data: { success: true, request: { id: 'req-p003-id' } }, error: null })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects oversized customerName (> 100 characters)', async () => {
    const longName = 'A'.repeat(101)
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: longName,
        productName: 'Valid Product',
        customerPhone: '01012345678',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/100 characters/i)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects oversized productName (> 150 characters)', async () => {
    const longProduct = 'B'.repeat(151)
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Valid Name',
        productName: longProduct,
        customerPhone: '01012345678',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/150 characters/i)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects oversized notes (> 2000 characters)', async () => {
    const longNotes = 'C'.repeat(2001)
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Valid Name',
        productName: 'Valid Product',
        customerPhone: '01012345678',
        notes: longNotes,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/2000 characters/i)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects negative maxPrice', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Valid Name',
        productName: 'Valid Product',
        customerPhone: '01012345678',
        maxPrice: -50,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/positive number/i)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects invalid or negative quantity', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Valid Name',
        productName: 'Valid Product',
        customerPhone: '01012345678',
        quantity: -5,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Quantity cannot be negative/i)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects oversized metadata (> 10KB)', async () => {
    const giantMetadata = {
      blob: 'x'.repeat(11000),
    }

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Valid Name',
        productName: 'Valid Product',
        customerPhone: '01012345678',
        metadata: giantMetadata,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/10KB/i)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects request with HTTP 403 when Turnstile verification fails', async () => {
    (process.env as any).NODE_ENV = 'development'
    process.env.TURNSTILE_SECRET_KEY = 'configured-secret'

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Valid Name',
        productName: 'Valid Product',
        customerPhone: '01012345678',
        turnstileToken: 'mock-turnstile-fail',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.code).toBe('INVALID_TURNSTILE_TOKEN')
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

describe('P0-03-A: Decoupled AI & Demand Expansion Containment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }

    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-b2b' } }, error: null })
    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'b2b-customer-id' } }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })
    mockRpc.mockResolvedValue({ data: { success: true, request: { id: 'b2b-req-id' } }, error: null })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('does NOT invoke Gemini generateRfqDocument during intake, generating structured RFQ instead', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'client-uuid-12345',
      },
      body: JSON.stringify({
        customerName: 'Procurement Manager',
        productName: 'Commercial Solar Panels',
        category: 'industrial',
        targetLocation: 'Alexandria',
        isBusiness: true,
        companyName: 'Solar Solutions LLC',
        crNumber: 'CR-998877',
        taxNumber: 'TAX-554433',
        quantity: 100,
        notes: 'High efficiency mono-crystalline panels required',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    // 1. Billable Gemini API was NEVER called synchronously
    expect(mockGenerateRfqDocument).not.toHaveBeenCalled()

    // 2. Synchronous task amplification was NEVER called
    expect(mockExpandDemandAndCreateTasks).not.toHaveBeenCalled()

    // 3. Staff assignment was preserved
    expect(mockAutoAssignReviewerToRequest).toHaveBeenCalled()

    // 4. Sourcing request was created via atomic idempotent RPC with structured RFQ and idempotency metadata
    expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request_idempotent', expect.objectContaining({
      p_customer_name: 'Procurement Manager',
      p_product_name: 'Commercial Solar Panels',
      p_is_business: true,
      p_business_metadata: expect.objectContaining({
        company_name: 'Solar Solutions LLC',
        cr_number: 'CR-998877',
        tax_number: 'TAX-554433',
        quantity: '100',
      }),
      p_rfq_document: expect.stringContaining('# Request for Quote (RFQ)'),
      p_metadata: expect.objectContaining({
        idempotency_key: 'client-uuid-12345',
      }),
    }))
  })
})
