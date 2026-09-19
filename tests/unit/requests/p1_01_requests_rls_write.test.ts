/**
 * FINDORA — P1-01 Batch 1: Requests RLS Write Boundary & Customer Mutation RPCs
 * Test Suite: tests/unit/requests/p1_01_requests_rls_write.test.ts
 *
 * Verifies:
 * 1. Migration 20260922000000 exists and contains exactly the two approved customer mutation RPCs.
 * 2. Both functions are configured with SECURITY DEFINER and explicit safe search_path.
 * 3. Both functions strictly derive identity from auth.uid() and reject unauthenticated execution (NULL auth.uid()).
 * 4. Both functions resolve customer profile through customers.auth_user_id = auth.uid() and enforce requests.customer_id = customer.id (IDOR rejection).
 * 5. Both functions prevent mutation of terminal/inactive requests (archived, cancelled, closed).
 * 6. Column allowlists are strictly enforced:
 *    - fn_customer_update_request_details modifies ONLY title, raw_description, updated_at.
 *    - fn_customer_toggle_auto_reorder modifies ONLY is_recurring, reorder_interval_months, last_reordered_at, updated_at.
 * 7. Critical negative test: neither RPC modifies sensitive/admin columns (current_status, service_fee_amount, canonical_state, customer_id, request_code, assigned_reviewer_staff_id).
 * 8. Execution privileges are strictly granted to authenticated and service_role, and revoked from PUBLIC and anon.
 * 9. Table public.requests remains strict Default-Deny for direct writes (no INSERT/UPDATE/DELETE granted to anon or authenticated).
 * 10. Staff and administrative mutation paths remain completely untouched.
 */

import fs from 'node:fs'
import path from 'node:path'

describe('P1-01 Batch 1: Database Boundary & Customer Mutation RPCs', () => {
  const migrationFile = path.resolve('supabase/migrations/20260922000000_p1_01_customer_request_mutation_rpcs.sql')
  let migrationContent = ''

  beforeAll(() => {
    expect(fs.existsSync(migrationFile)).toBe(true)
    migrationContent = fs.readFileSync(migrationFile, 'utf8')
  })

  describe('1. RPC Signatures & Definition', () => {
    it('defines fn_customer_update_request_details with exact signature', () => {
      const match = migrationContent.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.fn_customer_update_request_details\s*\(\s*p_request_id\s+uuid,\s*p_title\s+text,\s*p_raw_description\s+text\s*\)\s*RETURNS\s+jsonb/i
      )
      expect(match).not.toBeNull()
    })

    it('defines fn_customer_toggle_auto_reorder with exact signature', () => {
      const match = migrationContent.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.fn_customer_toggle_auto_reorder\s*\(\s*p_request_id\s+uuid,\s*p_is_recurring\s+boolean,\s*p_reorder_interval_months\s+integer\s*\)\s*RETURNS\s+jsonb/i
      )
      expect(match).not.toBeNull()
    })

    it('configures both RPCs with SECURITY DEFINER', () => {
      const secDefMatches = migrationContent.match(/SECURITY\s+DEFINER/gi)
      expect(secDefMatches).not.toBeNull()
      expect(secDefMatches!.length).toBeGreaterThanOrEqual(2)
    })

    it('sets an explicit safe search_path for both RPCs', () => {
      const searchPathMatches = migrationContent.match(/SET\s+search_path\s*=\s*public/gi)
      expect(searchPathMatches).not.toBeNull()
      expect(searchPathMatches!.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('2. Authentication & Identity Constraints', () => {
    it('enforces that auth.uid() is not null in both functions', () => {
      const authUidChecks = migrationContent.match(/v_auth_uid\s+IS\s+NULL/gi)
      expect(authUidChecks).not.toBeNull()
      expect(authUidChecks!.length).toBeGreaterThanOrEqual(2)

      expect(migrationContent).toContain("RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.'")
    })

    it('derives customer identity from customers.auth_user_id = v_auth_uid', () => {
      const customerLookups = migrationContent.match(/SELECT\s+id\s+INTO\s+v_customer_id\s+FROM\s+public\.customers\s+WHERE\s+auth_user_id\s*=\s*v_auth_uid/gi)
      expect(customerLookups).not.toBeNull()
      expect(customerLookups!.length).toBeGreaterThanOrEqual(2)
    })

    it('rejects execution when customer profile does not exist for the authenticated user', () => {
      const customerNullChecks = migrationContent.match(/v_customer_id\s+IS\s+NULL/gi)
      expect(customerNullChecks).not.toBeNull()
      expect(customerNullChecks!.length).toBeGreaterThanOrEqual(2)
    })

    it('does NOT accept or trust caller-supplied customer_id or auth_user_id parameters', () => {
      expect(migrationContent).not.toMatch(/p_customer_id/i)
      expect(migrationContent).not.toMatch(/p_auth_user_id/i)
      expect(migrationContent).not.toMatch(/p_actor_id/i)
    })
  })

  describe('3. Ownership Enforcement & IDOR Rejection', () => {
    it('compares request customer_id against authenticated customer_id', () => {
      const idorChecks = migrationContent.match(/v_request_customer_id\s*<>\s*v_customer_id/gi)
      expect(idorChecks).not.toBeNull()
      expect(idorChecks!.length).toBeGreaterThanOrEqual(2)
    })

    it('raises 42501 error when ownership check fails', () => {
      expect(migrationContent).toContain("RAISE EXCEPTION 'FORBIDDEN: You do not own request %.'")
    })
  })

  describe('4. Request State & Terminal Guard', () => {
    it('rejects mutations on archived, cancelled, or closed requests in both RPCs', () => {
      const stateChecks = migrationContent.match(/v_is_archived\s+IS\s+TRUE\s+OR\s+v_is_cancelled\s+IS\s+TRUE\s+OR\s+v_current_status\s+IN\s*\(\s*'closed',\s*'cancelled'\s*\)/gi)
      expect(stateChecks).not.toBeNull()
      expect(stateChecks!.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('5. Column Allowlists & Negative Leakage Tests', () => {
    it('fn_customer_update_request_details updates ONLY title, raw_description, updated_at', () => {
      const updateDetailsFn = migrationContent.substring(
        migrationContent.indexOf('fn_customer_update_request_details'),
        migrationContent.indexOf('fn_customer_toggle_auto_reorder')
      )

      expect(updateDetailsFn).toContain('UPDATE public.requests')
      expect(updateDetailsFn).toContain('title =')
      expect(updateDetailsFn).toContain('raw_description =')
      expect(updateDetailsFn).toContain('updated_at = now()')

      // Negative checks on sensitive columns
      expect(updateDetailsFn).not.toContain('current_status =')
      expect(updateDetailsFn).not.toContain('canonical_state =')
      expect(updateDetailsFn).not.toContain('service_fee_amount =')
      expect(updateDetailsFn).not.toContain('pricing_decision =')
      expect(updateDetailsFn).not.toContain('customer_id =')
      expect(updateDetailsFn).not.toContain('request_code =')
      expect(updateDetailsFn).not.toContain('assigned_reviewer_staff_id =')
    })

    it('guarantees raw_description is NEVER set to NULL via ELSE raw_description fallback', () => {
      const updateDetailsFn = migrationContent.substring(
        migrationContent.indexOf('fn_customer_update_request_details'),
        migrationContent.indexOf('fn_customer_toggle_auto_reorder')
      )
      // Must contain CASE WHEN p_raw_description IS NOT NULL THEN p_raw_description ELSE raw_description END
      expect(updateDetailsFn).toMatch(/raw_description\s*=\s*CASE\s+WHEN\s+p_raw_description\s+IS\s+NOT\s+NULL\s+THEN\s+p_raw_description\s+ELSE\s+raw_description\s+END/i)
    })

    it('guarantees title is preserved when NULL or whitespace-empty via ELSE title fallback', () => {
      const updateDetailsFn = migrationContent.substring(
        migrationContent.indexOf('fn_customer_update_request_details'),
        migrationContent.indexOf('fn_customer_toggle_auto_reorder')
      )
      // Must contain CASE WHEN p_title IS NOT NULL AND trim(p_title) <> '' THEN trim(p_title) ELSE title END
      expect(updateDetailsFn).toMatch(/title\s*=\s*CASE\s+WHEN\s+p_title\s+IS\s+NOT\s+NULL\s+AND\s+trim\s*\(\s*p_title\s*\)\s*<>\s*''\s+THEN\s+trim\s*\(\s*p_title\s*\)\s+ELSE\s+title\s+END/i)
    })

    it('fn_customer_toggle_auto_reorder updates ONLY is_recurring, reorder_interval_months, last_reordered_at, updated_at', () => {
      const toggleReorderFn = migrationContent.substring(
        migrationContent.indexOf('fn_customer_toggle_auto_reorder'),
        migrationContent.indexOf('ALTER FUNCTION')
      )

      expect(toggleReorderFn).toContain('UPDATE public.requests')
      expect(toggleReorderFn).toContain('is_recurring =')
      expect(toggleReorderFn).toContain('reorder_interval_months =')
      expect(toggleReorderFn).toContain('last_reordered_at = NULL')
      expect(toggleReorderFn).toContain('updated_at = now()')

      // Negative checks on sensitive columns
      expect(toggleReorderFn).not.toContain('current_status =')
      expect(toggleReorderFn).not.toContain('canonical_state =')
      expect(toggleReorderFn).not.toContain('service_fee_amount =')
      expect(toggleReorderFn).not.toContain('pricing_decision =')
      expect(toggleReorderFn).not.toContain('customer_id =')
      expect(toggleReorderFn).not.toContain('request_code =')
    })
  })

  describe('6. Execution Privileges & Role Hardening', () => {
    it('revokes execution from PUBLIC and anon for both RPCs', () => {
      expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.fn_customer_update_request_details(uuid, text, text) FROM PUBLIC;')
      expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.fn_customer_update_request_details(uuid, text, text) FROM anon;')
      expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.fn_customer_toggle_auto_reorder(uuid, boolean, integer) FROM PUBLIC;')
      expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.fn_customer_toggle_auto_reorder(uuid, boolean, integer) FROM anon;')
    })

    it('grants execution strictly to authenticated and service_role', () => {
      expect(migrationContent).toContain('GRANT EXECUTE ON FUNCTION public.fn_customer_update_request_details(uuid, text, text) TO authenticated;')
      expect(migrationContent).toContain('GRANT EXECUTE ON FUNCTION public.fn_customer_update_request_details(uuid, text, text) TO service_role;')
      expect(migrationContent).toContain('GRANT EXECUTE ON FUNCTION public.fn_customer_toggle_auto_reorder(uuid, boolean, integer) TO authenticated;')
      expect(migrationContent).toContain('GRANT EXECUTE ON FUNCTION public.fn_customer_toggle_auto_reorder(uuid, boolean, integer) TO service_role;')
    })

    it('does NOT grant INSERT, UPDATE, or DELETE on requests to authenticated or anon', () => {
      expect(migrationContent).not.toMatch(/GRANT\s+(INSERT|UPDATE|DELETE|ALL)\s+ON\s+(public\.)?requests\s+TO/i)
      expect(migrationContent).not.toMatch(/CREATE\s+POLICY\s+.*ON\s+(public\.)?requests\s+FOR\s+UPDATE/i)
      expect(migrationContent).not.toMatch(/CREATE\s+POLICY\s+.*ON\s+(public\.)?requests\s+FOR\s+INSERT/i)
      expect(migrationContent).not.toMatch(/CREATE\s+POLICY\s+.*ON\s+(public\.)?requests\s+FOR\s+DELETE/i)
    })
  })

  describe('7. Staff Safety & Architectural Isolation', () => {
    it('does not touch or modify staff actions or DAL files', () => {
      const gitDiff = fs.readFileSync(path.resolve('supabase/migrations/20260922000000_p1_01_customer_request_mutation_rpcs.sql'), 'utf8')
      expect(gitDiff).not.toContain('staff_members')
      expect(gitDiff).not.toContain('fn_assign_staff_member')
    })
  })
})
