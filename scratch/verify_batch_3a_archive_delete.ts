import { createAdminClient } from '../src/lib/dal/customers';
import { buildRequestDeleteBackupAdmin, hardDeleteRequestWithBackupAdmin, getArchiveRequestsAdmin } from '../src/lib/dal/archive';

async function verify() {
  const adminClient = await createAdminClient();
  console.log('--- START VERIFICATION: Batch 3A Archive & Delete ---');

  // 0. Setup: Find an admin staff member for attribution
  const { data: staffList } = await adminClient
    .from('staff_members')
    .select('id, auth_user_id')
    .eq('is_active', true)
    .limit(1);
  
  if (!staffList || staffList.length === 0) {
    throw new Error('Preflight: No active staff member found for testing.');
  }
  const testStaff = staffList[0];
  console.log(`Using staff ID: ${testStaff.id}`);

  // 1. Create Synthetic Customer
  const testCustomerCode = `TEST-CUST-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const { data: customer, error: custErr } = await adminClient
    .from('customers')
    .insert({
      full_name: 'Synthetic Test Customer',
      customer_code: testCustomerCode,
      status: 'active'
    } as any)
    .select()
    .single();
  
  if (custErr) throw custErr;
  console.log(`Created synthetic customer: ${customer.id}`);

  try {
    // 2. Create Synthetic Request (Active - should block delete)
    const testRequestCode = `TEST-REQ-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { data: request, error: reqErr } = await adminClient
      .from('requests')
      .insert({
        customer_id: customer.id,
        request_code: testRequestCode,
        title: 'Synthetic Test Request',
        raw_description: 'Synthetic verification request description',
        current_status: 'open', // Active
        is_archived: false
      } as any)
      .select()
      .single();
    
    if (reqErr) throw reqErr;
    console.log(`Created synthetic request: ${request.id} (${testRequestCode})`);

    // 3. Add Child Data
    await Promise.all([
      adminClient.from('request_preferences').insert({ request_id: request.id, urgency_level: 'high' }),
      adminClient.from('research_runs').insert({ request_id: request.id, run_kind: 'online_search', status: 'completed' }),
      adminClient.from('request_status_history').insert({ 
        request_id: request.id, 
        transition_name: 'TEST_EVENT', 
        from_status: 'open', 
        to_status: 'open',
        changed_by_staff_id: testStaff.id 
      })
    ]);
    console.log('Added synthetic child data.');

    // 4. Test Case: Build Backup
    console.log('Building backup...');
    const backup = await buildRequestDeleteBackupAdmin(request.id, testStaff.auth_user_id);
    console.log(`Backup created: ${backup.id}`);

    // Verify backup contains data
    if (backup.backup_json.request.id !== request.id) throw new Error('Backup data mismatch: request_id');
    if (backup.backup_json.metadata.table_counts.preferences === 0) throw new Error('Backup data missing: preferences');
    console.log('✓ Backup verification passed.');

    // 5. Test Case: Delete BLOCKED (Active Request)
    console.log('Attempting to delete ACTIVE request (should fail)...');
    let deleteSucceeded = false;
    try {
      await hardDeleteRequestWithBackupAdmin({
        requestId: request.id,
        backupId: backup.id,
        actorUserId: testStaff.auth_user_id
      });
      deleteSucceeded = true;
    } catch (err: any) {
      console.log(`✓ Blocked active delete as expected: ${err.message}`);
    }
    if (deleteSucceeded) throw new Error('FAILURE: Allowed delete of active request.');

    // 6. Move Request to Terminal State (COMPLETED)
    await adminClient.from('requests').update({ current_status: 'closed' }).eq('id', request.id);
    console.log('Request moved to terminal state (closed).');

    // 6b. Test Case: Verify getArchiveRequestsAdmin Output (Task G)
    console.log('Verifying getArchiveRequestsAdmin output...');
    // We need to specify status: 'COMPLETED' because the default is 'ARCHIVED'
    const { items: archiveItems } = await getArchiveRequestsAdmin({ search: testRequestCode, status: 'COMPLETED' });
    const testItem = archiveItems.find(i => i.id === request.id);
    
    if (!testItem) throw new Error(`Test request ${testRequestCode} not found in archive list (status: COMPLETED)`);
    if (testItem.latest_backup_id !== backup.id) throw new Error('Backup ID mismatch in archive list');
    if (testItem.backup_status !== 'prepared') throw new Error(`Backup status mismatch: ${testItem.backup_status}`);
    
    const ids = archiveItems.map(i => i.id);
    if (new Set(ids).size !== ids.length) throw new Error('Archive list returned duplicate request ids');
    console.log('✓ Archive list verification passed.');

    // 7. Test Case: Delete SUCCESS
    console.log('Executing hard delete...');
    const deleteResult = await hardDeleteRequestWithBackupAdmin({
      requestId: request.id,
      backupId: backup.id,
      actorUserId: testStaff.auth_user_id,
      notes: 'Synthetic verification cleanup'
    });
    
    if (!deleteResult) throw new Error('Delete returned false');
    console.log('✓ Hard delete RPC returned success.');

    // 8. Verify Data is GONE
    const { data: checkReq } = await adminClient.from('requests').select('id').eq('id', request.id).maybeSingle();
    if (checkReq) throw new Error('FAILURE: Request still exists after delete.');

    const { data: checkPrefs } = await adminClient.from('request_preferences').select('id').eq('request_id', request.id).maybeSingle();
    if (checkPrefs) throw new Error('FAILURE: Preferences still exist after delete.');
    
    console.log('✓ Verified request and children are purged.');

    // 9. Verify Backup and Audit SURVIVE
    const { data: checkBackup } = await adminClient.from('request_delete_backups').select('delete_confirmed').eq('id', backup.id).single();
    if (!checkBackup?.delete_confirmed) throw new Error('FAILURE: Backup should be confirmed after delete.');
    
    const { data: checkAudit } = await adminClient.from('request_deletion_audit')
      .select('event_type')
      .eq('backup_id', backup.id)
      .eq('event_type', 'REQUEST_HARD_DELETED')
      .limit(1);
    
    if (!checkAudit || checkAudit.length === 0) throw new Error('FAILURE: Audit log missing.');

    console.log('✓ Verified backup and audit logs persist.');

    // 10. Verify Protected Tables INTACT
    const { data: checkCust } = await adminClient.from('customers').select('id').eq('id', customer.id).single();
    if (!checkCust) throw new Error('FAILURE: Customer record was deleted.');
    
    const { data: checkStaff } = await adminClient.from('staff_members').select('id').eq('id', testStaff.id).single();
    if (!checkStaff) throw new Error('FAILURE: Staff record was deleted.');

    console.log('✓ Verified protected tables (Customer, Staff) are intact.');

  } finally {
    // Teardown: Cleanup synthetic customer (request is already gone)
    await adminClient.from('customers').delete().eq('id', customer.id);
    console.log('Cleaned up synthetic customer.');
  }

  console.log('--- ALL VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
