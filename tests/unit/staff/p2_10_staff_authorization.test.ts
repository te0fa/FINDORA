/**
 * FINDORA — P2-10: Server-Side Staff Capability Enforcement Test Suite
 *
 * Verifies that all 4 vulnerable staff route handlers enforce canonical
 * server-side capabilities before executing privileged business logic:
 *
 * 1. POST /api/staff/ai-agents/toggle       → perms.canManageAI
 * 2. POST /api/staff/marketplace/deal        → perms.canManageDeals
 * 3. POST /api/staff/marketplace/vendor      → perms.canManageVendors
 * 4. POST /api/staff/insights/approve        → perms.canManageDeals
 *
 * Each route is verified against 6 authorization scenarios (24 assertions total):
 * 1. Unauthenticated (no session)             → 401
 * 2. Authenticated non-staff (no staff record) → 403
 * 3. Inactive staff (is_active = false)        → 403
 * 4. Active staff without required capability  → 403
 * 5. Authorized delegated capability           → Allowed (business logic reached)
 * 6. Administrator / Owner capability          → Allowed (business logic reached)
 */

import { NextRequest } from 'next/server'

// ── Supabase & Staff Mocks ───────────────────────────────────────────────────

const mockGetUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

const mockGetStaffMemberByAuthUserId = jest.fn()
const mockGetStaffUiPermissions = jest.fn()
jest.mock('@/lib/dal/staff', () => ({
  getStaffMemberByAuthUserId: (...args: any[]) => mockGetStaffMemberByAuthUserId(...args),
  getStaffUiPermissions: (...args: any[]) => mockGetStaffUiPermissions(...args),
}))

// ── Middleware / Logger Mocks ────────────────────────────────────────────────

jest.mock('@/lib/middleware/rate-limiter', () => ({
  withRateLimit: (_: any, handler: any) => handler,
  STANDARD_RATE_LIMIT: {},
  AUTH_RATE_LIMIT: {},
}))

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

// ── DAL Mocks ────────────────────────────────────────────────────────────────

const mockUpdateAIAgentConfigAdmin = jest.fn()
jest.mock('@/lib/dal/ai-control', () => ({
  updateAIAgentConfigAdmin: (...args: any[]) => mockUpdateAIAgentConfigAdmin(...args),
}))

const mockCreateProduct = jest.fn()
const mockCreateDeal = jest.fn()
const mockCreateVendor = jest.fn()
jest.mock('@/lib/dal/marketplace', () => ({
  createProduct: (...args: any[]) => mockCreateProduct(...args),
  createDeal: (...args: any[]) => mockCreateDeal(...args),
  createVendor: (...args: any[]) => mockCreateVendor(...args),
}))

const mockAddCustomerPoints = jest.fn()
jest.mock('@/lib/dal/points', () => ({
  addCustomerPoints: (...args: any[]) => mockAddCustomerPoints(...args),
}))

const mockInsightsUpdate = jest.fn()
const mockInsightsSelect = jest.fn()
const mockCustomersSelect = jest.fn()

const mockAdminClient = {
  from: jest.fn((table: string) => {
    if (table === 'market_insights') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockInsightsSelect,
          })),
        })),
        update: jest.fn(() => ({
          eq: mockInsightsUpdate,
        })),
      }
    }
    if (table === 'customers') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockCustomersSelect,
          })),
        })),
      }
    }
    return {
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn() })) })),
      update: jest.fn(() => ({ eq: jest.fn() })),
    }
  }),
}

jest.mock('@/lib/dal/customers', () => ({
  createAdminClient: jest.fn(async () => mockAdminClient),
}))

// ── Route Handlers ───────────────────────────────────────────────────────────

import { POST as aiAgentsTogglePost } from '@/app/api/staff/ai-agents/toggle/route'
import { POST as marketplaceDealPost } from '@/app/api/staff/marketplace/deal/route'
import { POST as marketplaceVendorPost } from '@/app/api/staff/marketplace/vendor/route'
import { POST as insightsApprovePost } from '@/app/api/staff/insights/approve/route'

// ── Helpers & Constants ──────────────────────────────────────────────────────

const AUTH_USER_ID = 'test-auth-user-id'

function createBlankPermissions(): Record<string, boolean> {
  return {
    isAdmin: false,
    canReviewIntake: false,
    canResearch: false,
    canSourceOffline: false,
    canReport: false,
    canAccessDashboard: false,
    canAccessQueue: false,
    canTriggerResearch: false,
    canEditShortlist: false,
    canReleaseToCustomer: false,
    canManageDeals: false,
    canManageNews: false,
    canManagePricing: false,
    canManageContent: false,
    canManageMarketing: false,
    canManageArchive: false,
    canManagePayments: false,
    canViewIntelligence: false,
    canManageCommunications: false,
    canManageFinancials: false,
    canManageAI: false,
    canManageUsers: false,
    canHardDelete: false,
    isIntakeReviewer: false,
    isSourcingResearcher: false,
    isReportBuilder: false,
    isQualityReviewer: false,
    isPaymentReviewer: false,
    isSupportAgent: false,
    isClientSuccessAgent: false,
    canManageVendors: false,
  }
}

describe('FINDORA — P2-10: Server-Side Staff Capability Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default: Authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: AUTH_USER_ID, email: 'staff@findora.test' } },
      error: null,
    })

    // Default: Active staff member record
    mockGetStaffMemberByAuthUserId.mockResolvedValue({
      id: 'staff-uuid-1',
      auth_user_id: AUTH_USER_ID,
      full_name: 'Test Staff',
      staff_role: 'support',
      is_active: true,
      extra_roles: [],
    })

    // Default: No elevated capabilities (fail closed)
    mockGetStaffUiPermissions.mockReturnValue(createBlankPermissions())

    // Default: DAL operations succeed
    mockUpdateAIAgentConfigAdmin.mockResolvedValue(undefined)
    mockCreateProduct.mockResolvedValue({ id: 'prod-uuid-1' })
    mockCreateDeal.mockResolvedValue({ id: 'deal-uuid-1' })
    mockCreateVendor.mockResolvedValue({ id: 'vendor-uuid-1' })
    mockAddCustomerPoints.mockResolvedValue(true)

    mockInsightsSelect.mockResolvedValue({
      data: { id: 'insight-1', contributor: { auth_user_id: 'contrib-auth-1' } },
      error: null,
    })
    mockInsightsUpdate.mockResolvedValue({ error: null })
    mockCustomersSelect.mockResolvedValue({
      data: { id: 'customer-1' },
      error: null,
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. POST /api/staff/ai-agents/toggle (perms.canManageAI)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. POST /api/staff/ai-agents/toggle — Capability: canManageAI', () => {
    const createRequest = () =>
      new Request('http://localhost:3000/api/staff/ai-agents/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_code: 'intake_reviewer', enabled: false }),
      })

    it('1.1: rejects unauthenticated requests with HTTP 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const res = await aiAgentsTogglePost(createRequest())
      expect(res.status).toBe(401)
      expect(mockUpdateAIAgentConfigAdmin).not.toHaveBeenCalled()
    })

    it('1.2: rejects authenticated non-staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce(null)

      const res = await aiAgentsTogglePost(createRequest())
      expect(res.status).toBe(403)
      expect(mockUpdateAIAgentConfigAdmin).not.toHaveBeenCalled()
    })

    it('1.3: rejects inactive staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce({
        id: 'staff-uuid-1',
        auth_user_id: AUTH_USER_ID,
        is_active: false,
      })

      const res = await aiAgentsTogglePost(createRequest())
      expect(res.status).toBe(403)
      expect(mockUpdateAIAgentConfigAdmin).not.toHaveBeenCalled()
    })

    it('1.4: rejects active staff lacking canManageAI with HTTP 403', async () => {
      const perms = createBlankPermissions()
      perms.canManageDeals = true
      perms.canManageVendors = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await aiAgentsTogglePost(createRequest())
      expect(res.status).toBe(403)
      expect(mockUpdateAIAgentConfigAdmin).not.toHaveBeenCalled()
    })

    it('1.5: allows delegated staff with canManageAI=true to reach business logic', async () => {
      const perms = createBlankPermissions()
      perms.canManageAI = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await aiAgentsTogglePost(createRequest())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockUpdateAIAgentConfigAdmin).toHaveBeenCalledWith({
        agent_code: 'intake_reviewer',
        enabled: false,
      })
    })

    it('1.6: allows admin/owner with canManageAI=true and isAdmin=true to reach business logic', async () => {
      const perms = createBlankPermissions()
      perms.isAdmin = true
      perms.canManageAI = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await aiAgentsTogglePost(createRequest())
      expect(res.status).toBe(200)
      expect(mockUpdateAIAgentConfigAdmin).toHaveBeenCalledWith({
        agent_code: 'intake_reviewer',
        enabled: false,
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. POST /api/staff/marketplace/deal (perms.canManageDeals)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. POST /api/staff/marketplace/deal — Capability: canManageDeals', () => {
    const createRequest = () => {
      const formData = new FormData()
      formData.append('vendor_id', 'vendor-uuid-1')
      formData.append('product_name_ar', 'منتج تجريبي')
      formData.append('product_name_en', 'Test Product')
      formData.append('base_price_egp', '150')

      return new Request('http://localhost:3000/api/staff/marketplace/deal', {
        method: 'POST',
        body: formData,
      })
    }

    it('2.1: rejects unauthenticated requests with HTTP 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const res = await marketplaceDealPost(createRequest())
      expect(res.status).toBe(401)
      expect(mockCreateProduct).not.toHaveBeenCalled()
      expect(mockCreateDeal).not.toHaveBeenCalled()
    })

    it('2.2: rejects authenticated non-staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce(null)

      const res = await marketplaceDealPost(createRequest())
      expect(res.status).toBe(403)
      expect(mockCreateProduct).not.toHaveBeenCalled()
      expect(mockCreateDeal).not.toHaveBeenCalled()
    })

    it('2.3: rejects inactive staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce({
        id: 'staff-uuid-1',
        auth_user_id: AUTH_USER_ID,
        is_active: false,
      })

      const res = await marketplaceDealPost(createRequest())
      expect(res.status).toBe(403)
      expect(mockCreateProduct).not.toHaveBeenCalled()
      expect(mockCreateDeal).not.toHaveBeenCalled()
    })

    it('2.4: rejects active staff lacking canManageDeals with HTTP 403', async () => {
      const perms = createBlankPermissions()
      perms.canManageAI = true
      perms.canManageVendors = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await marketplaceDealPost(createRequest())
      expect(res.status).toBe(403)
      expect(mockCreateProduct).not.toHaveBeenCalled()
      expect(mockCreateDeal).not.toHaveBeenCalled()
    })

    it('2.5: allows delegated staff with canManageDeals=true to reach business logic and redirect', async () => {
      const perms = createBlankPermissions()
      perms.canManageDeals = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await marketplaceDealPost(createRequest())
      expect(res.status).toBe(303)
      expect(mockCreateProduct).toHaveBeenCalledTimes(1)
      expect(mockCreateDeal).toHaveBeenCalledTimes(1)
    })

    it('2.6: allows admin/owner with canManageDeals=true and isAdmin=true to reach business logic and redirect', async () => {
      const perms = createBlankPermissions()
      perms.isAdmin = true
      perms.canManageDeals = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await marketplaceDealPost(createRequest())
      expect(res.status).toBe(303)
      expect(mockCreateProduct).toHaveBeenCalledTimes(1)
      expect(mockCreateDeal).toHaveBeenCalledTimes(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. POST /api/staff/marketplace/vendor (perms.canManageVendors)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. POST /api/staff/marketplace/vendor — Capability: canManageVendors', () => {
    const createRequest = () => {
      const formData = new FormData()
      formData.append('business_name_en', 'Vendor Corp')
      formData.append('business_name_ar', 'شركة المورد')
      formData.append('contact_phone', '+201000000000')

      return new Request('http://localhost:3000/api/staff/marketplace/vendor', {
        method: 'POST',
        body: formData,
      })
    }

    it('3.1: rejects unauthenticated requests with HTTP 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const res = await marketplaceVendorPost(createRequest())
      expect(res.status).toBe(401)
      expect(mockCreateVendor).not.toHaveBeenCalled()
    })

    it('3.2: rejects authenticated non-staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce(null)

      const res = await marketplaceVendorPost(createRequest())
      expect(res.status).toBe(403)
      expect(mockCreateVendor).not.toHaveBeenCalled()
    })

    it('3.3: rejects inactive staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce({
        id: 'staff-uuid-1',
        auth_user_id: AUTH_USER_ID,
        is_active: false,
      })

      const res = await marketplaceVendorPost(createRequest())
      expect(res.status).toBe(403)
      expect(mockCreateVendor).not.toHaveBeenCalled()
    })

    it('3.4: rejects active staff lacking canManageVendors with HTTP 403', async () => {
      const perms = createBlankPermissions()
      perms.canManageAI = true
      perms.canManageDeals = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await marketplaceVendorPost(createRequest())
      expect(res.status).toBe(403)
      expect(mockCreateVendor).not.toHaveBeenCalled()
    })

    it('3.5: allows delegated staff with canManageVendors=true to reach business logic and redirect', async () => {
      const perms = createBlankPermissions()
      perms.canManageVendors = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await marketplaceVendorPost(createRequest())
      expect(res.status).toBe(303)
      expect(mockCreateVendor).toHaveBeenCalledWith({
        business_name_en: 'Vendor Corp',
        business_name_ar: 'شركة المورد',
        contact_phone: '+201000000000',
        status: 'active',
      })
    })

    it('3.6: allows admin/owner with canManageVendors=true and isAdmin=true to reach business logic and redirect', async () => {
      const perms = createBlankPermissions()
      perms.isAdmin = true
      perms.canManageVendors = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await marketplaceVendorPost(createRequest())
      expect(res.status).toBe(303)
      expect(mockCreateVendor).toHaveBeenCalledWith({
        business_name_en: 'Vendor Corp',
        business_name_ar: 'شركة المورد',
        contact_phone: '+201000000000',
        status: 'active',
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. POST /api/staff/insights/approve (perms.canManageDeals)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. POST /api/staff/insights/approve — Capability: canManageDeals', () => {
    const createRequest = () =>
      new NextRequest('http://localhost:3000/api/staff/insights/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId: 'insight-1', status: 'approved_as_offer' }),
      })

    it('4.1: rejects unauthenticated requests with HTTP 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const res = await insightsApprovePost(createRequest())
      expect(res.status).toBe(401)
      expect(mockInsightsUpdate).not.toHaveBeenCalled()
      expect(mockAddCustomerPoints).not.toHaveBeenCalled()
    })

    it('4.2: rejects authenticated non-staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce(null)

      const res = await insightsApprovePost(createRequest())
      expect(res.status).toBe(403)
      expect(mockInsightsUpdate).not.toHaveBeenCalled()
      expect(mockAddCustomerPoints).not.toHaveBeenCalled()
    })

    it('4.3: rejects inactive staff with HTTP 403', async () => {
      mockGetStaffMemberByAuthUserId.mockResolvedValueOnce({
        id: 'staff-uuid-1',
        auth_user_id: AUTH_USER_ID,
        is_active: false,
      })

      const res = await insightsApprovePost(createRequest())
      expect(res.status).toBe(403)
      expect(mockInsightsUpdate).not.toHaveBeenCalled()
      expect(mockAddCustomerPoints).not.toHaveBeenCalled()
    })

    it('4.4: rejects active staff lacking canManageDeals with HTTP 403', async () => {
      const perms = createBlankPermissions()
      perms.canReviewIntake = true // Ensure intake reviewer without deal perms is rejected
      perms.canManageAI = true
      perms.canManageVendors = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await insightsApprovePost(createRequest())
      expect(res.status).toBe(403)
      expect(mockInsightsUpdate).not.toHaveBeenCalled()
      expect(mockAddCustomerPoints).not.toHaveBeenCalled()
    })

    it('4.5: allows delegated staff with canManageDeals=true to reach business logic and disburse VIP points', async () => {
      const perms = createBlankPermissions()
      perms.canManageDeals = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await insightsApprovePost(createRequest())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockInsightsUpdate).toHaveBeenCalledWith('id', 'insight-1')
      expect(mockAddCustomerPoints).toHaveBeenCalledWith(
        'customer-1',
        25,
        'friend_referred',
        'insight-1'
      )
    })

    it('4.6: allows admin/owner with canManageDeals=true and isAdmin=true to reach business logic and disburse VIP points', async () => {
      const perms = createBlankPermissions()
      perms.isAdmin = true
      perms.canManageDeals = true
      mockGetStaffUiPermissions.mockReturnValueOnce(perms)

      const res = await insightsApprovePost(createRequest())
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockInsightsUpdate).toHaveBeenCalledWith('id', 'insight-1')
      expect(mockAddCustomerPoints).toHaveBeenCalledWith(
        'customer-1',
        25,
        'friend_referred',
        'insight-1'
      )
    })
  })
})
