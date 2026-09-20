/**
 * FINDORA — P1-02: Snapshot Lifecycle Remediation & Concurrency Lockdown
 * Test Suite: tests/unit/p1_02_snapshot_lifecycle_lockdown.test.ts
 *
 * Verifies:
 * A. FK definition: report_option_unlocks_snapshot_id_fkey is ON DELETE RESTRICT
 * B. Internal function permissions: fn_sync_report_option_snapshots & fn_prepare_request_client_bundle & fn_admin_unlock_report_option revoked from anon/auth and granted to service_role
 * C. Customer unlock permissions: fn_unlock_report_option revoked from anon and granted to authenticated & service_role
 * D. Release guards: sync & prepare reject released requests; customer & admin unlock reject unreleased requests
 * E. Hard delete: explicitly deletes report_option_unlocks before report_option_snapshots to satisfy ON DELETE RESTRICT
 * F. Snapshot protection: sync rejects if unlocks exist; FK RESTRICT prevents orphan/cascade loss
 * G. Concurrency & locking: canonical parent lock hierarchy (requests -> request_operational_states) enforced across all functions
 */

import fs from 'node:fs'
import path from 'node:path'

describe('P1-02: Snapshot Lifecycle Remediation & Concurrency Lockdown', () => {
  const migrationFile = path.resolve('supabase/migrations/20260924000000_p1_02_snapshot_lifecycle_lockdown.sql')
  let migrationContent = ''

  beforeAll(() => {
    expect(fs.existsSync(migrationFile)).toBe(true)
    migrationContent = fs.readFileSync(migrationFile, 'utf8')
  })

  describe('A. FK Definition Hardening', () => {
    it('drops previous foreign key constraint idempotently', () => {
      expect(migrationContent).toMatch(
        /ALTER\s+TABLE\s+ONLY\s+"?public"?\."?report_option_unlocks"?\s+DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+"?report_option_unlocks_snapshot_id_fkey"?/i
      )
    })

    it('adds report_option_unlocks_snapshot_id_fkey with ON DELETE RESTRICT', () => {
      expect(migrationContent).toMatch(
        /ALTER\s+TABLE\s+ONLY\s+"?public"?\."?report_option_unlocks"?\s+ADD\s+CONSTRAINT\s+"?report_option_unlocks_snapshot_id_fkey"?\s+FOREIGN\s+KEY\s*\(\s*"report_option_snapshot_id"\s*\)\s+REFERENCES\s+"?public"?\."?report_option_snapshots"?\s*\(\s*"id"\s*\)\s+ON\s+DELETE\s+RESTRICT/i
      )
    })

    it('does NOT contain ON DELETE CASCADE for report_option_unlocks_snapshot_id_fkey in DDL', () => {
      const sqlWithoutComments = migrationContent.replace(/--.*$/gm, '')
      const fkMatches = sqlWithoutComments.match(/report_option_unlocks_snapshot_id_fkey[\s\S]*?ON\s+DELETE\s+CASCADE/gi)
      expect(fkMatches).toBeNull()
    })
  })

  describe('B. Internal Function Permissions', () => {
    it('revokes fn_sync_report_option_snapshots from PUBLIC, anon, and authenticated', () => {
      expect(migrationContent).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+"?public"?\."?fn_sync_report_option_snapshots"?\s*\(\s*"p_report_id"\s+"uuid",\s*"p_max_options"\s+integer\s*\)\s+FROM\s+PUBLIC,\s*"anon",\s*"authenticated"/i
      )
    })

    it('grants fn_sync_report_option_snapshots execute to service_role only', () => {
      expect(migrationContent).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"?public"?\."?fn_sync_report_option_snapshots"?\s*\(\s*"p_report_id"\s+"uuid",\s*"p_max_options"\s+integer\s*\)\s+TO\s+"service_role"/i
      )
    })

    it('revokes fn_prepare_request_client_bundle from PUBLIC, anon, and authenticated', () => {
      expect(migrationContent).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+"?public"?\."?fn_prepare_request_client_bundle"?\s*\([\s\S]*?\)\s+FROM\s+PUBLIC,\s*"anon",\s*"authenticated"/i
      )
    })

    it('grants fn_prepare_request_client_bundle execute to service_role only', () => {
      expect(migrationContent).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"?public"?\."?fn_prepare_request_client_bundle"?\s*\([\s\S]*?\)\s+TO\s+"service_role"/i
      )
    })

    it('revokes fn_admin_unlock_report_option from PUBLIC, anon, and authenticated', () => {
      expect(migrationContent).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+"?public"?\."?fn_admin_unlock_report_option"?\s*\([\s\S]*?\)\s+FROM\s+PUBLIC,\s*"anon",\s*"authenticated"/i
      )
    })

    it('grants fn_admin_unlock_report_option execute to service_role', () => {
      expect(migrationContent).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"?public"?\."?fn_admin_unlock_report_option"?\s*\([\s\S]*?\)\s+TO\s+"service_role"/i
      )
    })
  })

  describe('C. Customer Unlock Permissions', () => {
    it('revokes fn_unlock_report_option from PUBLIC and anon', () => {
      expect(migrationContent).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+"?public"?\."?fn_unlock_report_option"?\s*\(\s*"p_report_option_snapshot_id"\s+"uuid"\s*\)\s+FROM\s+PUBLIC,\s*"anon"/i
      )
    })

    it('grants fn_unlock_report_option execute to authenticated and service_role', () => {
      expect(migrationContent).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"?public"?\."?fn_unlock_report_option"?\s*\(\s*"p_report_option_snapshot_id"\s+"uuid"\s*\)\s+TO\s+"authenticated",\s*"service_role"/i
      )
    })

    it('preserves authenticated customer ownership validation via auth.uid() in fn_unlock_report_option', () => {
      expect(migrationContent).toMatch(
        /c\.auth_user_id\s*=\s*auth\.uid\(\)/i
      )
      expect(migrationContent).toContain("raise exception 'Snapshot not found for current authenticated customer'")
    })
  })

  describe('D. Release Guard Enforcement', () => {
    it('fn_sync_report_option_snapshots rejects already released requests', () => {
      expect(migrationContent).toContain("if v_client_released_at is not null then")
      expect(migrationContent).toContain("Cannot sync snapshots: request % report has already been released to customer")
    })

    it('fn_prepare_request_client_bundle rejects already released requests', () => {
      expect(migrationContent).toContain("Cannot prepare client bundle: request % report has already been released to customer")
    })

    it('fn_unlock_report_option rejects unreleased reports at the DB RPC layer', () => {
      expect(migrationContent).toContain("if v_client_released_at is null then")
      expect(migrationContent).toContain("Cannot unlock report option: request % report has not been released to customer yet")
    })

    it('fn_admin_unlock_report_option rejects unreleased reports at the DB RPC layer', () => {
      expect(migrationContent).toMatch(
        /if\s+v_client_released_at\s+is\s+null\s+then[\s\S]*?Cannot unlock report option: request % report has not been released to customer yet/i
      )
    })
  })

  describe('E. GDPR / Administrative Hard Delete Preservation', () => {
    it('explicitly deletes report_option_unlocks before report_option_snapshots', () => {
      const unlockDeleteIdx = migrationContent.indexOf('DELETE FROM public.report_option_unlocks WHERE request_id = p_request_id;')
      const snapshotDeleteIdx = migrationContent.indexOf('DELETE FROM public.report_option_snapshots WHERE request_id = p_request_id;')
      const reportDeleteIdx = migrationContent.indexOf('DELETE FROM public.reports WHERE request_id = p_request_id;')

      expect(unlockDeleteIdx).toBeGreaterThan(-1)
      expect(snapshotDeleteIdx).toBeGreaterThan(-1)
      expect(reportDeleteIdx).toBeGreaterThan(-1)

      // Strict deletion order: unlocks -> snapshots -> reports
      expect(unlockDeleteIdx).toBeLessThan(snapshotDeleteIdx)
      expect(snapshotDeleteIdx).toBeLessThan(reportDeleteIdx)
    })

    it('preserves backup verification and terminal state checks in fn_hard_delete_request_with_backup', () => {
      expect(migrationContent).toContain("SELECT * INTO v_backup")
      expect(migrationContent).toContain("FROM public.request_delete_backups")
      expect(migrationContent).toContain("v_backup.delete_confirmed IS TRUE")
      expect(migrationContent).toContain("INSERT INTO public.request_deletion_audit")
      expect(migrationContent).toContain("v_is_admin")
    })

    it('locks down fn_hard_delete_request_with_backup permissions to service_role only', () => {
      expect(migrationContent).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+"?public"?\."?fn_hard_delete_request_with_backup"?\s*\([\s\S]*?\)\s+FROM\s+PUBLIC,\s*"anon",\s*"authenticated"/i
      )
      expect(migrationContent).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"?public"?\."?fn_hard_delete_request_with_backup"?\s*\([\s\S]*?\)\s+TO\s+"service_role"/i
      )
    })
  })

  describe('F. Snapshot Protection & Unlock Invariants', () => {
    it('fn_sync_report_option_snapshots rejects synchronization if any customer unlocks exist', () => {
      expect(migrationContent).toMatch(
        /if\s+exists\s*\(\s*select\s+1\s+from\s+public\.report_option_unlocks\s+rou\s+where\s+rou\.request_id\s*=\s*v_request_id\s+or\s+rou\.report_option_snapshot_id\s+in/i
      )
      expect(migrationContent).toContain("Cannot sync snapshots: customer unlocks already exist for request % / report %")
    })

    it('defines SECURITY DEFINER and safe search_path on all 5 functions', () => {
      const secDefMatches = migrationContent.match(/SECURITY\s+DEFINER/gi)
      expect(secDefMatches).not.toBeNull()
      expect(secDefMatches!.length).toBe(5)

      const searchPathMatches = migrationContent.match(/SET\s+"?search_path"?\s*(?:=|TO)\s*'?public'?/gi)
      expect(searchPathMatches).not.toBeNull()
      expect(searchPathMatches!.length).toBe(5)
    })
  })

  describe('G. Concurrency & Locking Hierarchy', () => {
    it('enforces requests FOR UPDATE before request_operational_states FOR UPDATE in fn_sync_report_option_snapshots', () => {
      const syncFnSection = migrationContent.substring(
        migrationContent.indexOf('fn_sync_report_option_snapshots'),
        migrationContent.indexOf('fn_prepare_request_client_bundle')
      )

      const lockReqIdx = syncFnSection.indexOf('from public.requests req')
      const lockRosIdx = syncFnSection.indexOf('from public.request_operational_states ros')
      const deleteSnapshotIdx = syncFnSection.indexOf('delete from public.report_option_snapshots')

      expect(lockReqIdx).toBeGreaterThan(-1)
      expect(lockRosIdx).toBeGreaterThan(-1)
      expect(deleteSnapshotIdx).toBeGreaterThan(-1)

      // Strict parent locking hierarchy: requests -> operational_states -> child mutation
      expect(lockReqIdx).toBeLessThan(lockRosIdx)
      expect(lockRosIdx).toBeLessThan(deleteSnapshotIdx)
      expect(syncFnSection).toMatch(/for\s+update/i)
    })

    it('enforces requests FOR UPDATE before request_operational_states FOR UPDATE in fn_prepare_request_client_bundle', () => {
      const prepareFnSection = migrationContent.substring(
        migrationContent.indexOf('fn_prepare_request_client_bundle'),
        migrationContent.indexOf('fn_unlock_report_option')
      )

      const lockReqIdx = prepareFnSection.indexOf('from public.requests req')
      const lockRosIdx = prepareFnSection.indexOf('from public.request_operational_states ros')

      expect(lockReqIdx).toBeGreaterThan(-1)
      expect(lockRosIdx).toBeGreaterThan(-1)
      expect(lockReqIdx).toBeLessThan(lockRosIdx)
    })

    it('enforces requests FOR UPDATE before request_operational_states FOR UPDATE in fn_unlock_report_option', () => {
      const unlockFnSection = migrationContent.substring(
        migrationContent.indexOf('fn_unlock_report_option'),
        migrationContent.indexOf('fn_admin_unlock_report_option')
      )

      const lockReqIdx = unlockFnSection.indexOf('from public.requests req')
      const lockRosIdx = unlockFnSection.indexOf('from public.request_operational_states ros')
      const unlockInsertIdx = unlockFnSection.indexOf('insert into public.report_option_unlocks')

      expect(lockReqIdx).toBeGreaterThan(-1)
      expect(lockRosIdx).toBeGreaterThan(-1)
      expect(unlockInsertIdx).toBeGreaterThan(-1)

      // Strict lock hierarchy matches sync: requests -> operational_states -> child mutation
      expect(lockReqIdx).toBeLessThan(lockRosIdx)
      expect(lockRosIdx).toBeLessThan(unlockInsertIdx)
    })

    it('enforces requests FOR UPDATE before request_operational_states FOR UPDATE in fn_admin_unlock_report_option', () => {
      const adminUnlockSection = migrationContent.substring(
        migrationContent.indexOf('fn_admin_unlock_report_option'),
        migrationContent.indexOf('fn_hard_delete_request_with_backup')
      )

      const lockReqIdx = adminUnlockSection.indexOf('from public.requests req')
      const lockRosIdx = adminUnlockSection.indexOf('from public.request_operational_states ros')

      expect(lockReqIdx).toBeGreaterThan(-1)
      expect(lockRosIdx).toBeGreaterThan(-1)
      expect(lockReqIdx).toBeLessThan(lockRosIdx)
    })
  })
})
