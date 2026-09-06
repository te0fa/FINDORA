/**
 * P0-04 — Atomic Customer Request Creation Unit Tests
 *
 * Verifies:
 * 1. Atomic success: valid customer + valid request data -> RPC called with matching request ID and data -> returns HTTP 200.
 * 2. Atomic failure: RPC returns error -> API returns HTTP 500 -> no success:true, zero downstream tasks created.
 * 3. Invalid customer: customerId is null -> API returns HTTP 400 -> RPC is NOT called -> zero requests created.
 * 4. B2B field preservation: is_business, business_metadata, rfq_document are passed to RPC.
 * 5. Metadata preservation: metadata, source_type, ai_confidence are passed to RPC.
 * 6. Downstream task safety: expandDemandAndCreateTasks is NOT called if RPC fails.
 * 7. Request ID parity: customer_requests.id === requests.id === returned requestId.
 * 8. DAL createSourcingRequest compatibility with extended parameters.
 */

import { POST } from '@/app/api/customers/requests/create/route'
import { createSourcingRequest } from '@/lib/dal/requests'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRpc = jest.fn()
const mockGetUser = jest.fn()
const mockAdminFrom = jest.fn()
const mockServerFrom = jest.fn()
const mockUpsertGuestCustomerByPhone = jest.fn()
const mockExpandDemandAndCreateTasks = jest.fn()
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

jest.mock('@/lib/intelligence/demand-expansion', () => ({
  expandDemandAndCreateTasks: (...args: any[]) => mockExpandDemandAndCreateTasks(...args),
}))

jest.mock('@/lib/dal/staff', () => ({
  autoAssignReviewerToRequest: (...args: any[]) => mockAutoAssignReviewerToRequest(...args),
}))

jest.mock('@/lib/gemini/client', () => ({
  generateRfqDocument: jest.fn().mockResolvedValue('Mock RFQ Document Content'),
}))

jest.mock('@/lib/dal/ai-control', () => ({
  getAIFeatureStatus: jest.fn().mockResolvedValue({ enabled: true }),
  logAIFeatureUsage: jest.fn().mockResolvedValue(undefined),
}))

describe('P0-04: Atomic Customer Request Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default: admin lookup returns system admin ID
    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'staff_members') {
        return {
          select: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'admin-uuid-1' } }),
            }),
          }),
        }
      }
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'existing-customer-uuid' } }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })
  })

  // 1. Atomic Success
  it('creates request atomically through fn_create_sourcing_request when valid customer and data provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-123' } }, error: null })
    mockRpc.mockResolvedValue({ data: { success: true, request: { id: 'test-req-id' } }, error: null })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Ahmed Ali',
        productName: 'iPhone 15 Pro',
        category: 'electronics',
        targetLocation: 'Cairo',
        maxPrice: 45000,
        notes: '256GB Black',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(typeof json.requestId).toBe('string')
    expect(typeof json.requestCode).toBe('string')
    expect(json.requestCode).toMatch(/^REQ-/)

    // RPC called with matching request_id and correct arguments
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request', expect.objectContaining({
      p_request_id: json.requestId,
      p_customer_id: 'existing-customer-uuid',
      p_customer_name: 'Ahmed Ali',
      p_product_name: 'iPhone 15 Pro',
      p_category: 'electronics',
      p_target_location: 'Cairo',
      p_max_price: 45000,
      p_request_code: json.requestCode,
      p_is_business: false,
    }))

    // Gated downstream operations executed on success
    expect(mockAutoAssignReviewerToRequest).toHaveBeenCalledWith(json.requestId, null)
    // Under P0-03-A, expandDemandAndCreateTasks is decoupled from intake to prevent task amplification
    expect(mockExpandDemandAndCreateTasks).not.toHaveBeenCalled()
  })

  // 2. Atomic Failure
  it('fails closed with HTTP 500 when RPC returns an error, and does NOT execute downstream tasks', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-123' } }, error: null })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB constraint violation' } })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Ahmed Ali',
        productName: 'iPhone 15 Pro',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()

    expect(json.error).toBe('Database error')
    expect(json.success).toBeUndefined()

    // Downstream tasks MUST NOT be called on failure
    expect(mockAutoAssignReviewerToRequest).not.toHaveBeenCalled()
    expect(mockExpandDemandAndCreateTasks).not.toHaveBeenCalled()
  })

  // 3. Invalid Customer (Guest without Phone)
  it('rejects guest request with HTTP 400 when no phone is provided, and does NOT call RPC', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null }) // Guest user

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Anonymous Guest',
        productName: 'Samsung TV',
        // customerPhone missing!
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()

    expect(json.error).toContain('Valid phone number or customer account required')
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockExpandDemandAndCreateTasks).not.toHaveBeenCalled()
  })

  // 4. Invalid Customer (Guest upsert failure)
  it('rejects guest request with HTTP 400 when upsertGuestCustomerByPhone fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockUpsertGuestCustomerByPhone.mockRejectedValue(new Error('Invalid phone format'))

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Guest With Bad Phone',
        customerPhone: 'invalid-phone',
        productName: 'Samsung TV',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()

    expect(json.error).toContain('Valid phone number or customer account required')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // 5. Valid Guest Resolution
  it('resolves guest customer via upsertGuestCustomerByPhone and passes customer_id to RPC', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockUpsertGuestCustomerByPhone.mockResolvedValue({
      id: 'guest-cust-uuid-456',
      auth_user_id: null,
    })
    mockRpc.mockResolvedValue({ data: { success: true, request: { id: 'req-1' } }, error: null })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'New Guest',
        customerPhone: '01012345678',
        productName: 'Laptop',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request', expect.objectContaining({
      p_customer_id: 'guest-cust-uuid-456',
      p_customer_name: 'New Guest',
      p_customer_phone: '01012345678',
    }))
  })

  // 6. B2B Data Preservation
  it('preserves B2B fields (is_business, business_metadata, rfq_document) in RPC payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-b2b' } }, error: null })
    mockRpc.mockResolvedValue({ data: { success: true, request: { id: 'b2b-req-1' } }, error: null })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Corporate Procurement',
        productName: 'Office Desks',
        category: 'projects_supplies',
        isBusiness: true,
        companyName: 'Acme Corp',
        crNumber: 'CR-123456',
        taxNumber: 'TAX-987654',
        quantity: '50',
        notes: 'Bulk order with delivery',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request', expect.objectContaining({
      p_is_business: true,
      p_request_kind: 'project_supply',
      p_business_metadata: {
        company_name: 'Acme Corp',
        cr_number: 'CR-123456',
        tax_number: 'TAX-987654',
        quantity: '50',
      },
      p_rfq_document: expect.stringContaining('Request for Quote (RFQ)'),
    }))
  })

  // 7. Metadata Preservation
  it('preserves intake metadata, source_type, and ai_confidence', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-ai' } }, error: null })
    mockRpc.mockResolvedValue({ data: { success: true, request: { id: 'ai-req-1' } }, error: null })

    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'AI Shopper',
        productName: 'AirPods Pro 2',
        source_type: 'product_link',
        ai_confidence: 0.95,
        metadata: {
          brand: 'Apple',
          condition: 'new',
          sourceUrl: 'https://amazon.eg/dp/B001',
        },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request', expect.objectContaining({
      p_source_type: 'product_link',
      p_ai_confidence: 0.95,
      p_metadata: {
        brand: 'Apple',
        condition: 'new',
        sourceUrl: 'https://amazon.eg/dp/B001',
      },
    }))
  })

  // 8. Missing Required Input Fields
  it('rejects request with HTTP 400 when customerName or productName is missing', async () => {
    const req = new Request('https://findora.io/api/customers/requests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: 'iPhone',
        // customerName missing
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // 9. DAL createSourcingRequest backward compatibility
  it('createSourcingRequest in DAL continues working with backward-compatible defaults', async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  full_name: 'Existing DAL Customer',
                  phone_number_raw: '01011112222',
                  phone_number_normalized: '+201011112222',
                },
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
          id: 'dal-req-1',
          request_code: 'REQ-DAL-1',
          title: 'DAL Title',
        },
      },
      error: null,
    })

    const result = await createSourcingRequest({
      customerId: 'dal-cust-uuid',
      title: 'DAL Title',
      rawDescription: 'DAL Desc',
      status: 'open',
      channel: 'web',
      preferences: {},
    })

    expect(result.id).toBe('dal-req-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_create_sourcing_request', expect.objectContaining({
      p_customer_id: 'dal-cust-uuid',
      p_title: 'DAL Title',
      p_is_business: false,
      p_source_type: 'manual',
    }))
  })
})
