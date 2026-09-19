/**
 * FINDORA — P1-02 Batch 2: Application Wiring Tests
 * Test Suite: tests/unit/vendor/p1_02_batch2_wiring.test.ts
 *
 * Verifies:
 * 1. Removal of all legacy service-role / adminClient vendor and review mutations in submitCustomerMerchantFeedback.
 * 2. Wiring of fn_customer_submit_vendor_feedback via authenticated client RPC.
 * 3. Strict security boundary: merchantName, vendor_id, customer_id, auth_user_id, selected_bid_id are NEVER passed to RPC.
 * 4. Input mapping: requestId -> p_request_id, rating -> p_vendor_rating, platformRating -> p_platform_rating, trimmed/null comment -> p_comment.
 * 5. Authentication check: unauthenticated user redirects to /auth/login.
 * 6. Success flow: revalidatePath and redirect to ?success=feedback_submitted.
 * 7. Error flow: RPC error redirects to ?error=feedback_failed.
 * 8. NEXT_REDIRECT preservation: Next.js redirect exceptions are re-thrown properly.
 * 9. Regression safety: unrelated actions (handleConfirmRequestProposal, handleUploadPaymentReceipt) remain intact.
 */

import fs from 'node:fs'
import path from 'node:path'

// Mock dependencies before importing payment-actions
const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockRevalidatePath = jest.fn()
const mockRedirect = jest.fn((url: string) => {
  const err: any = new Error(`NEXT_REDIRECT: ${url}`)
  err.digest = `NEXT_REDIRECT;replace;${url};307;;`
  throw err
})

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
  getCustomerByAuthId: jest.fn(),
  createAdminClient: jest.fn(() =>
    Promise.resolve({
      from: jest.fn(),
      storage: {
        from: jest.fn(),
      },
    })
  ),
}))

jest.mock('@/lib/dal/payments', () => ({
  getOrCreatePaymentIntentForCustomer: jest.fn(),
  submitPaymentReceipt: jest.fn(),
  getPaymentIntentAdmin: jest.fn(),
  confirmPaymentIntentSystem: jest.fn(),
  logPaymentAuditEventAdmin: jest.fn(),
}))

jest.mock('@/lib/gemini/ocr', () => ({
  verifyInstapayReceiptWithGemini: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}))

jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

import {
  submitCustomerMerchantFeedback,
  handleConfirmRequestProposal,
  handleUploadPaymentReceipt,
} from '@/app/[locale]/(customer)/reports/[id]/payment-actions'

describe('P1-02 Batch 2: Customer Vendor Feedback Application Wiring Tests', () => {
  const actionsFilePath = path.resolve(
    'src/app/[locale]/(customer)/reports/[id]/payment-actions.ts'
  )
  let actionsFileContent = ''
  let feedbackFunctionBody = ''

  beforeAll(() => {
    expect(fs.existsSync(actionsFilePath)).toBe(true)
    actionsFileContent = fs.readFileSync(actionsFilePath, 'utf8')

    // Extract submitCustomerMerchantFeedback function body for targeted static assertions
    const fnStartIndex = actionsFileContent.indexOf(
      'export async function submitCustomerMerchantFeedback'
    )
    expect(fnStartIndex).toBeGreaterThanOrEqual(0)
    feedbackFunctionBody = actionsFileContent.substring(fnStartIndex)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'usr-auth-001' } },
    })
    mockRpc.mockResolvedValue({
      data: { success: true },
      error: null,
    })
  })

  // =========================================================================
  // A. Static Analysis & Legacy Mutation Removal
  // =========================================================================
  describe('A. Static Analysis: Legacy Service-Role Mutation Removal', () => {
    it('does NOT contain adminClient.from("vendors").update inside submitCustomerMerchantFeedback', () => {
      expect(feedbackFunctionBody).not.toMatch(
        /adminClient\s*\.\s*from\(\s*['"]vendors['"]\s*\)\s*\.\s*update/
      )
    })

    it('does NOT contain adminClient.from("vendor_reviews").insert inside submitCustomerMerchantFeedback', () => {
      expect(feedbackFunctionBody).not.toMatch(
        /adminClient\s*\.\s*from\(\s*['"]vendor_reviews['"]\s*\)\s*\.\s*insert/
      )
    })

    it('does NOT contain display_name lookup on vendors inside submitCustomerMerchantFeedback', () => {
      expect(feedbackFunctionBody).not.toMatch(
        /\.from\(\s*['"]vendors['"]\s*\)[\s\S]*?\.eq\(\s*['"]display_name['"]/
      )
    })

    it('does NOT contain getCustomerByAuthId inside submitCustomerMerchantFeedback', () => {
      expect(feedbackFunctionBody).not.toContain('getCustomerByAuthId(')
    })

    it('does NOT instantiate createAdminClient inside submitCustomerMerchantFeedback', () => {
      expect(feedbackFunctionBody).not.toContain('createAdminClient(')
      expect(feedbackFunctionBody).not.toContain('adminClient')
    })
  })

  // =========================================================================
  // B. RPC Usage & Authenticated Client
  // =========================================================================
  describe('B. RPC Usage: Authenticated Client Call', () => {
    it('calls fn_customer_submit_vendor_feedback via authenticated client RPC', () => {
      expect(feedbackFunctionBody).toContain('fn_customer_submit_vendor_feedback')
      expect(feedbackFunctionBody).toMatch(
        /\(supabase\s+as\s+any\)\s*\.\s*rpc\(\s*['"]fn_customer_submit_vendor_feedback['"]/
      )
    })

    it('specifies exactly the 4 expected RPC parameter keys', () => {
      expect(feedbackFunctionBody).toContain('p_request_id:')
      expect(feedbackFunctionBody).toContain('p_vendor_rating:')
      expect(feedbackFunctionBody).toContain('p_platform_rating:')
      expect(feedbackFunctionBody).toContain('p_comment:')
    })
  })

  // =========================================================================
  // C. Security Boundary: No Client-Controlled Vendor / Auth IDs Passed
  // =========================================================================
  describe('C. Security Boundary: No Unauthoritative Parameters', () => {
    it('does NOT pass merchantName or _merchantName into the RPC payload', () => {
      const rpcCallStartIndex = feedbackFunctionBody.indexOf('.rpc(')
      const rpcCallEndIndex = feedbackFunctionBody.indexOf('if (error)')
      const rpcCallChunk = feedbackFunctionBody.substring(rpcCallStartIndex, rpcCallEndIndex)

      expect(rpcCallChunk).not.toMatch(/p_merchant_name/i)
      expect(rpcCallChunk).not.toMatch(/merchantName/i)
      expect(rpcCallChunk).not.toMatch(/_merchantName/i)
    })

    it('does NOT pass vendor_id, customer_id, auth_user_id, or selected_bid_id into RPC', () => {
      expect(feedbackFunctionBody).not.toContain('p_vendor_id')
      expect(feedbackFunctionBody).not.toContain('p_customer_id')
      expect(feedbackFunctionBody).not.toContain('p_auth_user_id')
      expect(feedbackFunctionBody).not.toContain('p_selected_bid_id')
    })
  })

  // =========================================================================
  // D. Functional Input Mapping
  // =========================================================================
  describe('D. Functional Tests: Input Mapping', () => {
    it('maps requestId, rating, platformRating, and trims comment correctly', async () => {
      await expect(
        submitCustomerMerchantFeedback(
          'req-uuid-1111',
          'Merchant Store ABC',
          5,
          4,
          '  Great seller, very responsive!   ',
          'en'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /en/reports/req-uuid-1111?success=feedback_submitted')

      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_customer_submit_vendor_feedback',
        {
          p_request_id: 'req-uuid-1111',
          p_vendor_rating: 5,
          p_platform_rating: 4,
          p_comment: 'Great seller, very responsive!',
        }
      )

      // Verify no extra parameters were passed
      const calledPayload = mockRpc.mock.calls[0][1]
      expect(Object.keys(calledPayload).sort()).toEqual([
        'p_comment',
        'p_platform_rating',
        'p_request_id',
        'p_vendor_rating',
      ])
    })

    it('converts empty string comment to null', async () => {
      await expect(
        submitCustomerMerchantFeedback(
          'req-uuid-2222',
          'Merchant Store XYZ',
          4,
          5,
          '',
          'ar'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /ar/reports/req-uuid-2222?success=feedback_submitted')

      expect(mockRpc).toHaveBeenCalledWith(
        'fn_customer_submit_vendor_feedback',
        expect.objectContaining({
          p_request_id: 'req-uuid-2222',
          p_comment: null,
        })
      )
    })

    it('converts whitespace-only comment to null', async () => {
      await expect(
        submitCustomerMerchantFeedback(
          'req-uuid-3333',
          'Merchant Store 123',
          3,
          3,
          '     \n\t   ',
          'en'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /en/reports/req-uuid-3333?success=feedback_submitted')

      expect(mockRpc).toHaveBeenCalledWith(
        'fn_customer_submit_vendor_feedback',
        expect.objectContaining({
          p_request_id: 'req-uuid-3333',
          p_comment: null,
        })
      )
    })

    it('converts 0 / falsy platformRating to null', async () => {
      await expect(
        submitCustomerMerchantFeedback(
          'req-uuid-4444',
          'Merchant Store 456',
          5,
          0,
          'Nice service',
          'en'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /en/reports/req-uuid-4444?success=feedback_submitted')

      expect(mockRpc).toHaveBeenCalledWith(
        'fn_customer_submit_vendor_feedback',
        expect.objectContaining({
          p_request_id: 'req-uuid-4444',
          p_platform_rating: null,
        })
      )
    })
  })

  // =========================================================================
  // E. Authentication
  // =========================================================================
  describe('E. Functional Tests: Authentication Guard', () => {
    it('redirects unauthenticated user to /auth/login without calling RPC', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      })

      await expect(
        submitCustomerMerchantFeedback(
          'req-uuid-auth-check',
          'Any Seller',
          5,
          5,
          'Test',
          'en'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /en/auth/login')

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // F. Success Flow
  // =========================================================================
  describe('F. Functional Tests: Success Flow', () => {
    it('revalidates path and redirects with ?success=feedback_submitted on RPC success', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          request_id: 'req-success-123',
          vendor_id: 'vnd-123',
          review_id: 'rev-123',
          trust_score: 92,
          total_successful_deals: 5,
        },
        error: null,
      })

      await expect(
        submitCustomerMerchantFeedback(
          'req-success-123',
          'Winning Merchant',
          5,
          5,
          'Excellent transaction',
          'en'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /en/reports/req-success-123?success=feedback_submitted')

      expect(mockRevalidatePath).toHaveBeenCalledWith('/en/reports/req-success-123')
      expect(mockRedirect).toHaveBeenCalledWith(
        '/en/reports/req-success-123?success=feedback_submitted'
      )
    })
  })

  // =========================================================================
  // G. RPC Failure Handling
  // =========================================================================
  describe('G. Functional Tests: RPC Failure Flow', () => {
    it('redirects with ?error=feedback_failed when RPC returns an error object', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'FORBIDDEN: You do not own request req-fail-123.', code: '42501' },
      })

      await expect(
        submitCustomerMerchantFeedback(
          'req-fail-123',
          'Some Vendor',
          5,
          5,
          'Should fail',
          'en'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /en/reports/req-fail-123?error=feedback_failed')

      expect(mockRevalidatePath).not.toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith(
        '/en/reports/req-fail-123?error=feedback_failed'
      )
    })

    it('redirects with ?error=feedback_failed when RPC returns duplicate review error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'CONFLICT: Feedback has already been submitted', code: '23505' },
      })

      await expect(
        submitCustomerMerchantFeedback(
          'req-dup-123',
          'Some Vendor',
          5,
          5,
          'Duplicate',
          'ar'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /ar/reports/req-dup-123?error=feedback_failed')

      expect(mockRedirect).toHaveBeenCalledWith(
        '/ar/reports/req-dup-123?error=feedback_failed'
      )
    })
  })

  // =========================================================================
  // H. NEXT_REDIRECT Preservation
  // =========================================================================
  describe('H. Functional Tests: NEXT_REDIRECT Preservation', () => {
    it('rethrows NEXT_REDIRECT exception without converting it to an unhandled error or swallow', async () => {
      const redirectErr: any = new Error('NEXT_REDIRECT: /en/reports/req-next?success=feedback_submitted')
      redirectErr.digest = 'NEXT_REDIRECT;replace;/en/reports/req-next?success=feedback_submitted;307;;'

      mockRedirect.mockImplementationOnce(() => {
        throw redirectErr
      })

      try {
        await submitCustomerMerchantFeedback(
          'req-next',
          'Seller',
          5,
          5,
          'Great',
          'en'
        )
        fail('Should have thrown NEXT_REDIRECT')
      } catch (err: any) {
        expect(err.digest).toBe(redirectErr.digest)
      }
    })

    it('catches unexpected thrown exception (e.g. network failure) and redirects to ?error=feedback_failed', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network connection timeout'))

      await expect(
        submitCustomerMerchantFeedback(
          'req-net-err',
          'Seller',
          5,
          5,
          'Comment',
          'en'
        )
      ).rejects.toThrow('NEXT_REDIRECT: /en/reports/req-net-err?error=feedback_failed')

      expect(mockRedirect).toHaveBeenCalledWith(
        '/en/reports/req-net-err?error=feedback_failed'
      )
    })
  })

  // =========================================================================
  // I. Regression Protection
  // =========================================================================
  describe('I. Regression Protection: Unrelated Actions Untouched', () => {
    it('exports handleConfirmRequestProposal intact as a function', () => {
      expect(typeof handleConfirmRequestProposal).toBe('function')
    })

    it('exports handleUploadPaymentReceipt intact as a function', () => {
      expect(typeof handleUploadPaymentReceipt).toBe('function')
    })

    it('preserves createAdminClient and getCustomerByAuthId imports in payment-actions.ts for other actions', () => {
      expect(actionsFileContent).toContain("import { getCustomerByAuthId, createAdminClient } from '@/lib/dal/customers'")
      expect(actionsFileContent).toContain('await getCustomerByAuthId(user.id)')
      expect(actionsFileContent).toContain('await createAdminClient()')
    })
  })
})
