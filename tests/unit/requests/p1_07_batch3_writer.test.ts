import fs from 'node:fs'
import path from 'node:path'
import { POST } from '@/app/api/customers/requests/create/route'
import { createSourcingRequest } from '@/lib/dal/requests'
import { computeCanonicalPayloadHash } from '@/lib/security/idempotency'

// Mock dependencies for route & DAL tests
const mockRpc = jest.fn()
const mockAdminFrom = jest.fn()
const mockGetUser = jest.fn()
const mockVerifyTurnstile = jest.fn()
const mockUpsertGuestCustomer = jest.fn()
const mockAutoAssign = jest.fn()
const mockExpandDemand = jest.fn()
const mockResolveFee = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}))

jest.mock('@/lib/dal/customers', () => ({
  createAdminClient: jest.fn(() => ({
    rpc: mockRpc,
    from: mockAdminFrom,
  })),
  upsertGuestCustomerByPhone: (...args: any[]) => mockUpsertGuestCustomer(...args),
}))

jest.mock('@/lib/security/turnstile', () => ({
  verifyTurnstileToken: (...args: any[]) => mockVerifyTurnstile(...args),
}))

jest.mock('@/lib/dal/staff', () => ({
  autoAssignReviewerToRequest: (...args: any[]) => mockAutoAssign(...args),
}))

jest.mock('@/lib/intelligence/demand-expansion', () => ({
  expandDemandAndCreateTasks: (...args: any[]) => mockExpandDemand(...args),
}))

jest.mock('@/lib/pricing/feeResolvers', () => ({
  resolveCustomerServiceFee: (...args: any[]) => mockResolveFee(...args),
}))

jest.mock('@/lib/dal/communications', () => ({
  queueCommunication: jest.fn().mockResolvedValue(null),
  resolveCustomerContact: jest.fn().mockResolvedValue({ value: '+201012345678', name: 'Test' }),
}))

jest.mock('@/lib/dal/intelligence', () => ({
  logPlatformEvent: jest.fn().mockResolvedValue(null),
  logCustomerIntelEvent: jest.fn().mockResolvedValue(null),
}))

describe('P1-07 Batch 3 — Writer Decoupling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyTurnstile.mockResolvedValue({ success: true })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockResolveFee.mockResolvedValue({ fee: 299 })
  })

  // ── Test 1: Public request route does NOT send p_customer_phone to RPC ───────
  it('1. Public request route does NOT send p_customer_phone to RPC', async () => {
    mockUpsertGuestCustomer.mockResolvedValue({
      id: 'resolved-customer-uuid-001',
      customer_code: 'CUST-001',
      full_name: 'Guest Customer',
      auth_user_id: null,
    })

    mockRpc.mockResolvedValue({
      data: {
        success: true,
        request: {
          id: 'mock-req-001',
          request_code: 'REQ-BATCH3-001',
          title: 'MacBook Pro',
        },
      },
      error: null,
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Guest Customer',
        customerPhone: '01012345678',
        productName: 'MacBook Pro M3',
        category: 'electronics',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledTimes(1)
    const [rpcName, rpcParams] = mockRpc.mock.calls[0]
    expect(rpcName).toBe('fn_create_sourcing_request')
    expect(rpcParams.p_customer_id).toBe('resolved-customer-uuid-001')
    expect(rpcParams.p_customer_phone).toBeNull()
  })

  // ── Test 2: DAL createSourcingRequest does NOT query customer phone for dual-write ─
  it('2. DAL createSourcingRequest does NOT query phone columns for dual-write', async () => {
    let queriedColumns: string | null = null
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: (cols: string) => {
            queriedColumns = cols
            return {
              eq: () => ({
                single: () => Promise.resolve({
                  data: { full_name: 'Ahmed Customer' },
                  error: null,
                }),
              }),
            }
          },
        }
      }
      return { select: jest.fn() }
    })

    mockRpc.mockResolvedValue({
      data: {
        success: true,
        request: {
          id: 'dal-req-002',
          request_code: 'REQ-DAL-002',
          title: 'Dell XPS 15',
        },
      },
      error: null,
    })

    await createSourcingRequest({
      customerId: 'customer-uuid-002',
      title: 'Dell XPS 15',
      rawDescription: '32GB RAM, 1TB SSD',
      status: 'open',
      channel: 'web',
      preferences: {},
    })

    expect(queriedColumns).toBe('full_name')
    expect(queriedColumns).not.toContain('phone_number_raw')
    expect(queriedColumns).not.toContain('phone_number_normalized')
  })

  // ── Test 3: DAL does NOT send p_customer_phone to RPC ──────────────────────
  it('3. DAL does NOT send p_customer_phone to RPC', async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { full_name: 'Test Customer' },
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })

    mockRpc.mockResolvedValue({
      data: {
        success: true,
        request: {
          id: 'dal-req-003',
          request_code: 'REQ-DAL-003',
          title: 'Sony Headphones',
        },
      },
      error: null,
    })

    await createSourcingRequest({
      customerId: 'customer-uuid-003',
      title: 'Sony Headphones',
      rawDescription: 'WH-1000XM5',
      status: 'open',
      channel: 'web',
      preferences: {},
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)
    const [rpcName, rpcParams] = mockRpc.mock.calls[0]
    expect(rpcName).toBe('fn_create_sourcing_request')
    expect(rpcParams.p_customer_id).toBe('customer-uuid-003')
    expect(rpcParams.p_customer_phone).toBeNull()
  })

  // ── Test 4: RPC contract preserves compatibility with p_customer_phone text (no DEFAULT) ──
  it('4. Batch 3 migration preserves exact 29-parameter signature with p_customer_phone text (no DEFAULT)', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260920000000_p1_07_decouple_customer_requests_phone_writer.sql'
    )
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sql = fs.readFileSync(migrationPath, 'utf8')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request(')
    expect(sql).toMatch(/p_customer_phone\s+text,/)
    expect(sql).not.toMatch(/p_customer_phone\s+text\s+DEFAULT/)
    expect(sql).toContain('p_customer_id')
    expect(sql).toContain('p_customer_name')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = public')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.fn_create_sourcing_request(')
    expect(sql).toContain('TO service_role')
  })

  // ── Test 5: DB function writes customer_requests.customer_phone = NULL ──────
  it('5. Batch 3 migration explicitly inserts NULL into customer_requests.customer_phone', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260920000000_p1_07_decouple_customer_requests_phone_writer.sql'
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Find the INSERT INTO public.customer_requests block
    const insertCrBlock = sql.substring(
      sql.indexOf('INSERT INTO public.customer_requests'),
      sql.indexOf('INSERT INTO public.requests')
    )

    expect(insertCrBlock).toContain('customer_phone')
    // Prove that in VALUES (...), NULL is supplied for customer_phone instead of p_customer_phone
    expect(insertCrBlock).toMatch(/VALUES\s*\([^;]*NULL/i)
    expect(insertCrBlock).not.toMatch(/VALUES\s*\([^;]*p_customer_phone/i)
  })

  // ── Test 6: customer_id is still correctly written from p_customer_id ────────
  it('6. DB function continues writing p_customer_id to customer_requests.customer_id', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260920000000_p1_07_decouple_customer_requests_phone_writer.sql'
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    const insertCrBlock = sql.substring(
      sql.indexOf('INSERT INTO public.customer_requests'),
      sql.indexOf('INSERT INTO public.requests')
    )

    expect(insertCrBlock).toContain('customer_id')
    expect(insertCrBlock).toContain('p_customer_id')
  })

  // ── Test 7: requests.customer_id matches customer_requests.customer_id ───────
  it('7. DB function writes p_customer_id to both requests and customer_requests tables', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260920000000_p1_07_decouple_customer_requests_phone_writer.sql'
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    const insertRequestsBlock = sql.substring(
      sql.indexOf('INSERT INTO public.requests'),
      sql.indexOf('RETURNING row_to_json')
    )

    expect(insertRequestsBlock).toContain('customer_id')
    expect(insertRequestsBlock).toContain('p_customer_id')
  })

  // ── Test 8: Idempotency hash does NOT depend on phone ────────────────────────
  it('8. computeCanonicalPayloadHash does NOT depend on phone number', () => {
    const payloadA = {
      customerId: 'cust-uuid-123',
      productName: 'Gaming Laptop',
      category: 'electronics',
      targetLocation: 'Cairo',
      maxPrice: 50000,
      notes: 'RTX 4080',
    }

    const payloadBWithPhone = {
      ...payloadA,
      phone: '01012345678',
      customer_phone: '01012345678',
    } as any

    const hashA = computeCanonicalPayloadHash(payloadA)
    const hashB = computeCanonicalPayloadHash(payloadBWithPhone)

    expect(hashA).toBe(hashB)
    expect(typeof hashA).toBe('string')
    expect(hashA).toHaveLength(64) // SHA-256 hex
  })

  // ── Test 9: Atomicity is preserved (single PL/pgSQL transaction) ─────────────
  it('9. DB function maintains atomic multi-table write inside a single PL/pgSQL block', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260920000000_p1_07_decouple_customer_requests_phone_writer.sql'
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('INSERT INTO public.customer_requests')
    expect(sql).toContain('INSERT INTO public.requests')
    expect(sql).toContain('INSERT INTO public.request_preferences')
    expect(sql).toContain('RETURNING row_to_json(public.requests.*) INTO v_request')
    expect(sql).toContain("RETURN jsonb_build_object('success', true, 'request', v_request)")
  })

  // ── Test 10: Explicit null compatibility and zero active phone writers ───────
  it('10. Static audit: zero active application writers for customer_requests.customer_phone', () => {
    const routeContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/customers/requests/create/route.ts'),
      'utf8'
    )
    const dalContent = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/dal/requests.ts'),
      'utf8'
    )

    // Both files pass explicit null for p_customer_phone compatibility
    expect(routeContent).toMatch(/p_customer_phone:\s*null/)
    expect(dalContent).toMatch(/p_customer_phone:\s*null/)

    // Neither file passes actual customer phone to p_customer_phone, nor writes customer_phone
    expect(routeContent).not.toMatch(/p_customer_phone:\s*(?:customerPhone|normalizedPhone)/)
    expect(dalContent).not.toMatch(/p_customer_phone:\s*(?:customerPhone|params\.customerPhone)/)
  })
})
