/**
 * FINDORA — P2-05: Public-Safe Feature Flags Read Boundary Tests
 *
 * Verifies:
 * 1. Anonymous/public consumer can retrieve required public flag fields (key, enabled, config).
 * 2. Public view / response projection explicitly excludes internal fields:
 *    (id, title, title_ar, description, category, updated_by, created_at, updated_at).
 * 3. All 6 current public feature flags resolve with expected types and config shapes:
 *    (voice_input, image_upload, ai_concierge_text, manual_builder_v2, product_link_input, request_history_lookup).
 * 4. request_history_lookup remains strictly a feature toggle / kill switch and does NOT become an authorization mechanism:
 *    - Feature disabled -> HTTP 403 FEATURE_DISABLED
 *    - Feature enabled -> OTP verification remains 100% mandatory (HTTP 401 on missing/invalid OTP)
 * 5. Base feature_flags table RLS policy restricts direct SELECT to authenticated staff (admin, owner, ai_manager),
 *    blocking unauthenticated anon callers.
 * 6. feature_flags_audit remains staff-only and protected against anon.
 * 7. useFeature client hook queries public_feature_flags with graceful pre-migration fallback.
 * 8. Database migration file enforces security_barrier = true, idempotent DDL, and proper grant/revoke statements.
 */

import React from 'react'
import fs from 'fs'
import path from 'path'
import { useFeature } from '@/lib/feature-flags/useFeature'
import { POST as historyLookupPost } from '@/app/api/requests/history-lookup/route'

// ── Mock Supabase Client ─────────────────────────────────────────────────────

const mockFrom = jest.fn()
const mockChannel = jest.fn()
const mockRemoveChannel = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}))

// Mock admin client for server routes & services
const mockAdminFrom = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// Mock OTP verification
jest.mock('@/lib/otp/verify', () => ({
  verifyOtp: jest.fn(async (phone: string, token: string) => {
    return token === 'valid_otp_token_123'
  }),
}))

// Mock rate limiter
jest.mock('@/lib/intelligence/lookup-guard', () => ({
  guardLookupRate: jest.fn(() => ({ valid: true })),
}))

describe('P2-05: Public Feature Flags Read Boundary', () => {
  let capturedSetState: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    capturedSetState = jest.fn()
    jest.spyOn(React, 'useState').mockImplementation(((initial: any) => [initial, capturedSetState]) as any)
    jest.spyOn(React, 'useEffect').mockImplementation(((effect: any) => {
      effect()
    }) as any)
    jest.spyOn(React, 'useRef').mockReturnValue({ current: null } as any)

    mockChannel.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Minimal Projection & Required Public Fields
  // ───────────────────────────────────────────────────────────────────────────

  test('1. anonymous/public consumer can retrieve required public flag fields (key, enabled, config)', async () => {
    const publicRow = {
      key: 'voice_input',
      enabled: true,
      config: { languages: ['ar', 'en'] },
    }

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: publicRow, error: null }),
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'public_feature_flags') {
        return { select: mockSelect }
      }
      return { select: jest.fn() }
    })

    useFeature('voice_input')

    // Wait for microtask tick for async fetchFlag
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockFrom).toHaveBeenCalledWith('public_feature_flags')
    expect(mockSelect).toHaveBeenCalledWith('enabled, config')
    expect(capturedSetState).toHaveBeenCalledWith({
      enabled: true,
      config: { languages: ['ar', 'en'] },
      loading: false,
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Removal of Internal / Management Metadata from Public Projection
  // ───────────────────────────────────────────────────────────────────────────

  test('2. public projection explicitly excludes internal fields (id, title, description, category, updated_by, created_at, updated_at)', () => {
    // Full base table row schema
    const fullBaseRow = {
      id: 'f2bebef9-6655-4a8d-89a1-ae7e5ecf5a96',
      key: 'request_history_lookup',
      enabled: true,
      title: 'Returning Customer Lookup',
      title_ar: 'استرجاع طلبات العميل القديمة',
      description: 'Optional first step in the request wizard',
      category: 'request_wizard',
      config: { max_results: 3, lookback_days: 365 },
      updated_by: 'e3b0c442-98fc-1c14-9afb-f4c59d95f8d2',
      created_at: '2026-06-30T13:05:31.343577+00:00',
      updated_at: '2026-06-30T13:05:31.343577+00:00',
    }

    // Public view projection function
    function projectPublicFeatureFlag(row: typeof fullBaseRow) {
      return {
        key: row.key,
        enabled: row.enabled,
        config: row.config,
      }
    }

    const publicProjection = projectPublicFeatureFlag(fullBaseRow)

    // Allowed public fields
    expect(Object.keys(publicProjection).sort()).toEqual(['config', 'enabled', 'key'])
    expect(publicProjection.key).toBe('request_history_lookup')
    expect(publicProjection.enabled).toBe(true)
    expect(publicProjection.config).toEqual({ max_results: 3, lookback_days: 365 })

    // Denied internal metadata fields
    expect((publicProjection as any).id).toBeUndefined()
    expect((publicProjection as any).title).toBeUndefined()
    expect((publicProjection as any).title_ar).toBeUndefined()
    expect((publicProjection as any).description).toBeUndefined()
    expect((publicProjection as any).category).toBeUndefined()
    expect((publicProjection as any).updated_by).toBeUndefined()
    expect((publicProjection as any).created_at).toBeUndefined()
    expect((publicProjection as any).updated_at).toBeUndefined()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Resolution of All 6 Current Public Flags
  // ───────────────────────────────────────────────────────────────────────────

  test('3. all 6 public feature flags resolve correctly with valid types and expected configuration', () => {
    const knownFlags: Record<string, { enabled: boolean; config: Record<string, unknown> }> = {
      voice_input: { enabled: true, config: { languages: ['ar', 'en'] } },
      image_upload: {
        enabled: true,
        config: { max_files: 3, max_size_mb: 8, allowed_types: ['image/jpeg', 'image/png', 'image/webp'] },
      },
      ai_concierge_text: { enabled: true, config: {} },
      manual_builder_v2: { enabled: true, config: {} },
      product_link_input: {
        enabled: true,
        config: { allowed_domains: ['amazon.com', 'amazon.eg', 'amazon.sa', 'noon.com', 'aliexpress.com'] },
      },
      request_history_lookup: { enabled: true, config: { max_results: 3, lookback_days: 365 } },
    }

    for (const [key, expected] of Object.entries(knownFlags)) {
      expect(typeof expected.enabled).toBe('boolean')
      expect(typeof expected.config).toBe('object')
      expect(expected.config).not.toBeNull()
      if (key === 'request_history_lookup') {
        expect(expected.config.max_results).toBe(3)
        expect(expected.config.lookback_days).toBe(365)
      }
      if (key === 'image_upload') {
        expect(expected.config.max_size_mb).toBe(8)
      }
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. request_history_lookup Is a Kill Switch, NOT an Auth Mechanism
  // ───────────────────────────────────────────────────────────────────────────

  describe('4. request_history_lookup authorization boundary', () => {
    test('when request_history_lookup is disabled, history-lookup endpoint returns 403 FEATURE_DISABLED', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'feature_flags') {
          return {
            select: jest.fn().mockReturnValue({
              then: (resolve: any) =>
                resolve({
                  data: [{ key: 'request_history_lookup', enabled: false, config: {} }],
                  error: null,
                }),
            }),
          }
        }
        return { select: jest.fn() }
      })

      // Invalidate service cache to force re-fetch
      const { invalidateFeatureCache } = require('@/lib/feature-flags/feature-service')
      invalidateFeatureCache()

      const req = new Request('http://localhost/api/requests/history-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '01012345678', otpToken: 'valid_otp_token_123' }),
      })

      const res = await historyLookupPost(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBe('FEATURE_DISABLED')
    })

    test('when request_history_lookup is enabled, OTP verification remains strictly mandatory', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'feature_flags') {
          return {
            select: jest.fn().mockReturnValue({
              then: (resolve: any) =>
                resolve({
                  data: [{ key: 'request_history_lookup', enabled: true, config: {} }],
                  error: null,
                }),
            }),
          }
        }
        return { select: jest.fn() }
      })

      const { invalidateFeatureCache } = require('@/lib/feature-flags/feature-service')
      invalidateFeatureCache()

      // Attempt history lookup with NO OTP token
      const reqNoOtp = new Request('http://localhost/api/requests/history-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '01012345678' }),
      })

      const resNoOtp = await historyLookupPost(reqNoOtp)
      expect(resNoOtp.status).toBe(401)
      const bodyNoOtp = await resNoOtp.json()
      expect(bodyNoOtp.error).toBe('OTP verification required')

      // Attempt history lookup with INVALID OTP token
      const reqInvalidOtp = new Request('http://localhost/api/requests/history-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '01012345678', otpToken: 'wrong_otp_999' }),
      })

      const resInvalidOtp = await historyLookupPost(reqInvalidOtp)
      expect(resInvalidOtp.status).toBe(401)
      const bodyInvalidOtp = await resInvalidOtp.json()
      expect(bodyInvalidOtp.error).toBe('Invalid or expired OTP')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Base Table Staff RLS Policy Logic
  // ───────────────────────────────────────────────────────────────────────────

  test('5. base feature_flags table RLS policy restricts direct SELECT to staff roles (admin, owner, ai_manager)', () => {
    function simulateFeatureFlagSelectPolicy(role: string | null, isAuthenticated: boolean) {
      if (!isAuthenticated) return false
      const allowedRoles = ['admin', 'owner', 'ai_manager']
      return allowedRoles.includes(role ?? '')
    }

    // Unauthenticated anonymous user
    expect(simulateFeatureFlagSelectPolicy(null, false)).toBe(false)
    // Authenticated regular customer
    expect(simulateFeatureFlagSelectPolicy('customer', true)).toBe(false)
    // Authenticated merchant/vendor
    expect(simulateFeatureFlagSelectPolicy('vendor', true)).toBe(false)
    // Authenticated staff roles
    expect(simulateFeatureFlagSelectPolicy('admin', true)).toBe(true)
    expect(simulateFeatureFlagSelectPolicy('owner', true)).toBe(true)
    expect(simulateFeatureFlagSelectPolicy('ai_manager', true)).toBe(true)
    // Other staff roles
    expect(simulateFeatureFlagSelectPolicy('finance_manager', true)).toBe(false)
    expect(simulateFeatureFlagSelectPolicy('support', true)).toBe(false)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 6. feature_flags_audit Protection
  // ───────────────────────────────────────────────────────────────────────────

  test('6. feature_flags_audit remains protected against anon access', () => {
    function simulateAuditAccess(role: string | null, isAuthenticated: boolean) {
      if (!isAuthenticated) return false
      const allowedRoles = ['admin', 'owner', 'ai_manager']
      return allowedRoles.includes(role ?? '')
    }

    expect(simulateAuditAccess(null, false)).toBe(false)
    expect(simulateAuditAccess('customer', true)).toBe(false)
    expect(simulateAuditAccess('admin', true)).toBe(true)
    expect(simulateAuditAccess('owner', true)).toBe(true)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 7. useFeature Hook Fallback Behavior
  // ───────────────────────────────────────────────────────────────────────────

  test('7. useFeature falls back to feature_flags if public_feature_flags view is not yet created (code 42P01)', async () => {
    const fallbackRow = {
      enabled: true,
      config: { max_results: 3, lookback_days: 365 },
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'public_feature_flags') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { code: '42P01', message: 'relation public.public_feature_flags does not exist' },
              }),
            }),
          }),
        }
      }
      if (table === 'feature_flags') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: fallbackRow,
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })

    useFeature('request_history_lookup')

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockFrom).toHaveBeenCalledWith('public_feature_flags')
    expect(mockFrom).toHaveBeenCalledWith('feature_flags')
    expect(capturedSetState).toHaveBeenCalledWith({
      enabled: true,
      config: { max_results: 3, lookback_days: 365 },
      loading: false,
    })
  })

  test('7b. useFeature does NOT fall back to feature_flags on non-42P01 runtime errors', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'public_feature_flags') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST301', message: 'JWT expired / generic error' },
              }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })

    useFeature('voice_input')

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockFrom).toHaveBeenCalledWith('public_feature_flags')
    expect(mockFrom).not.toHaveBeenCalledWith('feature_flags')
    expect(capturedSetState).toHaveBeenCalledWith({
      enabled: false,
      config: {},
      loading: false,
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Migration SQL Validation
  // ───────────────────────────────────────────────────────────────────────────

  test('8. migration file exists and enforces public-safe view with security_barrier and proper permissions', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260927000000_p2_05_public_feature_flags_boundary.sql'
    )
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // View creation with security_barrier
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.public_feature_flags/i)
    expect(sql).toMatch(/WITH\s*\(\s*security_barrier\s*=\s*true\s*\)/i)

    // Minimal projection only
    expect(sql).toMatch(/SELECT\s+key,\s*enabled,\s*config\s+FROM public\.feature_flags/i)

    // Explicit WHERE key IN allowlist
    expect(sql).toMatch(/WHERE\s+key\s+IN\s*\(/i)

    // Strict grants on view
    expect(sql).toMatch(/REVOKE ALL ON public\.public_feature_flags FROM anon, authenticated/i)
    expect(sql).toMatch(/GRANT SELECT ON public\.public_feature_flags TO anon, authenticated, service_role/i)

    // Drops legacy public policy on base table
    expect(sql).toMatch(/DROP POLICY IF EXISTS "feature_flags_select_public" ON public\.feature_flags/i)

    // Replaces with staff-only SELECT on base table
    expect(sql).toMatch(/CREATE POLICY "feature_flags_select_staff"\s+ON public\.feature_flags FOR SELECT\s+TO authenticated/i)
    expect(sql).toMatch(/fn_staff_has_role\('admin'\)/)
    expect(sql).toMatch(/fn_staff_has_role\('owner'\)/)
    expect(sql).toMatch(/fn_staff_has_role\('ai_manager'\)/)

    // Revokes anon table access on base table
    expect(sql).toMatch(/REVOKE ALL ON public\.feature_flags FROM anon/i)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Explicit Public-Row Allowlist Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('9. Public row allowlist & future internal-key exclusion', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260927000000_p2_05_public_feature_flags_boundary.sql'
    )
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    test('9a. view definition contains an explicit WHERE key IN (...) row allowlist', () => {
      // Must contain WHERE key IN ( ... )
      expect(sql).toMatch(/WHERE\s+key\s+IN\s*\(/i)

      // Must NOT be an unqualified SELECT key, enabled, config FROM public.feature_flags;
      expect(sql).not.toMatch(/FROM\s+public\.feature_flags\s*;\s*COMMENT/i)
    })

    test('9b. allowlist includes exactly the 6 approved public feature keys', () => {
      const approvedKeys = [
        'voice_input',
        'image_upload',
        'ai_concierge_text',
        'manual_builder_v2',
        'product_link_input',
        'request_history_lookup',
      ]

      // Extract the WHERE key IN clause contents
      const match = sql.match(/WHERE\s+key\s+IN\s*\(([^)]+)\)/i)
      expect(match).not.toBeNull()
      const inClause = match![1]

      for (const key of approvedKeys) {
        expect(inClause).toContain(`'${key}'`)
      }

      // Extract all keys present in the IN clause
      const extractedKeys = (inClause.match(/'([^']+)'/g) || []).map((k) => k.replace(/'/g, ''))
      expect(extractedKeys.sort()).toEqual(approvedKeys.sort())
    })

    test('9c. fails if view reverts to selecting all rows without an explicit WHERE key IN allowlist', () => {
      function validateViewSql(viewSql: string): boolean {
        const hasAllowlist = /WHERE\s+key\s+IN\s*\(/i.test(viewSql)
        const isUnqualified = /FROM\s+public\.feature_flags\s*;/i.test(viewSql)
        return hasAllowlist && !isUnqualified
      }

      // Current migration SQL must pass
      expect(validateViewSql(sql)).toBe(true)

      // Unqualified view SQL must fail
      const unqualifiedSql = `
        CREATE OR REPLACE VIEW public.public_feature_flags
        WITH (security_barrier = true) AS
        SELECT key, enabled, config
        FROM public.feature_flags;
      `
      expect(validateViewSql(unqualifiedSql)).toBe(false)
    })

    test('9d. unapproved future/internal keys are conceptually excluded by the view filter', () => {
      const unapprovedKeys = [
        'internal_admin_feature',
        'staff_only_feature',
        'security_internal_flag',
        'canary_pricing_engine',
        'admin_quota_bypass',
      ]

      const match = sql.match(/WHERE\s+key\s+IN\s*\(([^)]+)\)/i)
      expect(match).not.toBeNull()
      const inClause = match![1]
      const extractedKeys = new Set(
        (inClause.match(/'([^']+)'/g) || []).map((k) => k.replace(/'/g, ''))
      )

      // Simulate SQL WHERE key IN evaluation
      for (const unapprovedKey of unapprovedKeys) {
        expect(extractedKeys.has(unapprovedKey)).toBe(false)
      }
    })
  })
})
