/**
 * FINDORA — P1-01 Batch 2: Application Wiring & Customer Mutation RPCs
 * Test Suite: tests/unit/requests/p1_01_batch2_wiring.test.ts
 *
 * Verifies:
 * 1. Removal of all direct `adminClient.from('requests').update(...)` calls in actions.ts.
 * 2. Wiring of fn_customer_update_request_details via authenticated client RPC.
 * 3. Wiring of fn_customer_toggle_auto_reorder via authenticated client RPC.
 * 4. Preservation of auth context (auth.uid()) and absence of caller-supplied customer_id/auth_user_id.
 * 5. Functional parameter sanitization, error propagation, and side-effects (revalidatePath, dalSendMessage).
 */

import fs from 'node:fs'
import path from 'node:path'

// Mock dependencies before importing actions
const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockAdminFrom = jest.fn()
const mockSendMessage = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      rpc: mockRpc,
    })
  ),
}))

jest.mock('@/lib/dal/customers', () => ({
  createAdminClient: jest.fn(() =>
    Promise.resolve({
      from: mockAdminFrom,
    })
  ),
}))

jest.mock('@/lib/dal/messages', () => ({
  sendMessage: (...args: any[]) => mockSendMessage(...args),
}))

jest.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}))

import { updateRequestDetails, toggleAutoReorderAction } from '@/app/[locale]/(customer)/requests/[id]/actions'

describe('P1-01 Batch 2: Application Wiring Tests', () => {
  const actionsFile = path.resolve('src/app/[locale]/(customer)/requests/[id]/actions.ts')
  let actionsContent = ''

  beforeAll(() => {
    expect(fs.existsSync(actionsFile)).toBe(true)
    actionsContent = fs.readFileSync(actionsFile, 'utf8')
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. Static Code Analysis & Contract Safety', () => {
    it('does NOT contain any direct adminClient.from("requests").update in actions.ts', () => {
      // Must not have .update( anywhere on requests table
      expect(actionsContent).not.toMatch(/\.from\(\s*['"]requests['"]\s*\)\s*\.update\s*\(/)
    })

    it('invokes fn_customer_update_request_details via authenticated client rpc', () => {
      expect(actionsContent).toContain("'fn_customer_update_request_details'")
      // supabase.rpc, not adminClient.rpc
      expect(actionsContent).toMatch(/\(supabase\s+as\s+any\)\.rpc\(\s*['"]fn_customer_update_request_details['"]/)
    })

    it('invokes fn_customer_toggle_auto_reorder via authenticated client rpc', () => {
      expect(actionsContent).toContain("'fn_customer_toggle_auto_reorder'")
      // supabase.rpc, not adminClient.rpc
      expect(actionsContent).toMatch(/\(supabase\s+as\s+any\)\.rpc\(\s*['"]fn_customer_toggle_auto_reorder['"]/)
    })

    it('does not pass caller-supplied customer_id or auth_user_id to the RPCs', () => {
      const updateDetailsFn = actionsContent.substring(
        actionsContent.indexOf('export async function updateRequestDetails'),
        actionsContent.indexOf('export async function requestReviewerAction')
      )
      expect(updateDetailsFn).not.toContain('p_customer_id')
      expect(updateDetailsFn).not.toContain('p_auth_user_id')

      const toggleReorderFn = actionsContent.substring(
        actionsContent.indexOf('export async function toggleAutoReorderAction'),
        actionsContent.indexOf('export async function submitPriceGuaranteeAction')
      )
      expect(toggleReorderFn).not.toContain('p_customer_id')
      expect(toggleReorderFn).not.toContain('p_auth_user_id')
    })
  })

  describe('2. Functional updateRequestDetails tests', () => {
    const mockUser = { id: 'auth-user-123' }
    const mockCustomer = { id: 'cust-uuid-456' }
    const mockRequest = { id: 'req-uuid-789', customer_id: 'cust-uuid-456', current_status: 'in_progress', title: 'Old Title' }

    function setupOwnershipMocks(user = mockUser, customer: any = mockCustomer, request: any = mockRequest) {
      mockGetUser.mockResolvedValue({ data: { user } })
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: customer }),
              }),
            }),
          }
        }
        if (table === 'staff_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: request, error: null }),
              }),
            }),
          }
        }
        return {}
      })
    }

    it('successfully calls fn_customer_update_request_details with sanitized parameters', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      mockSendMessage.mockResolvedValue({ id: 'msg-1' })

      const res = await updateRequestDetails('req-uuid-789', 'Updated description', '  New Title  ')

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_update_request_details', {
        p_request_id: 'req-uuid-789',
        p_title: 'New Title',
        p_raw_description: 'Updated description',
      })
      expect(mockSendMessage).toHaveBeenCalledWith(
        'req-uuid-789',
        expect.stringContaining('[SYSTEM] Client updated details:')
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/[locale]/requests/req-uuid-789', 'page')
    })

    it('passes null for p_title when newTitle is undefined or empty', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      mockSendMessage.mockResolvedValue({ id: 'msg-1' })

      const res = await updateRequestDetails('req-uuid-789', 'Updated description without title')

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_update_request_details', {
        p_request_id: 'req-uuid-789',
        p_title: null,
        p_raw_description: 'Updated description without title',
      })
    })

    it('returns error when RPC returns an error', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: null, error: { message: 'FORBIDDEN: You do not own request req-uuid-789.' } })

      const res = await updateRequestDetails('req-uuid-789', 'Some description')

      expect(res.success).toBe(false)
      expect(res.error).toBe('FORBIDDEN: You do not own request req-uuid-789.')
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('returns error when user is unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const res = await updateRequestDetails('req-uuid-789', 'Some description')

      expect(res.success).toBe(false)
      expect(res.error).toBe('Unauthorized')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('returns error when user does not own request', async () => {
      setupOwnershipMocks(mockUser, mockCustomer, { ...mockRequest, customer_id: 'different-customer' })

      const res = await updateRequestDetails('req-uuid-789', 'Some description')

      expect(res.success).toBe(false)
      expect(res.error).toBe('Forbidden: You do not own this request')
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('3. Functional toggleAutoReorderAction tests', () => {
    const mockUser = { id: 'auth-user-123' }
    const mockCustomer = { id: 'cust-uuid-456' }
    const mockRequest = { id: 'req-uuid-789', customer_id: 'cust-uuid-456', current_status: 'in_progress', title: 'Test Request' }

    function setupOwnershipMocks(user = mockUser, customer: any = mockCustomer, request: any = mockRequest) {
      mockGetUser.mockResolvedValue({ data: { user } })
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: customer }),
              }),
            }),
          }
        }
        if (table === 'staff_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: request, error: null }),
              }),
            }),
          }
        }
        return {}
      })
    }

    it('successfully calls fn_customer_toggle_auto_reorder with correct parameters', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })

      const res = await toggleAutoReorderAction('req-uuid-789', true, 6)

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_toggle_auto_reorder', {
        p_request_id: 'req-uuid-789',
        p_is_recurring: true,
        p_reorder_interval_months: 6,
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/[locale]/requests/req-uuid-789', 'page')
    })

    it('returns error when RPC returns an error', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: null, error: { message: 'FORBIDDEN: Cannot modify request in terminal or inactive state.' } })

      const res = await toggleAutoReorderAction('req-uuid-789', false, 3)

      expect(res.success).toBe(false)
      expect(res.error).toBe('FORBIDDEN: Cannot modify request in terminal or inactive state.')
    })

    it('returns error when request not found', async () => {
      setupOwnershipMocks(mockUser, mockCustomer, null)

      const res = await toggleAutoReorderAction('nonexistent-req', true, 3)

      expect(res.success).toBe(false)
      expect(res.error).toBe('Request not found')
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('4. Semantic Verification: raw_description and title update semantics', () => {
    const mockUser = { id: 'auth-user-123' }
    const mockCustomer = { id: 'cust-uuid-456' }
    const mockRequest = { id: 'req-uuid-789', customer_id: 'cust-uuid-456', current_status: 'in_progress', title: 'Original Title' }

    function setupOwnershipMocks() {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockCustomer }),
              }),
            }),
          }
        }
        if (table === 'staff_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockRequest, error: null }),
              }),
            }),
          }
        }
        return {}
      })
    }

    it('1. Title-only update passes p_raw_description as null to trigger DB preservation without writing NULL', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      mockSendMessage.mockResolvedValue({ id: 'msg-1' })

      const res = await updateRequestDetails('req-uuid-789', undefined as any, 'New Title Only')

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_update_request_details', {
        p_request_id: 'req-uuid-789',
        p_title: 'New Title Only',
        p_raw_description: null,
      })
    })

    it('2. Description-only update works and leaves title as null to preserve existing title', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      mockSendMessage.mockResolvedValue({ id: 'msg-1' })

      const res = await updateRequestDetails('req-uuid-789', 'Only new description provided')

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_update_request_details', {
        p_request_id: 'req-uuid-789',
        p_title: null,
        p_raw_description: 'Only new description provided',
      })
    })

    it('3. Both fields update correctly when both are supplied', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      mockSendMessage.mockResolvedValue({ id: 'msg-1' })

      const res = await updateRequestDetails('req-uuid-789', 'Brand new description', 'Brand New Title')

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_update_request_details', {
        p_request_id: 'req-uuid-789',
        p_title: 'Brand New Title',
        p_raw_description: 'Brand new description',
      })
    })

    it('4. Empty-string behavior matches previous implementation (empty description is passed, empty/whitespace title becomes null)', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      mockSendMessage.mockResolvedValue({ id: 'msg-1' })

      // Empty string description passed -> non-null empty string passed to RPC (matches previous updates = { raw_description: "" })
      // Whitespace-only title passed -> null passed to RPC (matches previous if (newTitle) which ignored empty titles)
      const res = await updateRequestDetails('req-uuid-789', '', '   ')

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_update_request_details', {
        p_request_id: 'req-uuid-789',
        p_title: null,
        p_raw_description: '',
      })
    })

    it('5. raw_description remains protected from NULL on null or undefined input', async () => {
      setupOwnershipMocks()
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      mockSendMessage.mockResolvedValue({ id: 'msg-1' })

      // Explicitly null description -> mapped to null to invoke SQL ELSE raw_description
      const res = await updateRequestDetails('req-uuid-789', null as any, 'Valid Title')

      expect(res).toEqual({ success: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_customer_update_request_details', {
        p_request_id: 'req-uuid-789',
        p_title: 'Valid Title',
        p_raw_description: null,
      })
    })
  })
})
