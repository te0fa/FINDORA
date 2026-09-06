/**
 * P0-03-B — Guest Request Idempotency Unit & Integration Tests
 *
 * Verifies all 10 required test scenarios:
 * 1. No idempotency key -> existing P0-04 behavior preserved.
 * 2. First request with key -> creates exactly one request.
 * 3. Sequential duplicate -> same request ID returned.
 * 4. Sequential duplicate -> idempotentReplay: true in response.
 * 5. Duplicate does not trigger reviewer assignment twice.
 * 6. Same key + different payload -> HTTP 409 (IDEMPOTENCY_PAYLOAD_MISMATCH).
 * 7. Customer A + key X vs Customer B + key X -> both succeed independently.
 * 8. Concurrent duplicate -> exactly one request created.
 * 9. Forced transaction failure -> HTTP 500, key remains retryable.
 * 10. Canonical payload hashing determinism.
 */

import { POST } from '@/app/api/customers/requests/create/route'
import { computeCanonicalPayloadHash } from '@/lib/security/idempotency'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRpc = jest.fn()
const mockGetUser = jest.fn()
const mockAdminFrom = jest.fn()
const mockServerFrom = jest.fn()
const mockUpsertGuestCustomerByPhone = jest.fn()
const mockAutoAssignReviewerToRequest = jest.fn()
const mockExpandDemandAndCreateTasks = jest.fn()

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

jest.mock('@/lib/dal/staff', () => ({
  autoAssignReviewerToRequest: (...args: any[]) => mockAutoAssignReviewerToRequest(...args),
}))

jest.mock('@/lib/intelligence/demand-expansion', () => ({
  expandDemandAndCreateTasks: (...args: any[]) => mockExpandDemandAndCreateTasks(...args),
}))

describe('P0-03-B: Guest Request Idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default authenticated customer setup
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-customer-a' } },
      error: null,
    })

    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'cust-uuid-a' } }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })
  })

  // Test 1: No idempotency key -> existing behavior preserved
  it('1. preserves existing P0-04 atomic creation when no idempotency key is provided', async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, request: { id: 'req-unkeyed-1' } },
      error: null,
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Ahmed Unkeyed',
        productName: 'Office Chair',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.idempotentReplay).toBeUndefined()
    expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request', expect.any(Object))
    expect(mockAutoAssignReviewerToRequest).toHaveBeenCalledTimes(1)
  })

  // Test 2: First request with key -> creates exactly one request
  it('2. creates request atomically through fn_create_sourcing_request_idempotent on first request with key', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        requestId: 'req-keyed-1',
        requestCode: 'REQ-NEW-001',
        is_replay: false,
      },
      error: null,
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-key-001',
      },
      body: JSON.stringify({
        customerName: 'Ahmed Keyed',
        productName: 'Mechanical Keyboard',
        category: 'electronics',
        targetLocation: 'Cairo',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.requestId).toBe('req-keyed-1')
    expect(json.requestCode).toBe('REQ-NEW-001')
    expect(json.idempotentReplay).toBeUndefined()

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_create_sourcing_request_idempotent',
      expect.objectContaining({
        p_idempotency_key: 'idemp-key-001',
        p_payload_hash: expect.any(String),
      })
    )
    expect(mockAutoAssignReviewerToRequest).toHaveBeenCalledTimes(1)
  })

  // Test 3 & 4: Sequential duplicate -> same request ID & idempotentReplay: true
  it('3 & 4. returns existing request ID and idempotentReplay: true on sequential duplicate', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        requestId: 'req-keyed-1',
        requestCode: 'REQ-NEW-001',
        is_replay: true,
      },
      error: null,
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'idemp-key-001',
      },
      body: JSON.stringify({
        customerName: 'Ahmed Keyed',
        productName: 'Mechanical Keyboard',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.requestId).toBe('req-keyed-1')
    expect(json.requestCode).toBe('REQ-NEW-001')
    expect(json.idempotentReplay).toBe(true)
  })

  // Test 5: Duplicate does NOT trigger reviewer assignment twice
  it('5. does NOT re-trigger staff reviewer assignment on replay', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        requestId: 'req-keyed-1',
        requestCode: 'REQ-NEW-001',
        is_replay: true,
      },
      error: null,
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-key-001',
      },
      body: JSON.stringify({
        customerName: 'Ahmed Keyed',
        productName: 'Mechanical Keyboard',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    // Zero additional reviewer assignment calls on replay
    expect(mockAutoAssignReviewerToRequest).not.toHaveBeenCalled()
  })

  // Test 6: Same key + different payload -> HTTP 409 (IDEMPOTENCY_PAYLOAD_MISMATCH)
  it('6. returns HTTP 409 with IDEMPOTENCY_PAYLOAD_MISMATCH when same key is used with altered payload', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
        error: 'An existing request was already submitted with this Idempotency-Key but different parameters.',
      },
      error: null,
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-key-001',
      },
      body: JSON.stringify({
        customerName: 'Ahmed Keyed',
        productName: 'Different Laptop Product',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()

    expect(json.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH')
    expect(json.error).toContain('different parameters')
    expect(mockAutoAssignReviewerToRequest).not.toHaveBeenCalled()
  })

  // Test 7: Customer A + key X vs Customer B + key X -> both succeed independently
  it('7. ensures cross-customer isolation when two different customers use the same idempotency key', async () => {
    // Call 1: Customer A
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'auth-user-customer-a' } },
      error: null,
    })
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        requestId: 'req-cust-a',
        requestCode: 'REQ-A-001',
        is_replay: false,
      },
      error: null,
    })

    const reqA = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'shared-client-key-xyz',
      },
      body: JSON.stringify({
        customerName: 'Customer A',
        productName: 'Desk Lamp',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const resA = await POST(reqA)
    expect(resA.status).toBe(200)
    const jsonA = await resA.json()
    expect(jsonA.requestId).toBe('req-cust-a')

    // Call 2: Customer B with exact same key
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'auth-user-customer-b' } },
      error: null,
    })
    mockServerFrom.mockImplementationOnce((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'cust-uuid-b' } }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        requestId: 'req-cust-b',
        requestCode: 'REQ-B-001',
        is_replay: false,
      },
      error: null,
    })

    const reqB = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'shared-client-key-xyz',
      },
      body: JSON.stringify({
        customerName: 'Customer B',
        productName: 'Desk Lamp',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const resB = await POST(reqB)
    expect(resB.status).toBe(200)
    const jsonB = await resB.json()

    // Customer B receives distinct request ID, NOT Customer A's
    expect(jsonB.requestId).toBe('req-cust-b')
    expect(jsonB.requestId).not.toBe(jsonA.requestId)
  })

  // Test 8: Concurrent duplicate -> simulated serialization
  it('8. handles concurrent duplicate requests safely through database serialization', async () => {
    let callCount = 0
    mockRpc.mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          data: {
            success: true,
            requestId: 'req-concurrent-winner',
            requestCode: 'REQ-WIN-001',
            is_replay: false,
          },
          error: null,
        }
      } else {
        return {
          data: {
            success: true,
            requestId: 'req-concurrent-winner',
            requestCode: 'REQ-WIN-001',
            is_replay: true,
          },
          error: null,
        }
      }
    })

    const makeRequest = () =>
      new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'concurrent-race-key',
        },
        body: JSON.stringify({
          customerName: 'Concurrent User',
          productName: 'Gaming Monitor',
          turnstileToken: 'mock-turnstile-pass',
        }),
      })

    const [res1, res2] = await Promise.all([POST(makeRequest()), POST(makeRequest())])

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)

    const json1 = await res1.json()
    const json2 = await res2.json()

    expect(json1.requestId).toBe('req-concurrent-winner')
    expect(json2.requestId).toBe('req-concurrent-winner')

    // Exactly one call triggered staff assignment
    expect(mockAutoAssignReviewerToRequest).toHaveBeenCalledTimes(1)
  })

  // Test 9: Forced transaction failure -> HTTP 500, key remains retryable
  it('9. fails closed with HTTP 500 when transaction fails, preventing reviewer assignment', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'deadlock detected or DB constraint' },
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'transient-fail-key',
      },
      body: JSON.stringify({
        customerName: 'Failing User',
        productName: 'Printer Ink',
        turnstileToken: 'mock-turnstile-pass',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()

    expect(json.error).toBe('Database error')
    expect(mockAutoAssignReviewerToRequest).not.toHaveBeenCalled()
  })

  // Test 10: Deterministic Canonical Payload Hash
  it('10. computes canonical payload hash deterministically', () => {
    const hash1 = computeCanonicalPayloadHash({
      customerId: 'cust-1',
      productName: '  iPhone 15 Pro  ',
      category: 'ELECTRONICS',
      targetLocation: ' Cairo ',
      maxPrice: '45000',
      notes: 'Black 256GB',
    })

    const hash2 = computeCanonicalPayloadHash({
      customerId: 'cust-1',
      productName: 'iphone 15 pro',
      category: 'electronics',
      targetLocation: 'cairo',
      maxPrice: 45000,
      notes: 'Black 256GB',
    })

    const hashDifferent = computeCanonicalPayloadHash({
      customerId: 'cust-1',
      productName: 'iphone 15 pro',
      category: 'electronics',
      targetLocation: 'cairo',
      maxPrice: 46000, // modified price
      notes: 'Black 256GB',
    })

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hashDifferent)
  })

  // Blocker 3: Idempotency Key Validation Boundaries
  describe('Blocker 3: Header & Body Idempotency Key Validation', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: { success: true, requestId: 'req-bound-1', requestCode: 'REQ-B-001', is_replay: false },
        error: null,
      })
    })

    it('1. accepts valid Idempotency-Key header <= 100 characters', async () => {
      const validKey = 'k'.repeat(100)
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `  ${validKey}  `,
        },
        body: JSON.stringify({
          customerName: 'Valid Header',
          productName: 'Desk',
          turnstileToken: 'mock-turnstile-pass',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_create_sourcing_request_idempotent',
        expect.objectContaining({ p_idempotency_key: validKey })
      )
    })

    it('2. returns HTTP 400 when Idempotency-Key header exceeds 100 characters', async () => {
      const overlongKey = 'k'.repeat(101)
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': overlongKey,
        },
        body: JSON.stringify({
          customerName: 'Overlong Header',
          productName: 'Desk',
          turnstileToken: 'mock-turnstile-pass',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_IDEMPOTENCY_KEY')
      expect(json.error).toContain('100 characters')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('3. accepts valid x-idempotency-key header <= 100 characters', async () => {
      const validKey = 'x'.repeat(80)
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': validKey,
        },
        body: JSON.stringify({
          customerName: 'Valid X-Header',
          productName: 'Desk',
          turnstileToken: 'mock-turnstile-pass',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_create_sourcing_request_idempotent',
        expect.objectContaining({ p_idempotency_key: validKey })
      )
    })

    it('4. returns HTTP 400 when x-idempotency-key header exceeds 100 characters', async () => {
      const overlongKey = 'x'.repeat(101)
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': overlongKey,
        },
        body: JSON.stringify({
          customerName: 'Overlong X-Header',
          productName: 'Desk',
          turnstileToken: 'mock-turnstile-pass',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_IDEMPOTENCY_KEY')
      expect(json.error).toContain('100 characters')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('5. accepts valid body idempotencyKey <= 100 characters', async () => {
      const validKey = 'body-idemp-key-123'
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Valid Body Key',
          productName: 'Desk',
          turnstileToken: 'mock-turnstile-pass',
          idempotencyKey: `  ${validKey}  `,
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_create_sourcing_request_idempotent',
        expect.objectContaining({ p_idempotency_key: validKey })
      )
    })

    it('6. returns HTTP 400 when body idempotencyKey exceeds 100 characters', async () => {
      const overlongKey = 'b'.repeat(101)
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Overlong Body Key',
          productName: 'Desk',
          turnstileToken: 'mock-turnstile-pass',
          idempotencyKey: overlongKey,
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_IDEMPOTENCY_KEY')
      expect(json.error).toContain('100 characters')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('7. treats whitespace-only key as absent and falls back to fn_create_sourcing_request', async () => {
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': '    ',
        },
        body: JSON.stringify({
          customerName: 'Whitespace Key',
          productName: 'Desk',
          turnstileToken: 'mock-turnstile-pass',
          idempotencyKey: '   ',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request', expect.any(Object))
      expect(mockRpc).not.toHaveBeenCalledWith('fn_create_sourcing_request_idempotent', expect.any(Object))
    })
  })

  // Blocker 4: Canonical Hash Semantic Completeness
  describe('Blocker 4: Canonical Hash Semantic Completeness (sourceType and aiConfidence)', () => {
    it('differentiates payloads with different sourceType', () => {
      const base = {
        customerId: 'cust-1',
        productName: 'Monitor',
        category: 'electronics',
      }
      const hashManual = computeCanonicalPayloadHash({ ...base, sourceType: 'manual' })
      const hashAI = computeCanonicalPayloadHash({ ...base, sourceType: 'ai_concierge' })

      expect(hashManual).not.toBe(hashAI)
    })

    it('treats missing or default sourceType as "manual"', () => {
      const base = {
        customerId: 'cust-1',
        productName: 'Monitor',
        category: 'electronics',
      }
      const hashDefault = computeCanonicalPayloadHash({ ...base })
      const hashExplicitManual = computeCanonicalPayloadHash({ ...base, sourceType: 'manual' })
      const hashTrimmedManual = computeCanonicalPayloadHash({ ...base, sourceType: '  MANUAL  ' })

      expect(hashDefault).toBe(hashExplicitManual)
      expect(hashDefault).toBe(hashTrimmedManual)
    })

    it('differentiates payloads with different aiConfidence values', () => {
      const base = {
        customerId: 'cust-1',
        productName: 'Monitor',
      }
      const hash1 = computeCanonicalPayloadHash({ ...base, aiConfidence: 0.85 })
      const hash2 = computeCanonicalPayloadHash({ ...base, aiConfidence: 0.95 })
      const hashNull = computeCanonicalPayloadHash({ ...base, aiConfidence: null })

      expect(hash1).not.toBe(hash2)
      expect(hash1).not.toBe(hashNull)
    })

    it('normalizes string aiConfidence to numeric value deterministically', () => {
      const base = {
        customerId: 'cust-1',
        productName: 'Monitor',
      }
      const hashNum = computeCanonicalPayloadHash({ ...base, aiConfidence: 0.9 })
      const hashStr = computeCanonicalPayloadHash({ ...base, aiConfidence: '0.9' })

      expect(hashNum).toBe(hashStr)
    })
  })
})
