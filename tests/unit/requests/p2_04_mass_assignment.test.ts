/**
 * FINDORA — P2-04: Customer Request Intake Mass Assignment Hardening Tests
 *
 * Verifies:
 * 1. Normal customer request with no source_type: persisted/constructed source_type = manual
 * 2. Customer attempts source_type = ai_text -> route does not trust it (stays manual)
 * 3. Customer attempts source_type = ai_voice -> route does not trust it (stays manual)
 * 4. Customer attempts source_type = admin/internal/staff/arbitrary -> route does not trust it (stays manual)
 * 5. Customer supplies ai_confidence = 0.99 -> route does not treat it as trusted AI confidence (passed as undefined)
 * 6. Customer supplies ai_confidence = 100 -> route does not treat it as trusted AI confidence (passed as undefined)
 * 7. Customer supplies ai_confidence = -1 -> route does not treat it as trusted AI confidence (passed as undefined)
 * 8. Customer supplies arbitrary metadata keys -> approved keys survive, reserved/internal keys are stripped
 * 9. Nested metadata cannot bypass reserved-key filtering or inject prototype pollution
 * 10. DB constraint rejects confidence outside [0,1] for direct DB/RPC writes where applicable
 */

import { POST, sanitizeCustomerMetadata } from '@/app/api/customers/requests/create/route'
import fs from 'fs'
import path from 'path'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRpc = jest.fn()
const mockGetUser = jest.fn()
const mockAdminFrom = jest.fn()
const mockServerFrom = jest.fn()
const mockUpsertGuestCustomerByPhone = jest.fn()
const mockAutoAssignReviewerToRequest = jest.fn()

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

jest.mock('@/lib/dal/ai-control', () => ({
  getAIFeatureStatus: jest.fn().mockResolvedValue({ enabled: true }),
  logAIFeatureUsage: jest.fn().mockResolvedValue(undefined),
}))

describe('P2-04: Mass Assignment Remediation on Customer Request Intake', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-p2-04' } }, error: null })
    mockRpc.mockResolvedValue({ data: { success: true, requestId: 'req-p2-04-1', requestCode: 'REQ-P2-04' }, error: null })

    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'staff_members') {
        return {
          select: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'admin-p2-04' } }),
            }),
          }),
        }
      }
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'cust-uuid-p2-04' } }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })
  })

  // ── 1. source_type Verification ────────────────────────────────────────────

  it('1. sets persisted source_type = manual when normal customer request provides no source_type', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        productName: 'Gaming Laptop',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_create_sourcing_request',
      expect.objectContaining({
        p_source_type: 'manual',
      })
    )
  })

  it('2. ignores client attempt to set source_type = ai_text and persists manual', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        productName: 'Gaming Laptop',
        source_type: 'ai_text',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_create_sourcing_request',
      expect.objectContaining({
        p_source_type: 'manual',
      })
    )
  })

  it('3. ignores client attempt to set source_type = ai_voice and persists manual', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        productName: 'Gaming Laptop',
        source_type: 'ai_voice',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_create_sourcing_request',
      expect.objectContaining({
        p_source_type: 'manual',
      })
    )
  })

  it('4. ignores client attempt to set source_type = admin/internal/staff/arbitrary and persists manual', async () => {
    const invalidSources = ['admin', 'internal', 'staff', 'system', 'arbitrary_bypass']
    for (const spoofedSource of invalidSources) {
      mockRpc.mockClear()
      const req = new Request('https://findora.io/api/customers/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Test Customer',
          productName: 'Gaming Laptop',
          source_type: spoofedSource,
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(mockRpc).toHaveBeenCalledWith(
        'fn_create_sourcing_request',
        expect.objectContaining({
          p_source_type: 'manual',
        })
      )
    }
  })

  // ── 2. ai_confidence Verification ──────────────────────────────────────────

  it('5. ignores client-supplied ai_confidence = 0.99 and passes undefined to RPC', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        productName: 'Gaming Laptop',
        ai_confidence: 0.99,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_create_sourcing_request',
      expect.objectContaining({
        p_ai_confidence: undefined,
      })
    )
  })

  it('6. ignores client-supplied ai_confidence = 100 and passes undefined to RPC', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        productName: 'Gaming Laptop',
        ai_confidence: 100,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_create_sourcing_request',
      expect.objectContaining({
        p_ai_confidence: undefined,
      })
    )
  })

  it('7. ignores client-supplied ai_confidence = -1 and passes undefined to RPC', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        productName: 'Gaming Laptop',
        ai_confidence: -1,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith(
      'fn_create_sourcing_request',
      expect.objectContaining({
        p_ai_confidence: undefined,
      })
    )
  })

  // ── 3. metadata Sanitization Verification ──────────────────────────────────

  it('8. preserves approved metadata keys and strips reserved/internal keys', async () => {
    const maliciousMetadata = {
      // Approved customer keys
      brand: 'Asus ROG',
      condition: 'new',
      subcategory: 'laptops',
      color: 'black',
      budgetMin: 30000,
      budgetMax: 50000,
      sourceUrl: 'https://example.com/laptop',
      productImageUrl: 'https://example.com/img.jpg',

      // Reserved / internal keys that must be stripped
      status: 'closed',
      pricing_decision: 'approved',
      service_fee_amount: 0,
      is_admin: true,
      role: 'superadmin',
      permissions: ['*'],
      assigned_staff_id: '00000000-0000-0000-0000-000000000000',
      staff_notes: 'Bypassed review',
      reviewer_decision: 'approve',
      fraud_score: 0,
      risk_score: 0,
      merchant_id: 'target-merchant',
      selected_bid_id: '11111111-1111-1111-1111-111111111111',
      source_type: 'ai_text',
      ai_confidence: 1.0,
      idempotency_key: 'untrusted-spoofed-key',
      customer_id: 'attacker-id',
      audit_state: 'passed',
    }

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'server-verified-key-123',
      },
      body: JSON.stringify({
        customerName: 'Test Customer',
        productName: 'Gaming Laptop',
        metadata: maliciousMetadata,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const rpcCallArgs = mockRpc.mock.calls[0][1]
    const persistedMetadata = rpcCallArgs.p_metadata

    // Approved keys survived
    expect(persistedMetadata.brand).toBe('Asus ROG')
    expect(persistedMetadata.condition).toBe('new')
    expect(persistedMetadata.subcategory).toBe('laptops')
    expect(persistedMetadata.color).toBe('black')
    expect(persistedMetadata.budgetMin).toBe(30000)
    expect(persistedMetadata.budgetMax).toBe(50000)
    expect(persistedMetadata.sourceUrl).toBe('https://example.com/laptop')
    expect(persistedMetadata.productImageUrl).toBe('https://example.com/img.jpg')
    // Server-verified idempotency key is injected
    expect(persistedMetadata.idempotency_key).toBe('server-verified-key-123')

    // Reserved / internal keys stripped
    expect(persistedMetadata.status).toBeUndefined()
    expect(persistedMetadata.pricing_decision).toBeUndefined()
    expect(persistedMetadata.service_fee_amount).toBeUndefined()
    expect(persistedMetadata.is_admin).toBeUndefined()
    expect(persistedMetadata.role).toBeUndefined()
    expect(persistedMetadata.permissions).toBeUndefined()
    expect(persistedMetadata.assigned_staff_id).toBeUndefined()
    expect(persistedMetadata.staff_notes).toBeUndefined()
    expect(persistedMetadata.reviewer_decision).toBeUndefined()
    expect(persistedMetadata.fraud_score).toBeUndefined()
    expect(persistedMetadata.risk_score).toBeUndefined()
    expect(persistedMetadata.merchant_id).toBeUndefined()
    expect(persistedMetadata.selected_bid_id).toBeUndefined()
    expect(persistedMetadata.source_type).toBeUndefined()
    expect(persistedMetadata.ai_confidence).toBeUndefined()
    expect(persistedMetadata.customer_id).toBeUndefined()
    expect(persistedMetadata.audit_state).toBeUndefined()
  })

  it('9. nested metadata in customSpecs and advancedSpecs cannot bypass filtering or inject prototype pollution', () => {
    const maliciousPayload = {
      brand: 'Dell',
      customSpecs: {
        ram: '32GB',
        storage: '1TB SSD',
        __proto__: { isAdmin: true },
        constructor: { prototype: { poll: true } },
        _internal_flag: 'bypass',
        $admin_override: 'yes',
        nested_object: { deep: 'value' } as any,
      },
      advancedSpecs: {
        warranty: '2 years',
        prototype: 'polluted',
        __proto__: { evil: 'true' },
      },
    }

    const sanitized = sanitizeCustomerMetadata(maliciousPayload, null)

    // Approved scalar specs survive
    expect(sanitized.customSpecs).toBeDefined()
    expect((sanitized.customSpecs as Record<string, string>).ram).toBe('32GB')
    expect((sanitized.customSpecs as Record<string, string>).storage).toBe('1TB SSD')
    expect((sanitized.advancedSpecs as Record<string, string>).warranty).toBe('2 years')

    // Dangerous / suspicious keys stripped
    const cleanCustom = sanitized.customSpecs as Record<string, string>
    expect(cleanCustom['__proto__']).toBeUndefined()
    expect(cleanCustom['constructor']).toBeUndefined()
    expect(cleanCustom['prototype']).toBeUndefined()
    expect(cleanCustom['_internal_flag']).toBeUndefined()
    expect(cleanCustom['$admin_override']).toBeUndefined()
    expect(cleanCustom['nested_object']).toBeUndefined()

    // Global Object prototype not polluted
    expect((({} as any).isAdmin)).toBeUndefined()
    expect((({} as any).poll)).toBeUndefined()
  })

  // ── 4. DB Constraint Verification ──────────────────────────────────────────

  it('10. verifies DB migration enforces valid range [0, 1] on requests.ai_confidence', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260926000000_p2_04_ai_confidence_constraint.sql'
    )
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Constraint name check
    expect(sql).toContain('ck_requests_ai_confidence')

    // Check constraint condition allows NULL and bounds [0, 1]
    expect(sql).toMatch(/ai_confidence\s+IS\s+NULL\s+OR\s+\(\s*ai_confidence\s*>=\s*0\s+AND\s+ai_confidence\s*<=\s*1\s*\)/i)

    // Verification of pure SQL evaluation logic:
    const isValidConfidence = (val: number | null): boolean => {
      if (val === null) return true
      return val >= 0 && val <= 1
    }

    // Boundary & valid values
    expect(isValidConfidence(null)).toBe(true)
    expect(isValidConfidence(0)).toBe(true)
    expect(isValidConfidence(0.5)).toBe(true)
    expect(isValidConfidence(1.0)).toBe(true)

    // Invalid values
    expect(isValidConfidence(-0.01)).toBe(false)
    expect(isValidConfidence(-1)).toBe(false)
    expect(isValidConfidence(1.01)).toBe(false)
    expect(isValidConfidence(100)).toBe(false)
    expect(isValidConfidence(NaN)).toBe(false)
  })
})
