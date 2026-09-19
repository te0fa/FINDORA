/**
 * P1-07 Batch 4: Legacy customer_requests.customer_phone Removal Unit & Static Test Suite
 * (Backward-Compatible Rollout Revision)
 *
 * Verifies:
 * 1. customer_requests schema type has NO customer_phone.
 * 2. Public request creation route passes p_customer_phone: null for backward compatibility.
 * 3. DAL createSourcingRequest passes p_customer_phone: null for backward compatibility.
 * 4. RPC contract still contains p_customer_phone as parameter #4 (29-param base / 31-param idempotent).
 * 5. CRITICAL NEGATIVE TEST: Executable function body does NOT contain customer_phone or p_customer_phone.
 * 6. Migration permanently drops column public.customer_requests.customer_phone.
 * 7. Migration drops idx_customer_requests_phone without CASCADE.
 * 8. Service-role-only execution remains (REVOKE from PUBLIC, anon, authenticated; GRANT to service_role).
 * 9. Idempotency contract remains backward-compatible, forwarding p_customer_phone.
 * 10. Static audit: zero active application readers or writers access customer_requests.customer_phone.
 */

import fs from 'node:fs'
import path from 'node:path'
import { POST } from '@/app/api/customers/requests/create/route'
import { createSourcingRequest } from '@/lib/dal/requests'

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

describe('P1-07 Batch 4: Legacy customer_requests.customer_phone Removal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyTurnstile.mockResolvedValue({ success: true })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockResolveFee.mockResolvedValue({ fee: 299 })
  })

  // ── Test 1: customer_requests schema type has NO customer_phone ──────────────
  it('1. database.types.ts reflects customer_requests without customer_phone', () => {
    const typesContent = fs.readFileSync(
      path.join(process.cwd(), 'src/types/database.types.ts'),
      'utf8'
    )

    const crTableMatch = typesContent.match(/customer_requests:\s*\{([\s\S]*?)\n\s{6}\}/)
    expect(crTableMatch).not.toBeNull()
    expect(crTableMatch![1]).not.toContain('customer_phone')
  })

  // ── Test 2: Public route passes p_customer_phone: null for compatibility ─────
  it('2. Public request creation route passes p_customer_phone: null for backward compatibility', async () => {
    mockUpsertGuestCustomer.mockResolvedValue({
      id: 'cust-uuid-batch4-001',
      customer_code: 'CUST-B4-001',
      full_name: 'Batch 4 Customer',
      auth_user_id: null,
    })

    mockRpc.mockResolvedValue({
      data: {
        success: true,
        request: {
          id: 'req-uuid-b4-001',
          request_code: 'REQ-B4-001',
          title: 'Mechanical Keyboard',
        },
      },
      error: null,
    })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Batch 4 Customer',
        customerPhone: '01012345678',
        productName: 'Mechanical Keyboard',
        category: 'electronics',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledTimes(1)
    const [rpcName, rpcParams] = mockRpc.mock.calls[0]
    expect(rpcName).toBe('fn_create_sourcing_request')
    expect(rpcParams.p_customer_id).toBe('cust-uuid-batch4-001')
    expect(rpcParams.p_customer_name).toBe('Batch 4 Customer')
    expect(rpcParams.p_customer_phone).toBeNull()
  })

  // ── Test 3: DAL passes p_customer_phone: null for compatibility ──────────────
  it('3. DAL createSourcingRequest passes p_customer_phone: null for backward compatibility', async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { full_name: 'DAL Customer' },
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
          id: 'dal-req-b4-002',
          request_code: 'REQ-DAL-B4-002',
          title: 'Ergonomic Chair',
        },
      },
      error: null,
    })

    await createSourcingRequest({
      customerId: 'cust-uuid-b4-002',
      title: 'Ergonomic Chair',
      rawDescription: 'Mesh back lumbar support',
      status: 'open',
      channel: 'web',
      preferences: {},
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)
    const [rpcName, rpcParams] = mockRpc.mock.calls[0]
    expect(rpcName).toBe('fn_create_sourcing_request')
    expect(rpcParams.p_customer_id).toBe('cust-uuid-b4-002')
    expect(rpcParams.p_customer_phone).toBeNull()
  })

  // ── Test 4: RPC contract still contains p_customer_phone as parameter #4 ─────
  it('4. RPC contract preserves p_customer_phone as parameter #4 (29-param base / 31-param idempotent)', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260921000000_p1_07_drop_customer_requests_phone.sql'
    )
    expect(fs.existsSync(migrationPath)).toBe(true)
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Base function declaration: parameter #4 is p_customer_phone text
    const baseMatch = sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.fn_create_sourcing_request\s*\(([\s\S]*?)\)\s*RETURNS\s+jsonb/i)
    expect(baseMatch).not.toBeNull()
    const baseParams = baseMatch![1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'))
    expect(baseParams.length).toBe(29)
    expect(baseParams[0]).toContain('p_request_id')
    expect(baseParams[1]).toContain('p_customer_id')
    expect(baseParams[2]).toContain('p_customer_name')
    expect(baseParams[3]).toMatch(/p_customer_phone\s+text,/)

    // Idempotent function declaration: parameter #4 is p_customer_phone text
    const idemMatch = sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.fn_create_sourcing_request_idempotent\s*\(([\s\S]*?)\)\s*RETURNS\s+jsonb/i)
    expect(idemMatch).not.toBeNull()
    const idemParams = idemMatch![1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'))
    expect(idemParams.length).toBe(31)
    expect(idemParams[3]).toMatch(/p_customer_phone\s+text,/)
  })

  // ── Test 5: CRITICAL NEGATIVE TEST — Executable function body does NOT use phone ──
  it('5. CRITICAL NEGATIVE TEST: Executable function body of fn_create_sourcing_request does NOT contain customer_phone or p_customer_phone', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921000000_p1_07_drop_customer_requests_phone.sql'),
      'utf8'
    )

    // Extract the body of fn_create_sourcing_request (between AS $$ and END; $$)
    const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request(')
    const bodyStart = sql.indexOf('BEGIN', fnStart)
    const bodyEnd = sql.indexOf('$$ LANGUAGE plpgsql', bodyStart)
    const executableBody = sql.substring(bodyStart, bodyEnd)

    // Verify NOT ALLOWED inside body:
    expect(executableBody).not.toContain('customer_phone')
    expect(executableBody).not.toContain('p_customer_phone')
    expect(executableBody).not.toContain('customer_requests.customer_phone')

    // Verify customer_requests insert statement in body does not contain customer_phone
    const crInsertMatch = executableBody.match(/INSERT\s+INTO\s+public\.customer_requests\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\);/i)
    expect(crInsertMatch).not.toBeNull()
    expect(crInsertMatch![1]).not.toContain('customer_phone')
    expect(crInsertMatch![2]).not.toContain('customer_phone')
    expect(crInsertMatch![2]).not.toContain('p_customer_phone')
  })

  // ── Test 6: Migration permanently drops customer_requests.customer_phone ─────
  it('6. Batch 4 migration permanently drops column public.customer_requests.customer_phone', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921000000_p1_07_drop_customer_requests_phone.sql'),
      'utf8'
    )

    expect(sql).toMatch(/ALTER\s+TABLE\s+public\.customer_requests\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+customer_phone;/i)
  })

  // ── Test 7: Migration drops idx_customer_requests_phone without CASCADE ───────
  it('7. Batch 4 migration drops idx_customer_requests_phone without CASCADE', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921000000_p1_07_drop_customer_requests_phone.sql'),
      'utf8'
    )

    expect(sql).toMatch(/DROP\s+INDEX\s+IF\s+EXISTS\s+public\.idx_customer_requests_phone;/i)
    expect(sql).not.toMatch(/CASCADE/i)
  })

  // ── Test 8: Security controls: SECURITY DEFINER, search_path, service_role ────
  it('8. Security controls: SECURITY DEFINER, search_path = public, and service_role execute grants', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921000000_p1_07_drop_customer_requests_phone.sql'),
      'utf8'
    )

    const secDefCount = (sql.match(/SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public/gi) || []).length
    expect(secDefCount).toBe(2)

    // Revoke from PUBLIC, anon, authenticated
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.fn_create_sourcing_request\([\s\S]*?FROM\s+PUBLIC;/i)
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.fn_create_sourcing_request\([\s\S]*?FROM\s+anon;/i)
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.fn_create_sourcing_request\([\s\S]*?FROM\s+authenticated;/i)

    // Grant to service_role
    expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_create_sourcing_request\([\s\S]*?TO\s+service_role;/i)
    expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_create_sourcing_request_idempotent\([\s\S]*?TO\s+service_role;/i)
  })

  // ── Test 9: Idempotency wrapper forwards p_customer_phone correctly ──────────
  it('9. Idempotency wrapper forwards p_customer_phone to base function without shifting', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921000000_p1_07_drop_customer_requests_phone.sql'),
      'utf8'
    )

    // Verify calls to fn_create_sourcing_request inside idempotent function pass p_customer_phone
    const idemStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.fn_create_sourcing_request_idempotent(')
    const idemSql = sql.substring(idemStart)
    const calls = idemSql.match(/v_creation_result\s*:=\s*public\.fn_create_sourcing_request\(([\s\S]*?)\);/g)
    expect(calls).not.toBeNull()
    expect(calls!.length).toBe(2)

    for (const call of calls!) {
      expect(call).toContain('p_customer_phone')
    }
  })

  // ── Test 10: Static audit: zero active application references to customer_requests.customer_phone
  it('10. Static audit: zero active application references to customer_requests.customer_phone', () => {
    const simulatorContent = fs.readFileSync(
      path.join(process.cwd(), 'scripts/e2e_simulator.ts'),
      'utf8'
    )
    const crInsertMatch = simulatorContent.match(/from\('customer_requests'\)\.insert\(\{([\s\S]*?)\}\)/)
    expect(crInsertMatch).not.toBeNull()
    expect(crInsertMatch![1]).not.toContain('customer_phone')
    expect(crInsertMatch![1]).toContain('customer_id')

    const routeContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/customers/requests/create/route.ts'),
      'utf8'
    )
    const dalContent = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/dal/requests.ts'),
      'utf8'
    )
    expect(routeContent).toMatch(/p_customer_phone:\s*null/)
    expect(dalContent).toMatch(/p_customer_phone:\s*null/)
  })
})
