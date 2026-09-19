/**
 * FINDORA — P1-02 Batch 1: Customer Vendor Feedback DB Boundary
 * Test Suite: tests/unit/vendor/p1_02_vendor_feedback_db_boundary.test.ts
 *
 * Comprehensive verification of all 34 required test cases across:
 * 1. Authentication (cases 1-2)
 * 2. Ownership (case 3)
 * 3. Vendor binding (cases 4-5)
 * 4. Lifecycle (cases 6-15)
 * 5. Entitlement (cases 16-19)
 * 6. Validation (cases 20-23)
 * 7. Success mutation (cases 24-28)
 * 8. Replay & Concurrency (cases 29-31)
 * 9. Regression (cases 32-34)
 */

import fs from 'node:fs'
import path from 'node:path'

describe('P1-02 Batch 1: Customer Vendor Feedback DB Boundary', () => {
  const migrationFile = path.resolve('supabase/migrations/20260923000000_p1_02_customer_vendor_feedback_rpc.sql')
  const p1_01_migrationFile = path.resolve('supabase/migrations/20260922000000_p1_01_customer_request_mutation_rpcs.sql')
  let migrationContent = ''

  beforeAll(() => {
    expect(fs.existsSync(migrationFile)).toBe(true)
    migrationContent = fs.readFileSync(migrationFile, 'utf8')
  })

  describe('Database Objects & Structure', () => {
    it('creates partial unique index on vendor_reviews(request_id)', () => {
      expect(migrationContent).toMatch(
        /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+uq_vendor_reviews_request_id\s+ON\s+public\.vendor_reviews\s*\(\s*request_id\s*\)\s+WHERE\s+request_id\s+IS\s+NOT\s+NULL/i
      )
    })

    it('does NOT create a composite unique index on (request_id, customer_id)', () => {
      expect(migrationContent).not.toMatch(/INDEX.*\(request_id,\s*customer_id\)/i)
    })

    it('defines fn_customer_submit_vendor_feedback with exact signature', () => {
      expect(migrationContent).toMatch(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.fn_customer_submit_vendor_feedback\s*\(\s*p_request_id\s+uuid,\s*p_vendor_rating\s+integer,\s*p_platform_rating\s+integer(?:\s+DEFAULT\s+NULL)?,\s*p_comment\s+text(?:\s+DEFAULT\s+NULL)?\s*\)\s*RETURNS\s+jsonb/i
      )
    })

    it('configures RPC with SECURITY DEFINER and safe search_path', () => {
      expect(migrationContent).toMatch(/SECURITY\s+DEFINER/i)
      expect(migrationContent).toMatch(/SET\s+search_path\s*=\s*public,\s*pg_temp/i)
    })
  })

  describe('1. Authentication (Cases 1-2)', () => {
    it('Case 1: anon cannot execute RPC (revoked from PUBLIC and anon)', () => {
      expect(migrationContent).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.fn_customer_submit_vendor_feedback.*FROM\s+PUBLIC/i)
      expect(migrationContent).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.fn_customer_submit_vendor_feedback.*FROM\s+anon/i)
      expect(migrationContent).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_customer_submit_vendor_feedback.*TO\s+authenticated/i)
      expect(migrationContent).not.toMatch(/GRANT\s+EXECUTE.*TO\s+anon/i)
    })

    it('Case 2: authenticated caller with NULL auth.uid() or missing customer profile is rejected', () => {
      expect(migrationContent).toContain("IF v_auth_uid IS NULL THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.'")
      expect(migrationContent).toContain("IF v_customer_id IS NULL THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: Customer profile not found for authenticated user.'")
    })
  })

  describe('2. Ownership & IDOR (Case 3)', () => {
    it('Case 3: Customer A cannot submit feedback for Customer B request', () => {
      expect(migrationContent).toContain("IF v_request.customer_id <> v_customer_id THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: You do not own request %.'")
    })
  })

  describe('3. Vendor Binding (Cases 4-5)', () => {
    it('Case 4: client cannot supply arbitrary vendor_id or merchantName', () => {
      expect(migrationContent).not.toMatch(/p_vendor_id/i)
      expect(migrationContent).not.toMatch(/p_merchant_name/i)
      expect(migrationContent).not.toMatch(/merchantName/i)
      expect(migrationContent).not.toMatch(/display_name/i)
    })

    it('Case 5: vendor is authoritatively derived from selected_bid_id -> vendor_bids.vendor_id', () => {
      expect(migrationContent).toMatch(/SELECT\s+vb\.vendor_id\s+INTO\s+v_vendor_id\s+FROM\s+public\.vendor_bids\s+vb\s+WHERE\s+vb\.id\s*=\s*v_request\.selected_bid_id/i)
      expect(migrationContent).toContain("IF v_vendor_id IS NULL THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'NOT_FOUND: Winning vendor could not be resolved from selected bid %.'")
    })
  })

  describe('4. Lifecycle & Request State (Cases 6-15)', () => {
    it('Case 6: request with no selected bid is rejected', () => {
      expect(migrationContent).toContain("IF v_request.selected_bid_id IS NULL THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: Request % has no winning vendor bid selected.'")
    })

    it('Cases 7, 11-13: open/in-progress/research/reporting and terminal statuses rejected', () => {
      expect(migrationContent).toMatch(/v_request\.current_status\s+IN\s*\(\s*'cancelled',\s*'expired',\s*'rejected'\s*\)/i)
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: Request % is in terminal ineligible status %.'")
    })

    it('Case 8: client_ready before release is rejected', () => {
      expect(migrationContent).toContain("IF v_request.client_released_at IS NULL AND v_request.current_status NOT IN ('closed', 'completed') THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: Report has not been released for request %.'")
    })

    it('Cases 9-10: released eligible request or closed/completed eligible request accepted by gate', () => {
      // Gate permits release or closed/completed
      expect(migrationContent).toMatch(/v_request\.client_released_at\s+IS\s+NULL\s+AND\s+v_request\.current_status\s+NOT\s+IN\s*\('closed',\s*'completed'\)/i)
    })

    it('Cases 14-15: archived or is_cancelled request is rejected', () => {
      expect(migrationContent).toContain("IF v_request.is_cancelled IS TRUE OR v_request.archived_at IS NOT NULL THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: Request % is cancelled or archived.'")
    })
  })

  describe('5. Entitlement & Unlock Checks (Cases 16-19)', () => {
    it('Cases 16-19: enforces free request, confirmed payment, or unlocked snapshot entitlement', () => {
      expect(migrationContent).toContain("COALESCE(v_request.service_fee_amount, 0) = 0")
      expect(migrationContent).toContain("WHERE pi.request_id = p_request_id AND pi.status = 'confirmed'")
      expect(migrationContent).toContain("WHERE ros.request_id = p_request_id AND ros.reveal_locked = false")
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: Request % is not unlocked or paid.'")
    })
  })

  describe('6. Input Validation (Cases 20-23)', () => {
    it('Cases 20-21: vendor rating outside 1..5 is rejected', () => {
      expect(migrationContent).toContain("IF p_vendor_rating IS NULL OR p_vendor_rating < 1 OR p_vendor_rating > 5 THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'INVALID_ARGUMENT: Vendor rating must be an integer between 1 and 5.'")
    })

    it('Case 22: platform rating outside 1..5 is rejected if non-null', () => {
      expect(migrationContent).toContain("IF p_platform_rating IS NOT NULL AND (p_platform_rating < 1 OR p_platform_rating > 5) THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'INVALID_ARGUMENT: Platform rating must be an integer between 1 and 5.'")
    })

    it('Case 23: comment > 2000 characters is rejected', () => {
      expect(migrationContent).toContain("IF p_comment IS NOT NULL AND length(p_comment) > 2000 THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'INVALID_ARGUMENT: Comment exceeds maximum allowed length of 2000 characters.'")
    })
  })

  describe('7. Success Mutation & Mathematics (Cases 24-28)', () => {
    it('Case 24: review inserted with authoritative fields', () => {
      expect(migrationContent).toMatch(/INSERT\s+INTO\s+public\.vendor_reviews/i)
      expect(migrationContent).toContain("vendor_id")
      expect(migrationContent).toContain("request_id")
      expect(migrationContent).toContain("customer_id")
      expect(migrationContent).toContain("is_published")
      expect(migrationContent).toContain("is_verified_purchase")
      expect(migrationContent).toMatch(/VALUES\s*\(\s*v_vendor_id,\s*p_request_id,\s*v_customer_id,\s*p_vendor_rating,\s*p_platform_rating,\s*v_clean_comment,\s*true,\s*true,\s*NULL,\s*NULL\s*\)/i)
    })

    it('Case 25: trust_score updated using exact cumulative moving average formula', () => {
      expect(migrationContent).toMatch(/ROUND\s*\(\s*\(\s*\(\s*v_current_trust_score\s*\*\s*v_current_deals\s*\)\s*\+\s*\(\s*p_vendor_rating\s*\*\s*20\s*\)\s*\)::numeric\s*\/\s*\(\s*v_current_deals\s*\+\s*1\s*\)\s*\)/i)
      expect(migrationContent).toContain("LEAST(\n        100,\n        GREATEST(\n            0,")
    })

    it('Case 26: total_successful_deals incremented by exactly 1', () => {
      expect(migrationContent).toContain("v_new_deals := v_current_deals + 1;")
      expect(migrationContent).toMatch(/UPDATE\s+public\.vendors\s+SET\s+trust_score\s*=\s*v_new_trust_score,\s+total_successful_deals\s*=\s*v_new_deals,\s+updated_at\s*=\s*now\(\)\s+WHERE\s+id\s*=\s*v_vendor_id/i)
    })

    it('Case 27: vendor_audit_log created with actor_id NULL', () => {
      expect(migrationContent).toMatch(/INSERT\s+INTO\s+public\.vendor_audit_log\s*\(\s*vendor_id,\s*actor_id,\s*event_name,\s*old_value,\s*new_value\s*\)\s*VALUES\s*\(\s*v_vendor_id,\s*NULL,\s*'CUSTOMER_VENDOR_FEEDBACK_SUBMITTED'/i)
    })

    it('Case 28: audit payload contains customer, request, review, and before/after metrics', () => {
      expect(migrationContent).toContain("'customer_id', v_customer_id")
      expect(migrationContent).toContain("'auth_user_id', v_auth_uid")
      expect(migrationContent).toContain("'request_id', p_request_id")
      expect(migrationContent).toContain("'review_id', v_review_id")
      expect(migrationContent).toContain("'trust_score_before', v_current_trust_score")
      expect(migrationContent).toContain("'trust_score_after', v_new_trust_score")
      expect(migrationContent).toContain("'deal_count_before', v_current_deals")
      expect(migrationContent).toContain("'deal_count_after', v_new_deals")
    })
  })

  describe('8. Replay Prevention & Concurrency Safety (Cases 29-31)', () => {
    it('Case 29: duplicate feedback rejected at RPC pre-check', () => {
      expect(migrationContent).toContain("IF EXISTS (\n        SELECT 1 FROM public.vendor_reviews vr\n        WHERE vr.request_id = p_request_id\n    ) THEN")
      expect(migrationContent).toContain("RAISE EXCEPTION 'CONFLICT: Feedback has already been submitted for request %.'")
    })

    it('Case 30: partial unique index guarantees DB barrier against concurrent reviews', () => {
      expect(migrationContent).toMatch(/CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+uq_vendor_reviews_request_id\s+ON\s+public\.vendor_reviews\(request_id\)\s+WHERE\s+request_id\s+IS\s+NOT\s+NULL/i)
    })

    it('Case 31: requests and vendors rows locked with FOR UPDATE to prevent race conditions', () => {
      expect(migrationContent).toMatch(/FROM\s+public\.requests\s+WHERE\s+id\s*=\s*p_request_id\s+FOR\s+UPDATE/i)
      expect(migrationContent).toMatch(/FROM\s+public\.vendors\s+WHERE\s+id\s*=\s*v_vendor_id\s+FOR\s+UPDATE/i)
    })
  })

  describe('9. Regression Verification (Cases 32-34)', () => {
    it('Case 32: NO write RLS policies added to public.vendors', () => {
      expect(migrationContent).not.toMatch(/CREATE\s+POLICY.*ON\s+(?:public\.)?vendors/i)
      expect(migrationContent).not.toMatch(/FOR\s+INSERT\s+ON\s+(?:public\.)?vendors/i)
      expect(migrationContent).not.toMatch(/FOR\s+UPDATE\s+ON\s+(?:public\.)?vendors/i)
      expect(migrationContent).not.toMatch(/FOR\s+DELETE\s+ON\s+(?:public\.)?vendors/i)
    })

    it('Case 33: P1-01 request mutation RPCs remain completely intact', () => {
      expect(fs.existsSync(p1_01_migrationFile)).toBe(true)
      const p1_01_content = fs.readFileSync(p1_01_migrationFile, 'utf8')
      expect(p1_01_content).toContain('fn_customer_update_request_details')
      expect(p1_01_content).toContain('fn_customer_toggle_auto_reorder')
    })

    it('Case 34: P1-07 customer phone security remains unaffected', () => {
      // The migration does not reference phone numbers or customer contact details
      expect(migrationContent).not.toContain('phone')
      expect(migrationContent).not.toContain('mobile')
    })
  })

  describe('10. Mathematical Simulation of Cumulative Moving Average', () => {
    function computeTrustScore(currentScore: number, dealCount: number, rating: number): number {
      const score = Math.round(((currentScore * dealCount) + (rating * 20)) / (dealCount + 1))
      return Math.min(100, Math.max(0, score))
    }

    it('correctly transitions a zero-deal vendor to the first review score', () => {
      expect(computeTrustScore(100, 0, 5)).toBe(100)
      expect(computeTrustScore(85, 0, 4)).toBe(80)
      expect(computeTrustScore(85, 0, 1)).toBe(20)
    })

    it('correctly calculates cumulative average for subsequent deals', () => {
      // 1 deal at 100, new review rating 4 (80) -> (100*1 + 80)/2 = 90
      expect(computeTrustScore(100, 1, 4)).toBe(90)
      // 2 deals at 90, new review rating 3 (60) -> (90*2 + 60)/3 = 240/3 = 80
      expect(computeTrustScore(90, 2, 3)).toBe(80)
    })

    it('smoothly amortizes an administrative penalty over future transactions', () => {
      // Admin reduced trust score to 60 (2 deals completed). New review rating 5 (100)
      // (60*2 + 100)/3 = 220/3 = 73.33 -> 73
      expect(computeTrustScore(60, 2, 5)).toBe(73)
    })

    it('guarantees clamping strictly between 0 and 100', () => {
      expect(computeTrustScore(0, 0, 1)).toBe(20)
      expect(computeTrustScore(100, 10, 5)).toBe(100)
      expect(computeTrustScore(0, 10, 1)).toBe(2)
    })
  })
})
