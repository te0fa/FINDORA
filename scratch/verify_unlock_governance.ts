import { createAdminClient } from '../src/lib/dal/customers';
import { randomUUID } from 'crypto';
import { unlockSnapshot } from '../src/lib/dal/reports';

async function main() {
  console.log('--- STARTING CUSTOMER UNLOCK GOVERNANCE VERIFICATION ---');
  const adminClient = await createAdminClient();

  // 1. Setup Fresh Test Data
  const testTitle = `[AUDIT_TEST] ${randomUUID()}`;
  console.log(`⏳ Creating fresh test request: ${testTitle}`);

  // Find two real authenticated customers
  const { data: testCusts } = await adminClient
    .from('customers')
    .select('id, auth_user_id, full_name')
    .not('auth_user_id', 'is', null)
    .limit(2);

  if (!testCusts || testCusts.length < 2) {
    console.error('❌ Failed to find enough authenticated customers for testing.');
    process.exit(1);
  }

  const ownerCust = testCusts[0];
  const attackerCust = testCusts[1];

  // Find an active staff member to use for transitions
  const { data: staffList } = await adminClient
    .from('staff_members')
    .select('id, auth_user_id')
    .eq('is_active', true)
    .limit(1);

  if (!staffList || staffList.length === 0) {
    console.error('❌ Failed to find an active staff member for transition testing.');
    process.exit(1);
  }
  const activeStaffId = staffList[0].id;

  // Create Request
  const { data: req, error: reqErr } = await adminClient.from('requests').insert({
    title: testTitle,
    request_code: `TEST-${randomUUID().substring(0, 8)}`,
    raw_description: 'Test description',
    customer_id: ownerCust.id,
    current_status: 'submitted'
  }).select().single();
  if (reqErr) { console.error('❌ Failed to create request:', reqErr); process.exit(1); }
  const testRequestId = req.id;

  // Create Report
  const reportId = randomUUID();
  await adminClient.from('reports').insert({ id: reportId, request_id: testRequestId });

  // Create Snapshot
  const snapshotId = randomUUID();
  const { error: snapErr } = await adminClient.from('report_option_snapshots').insert({
    id: snapshotId,
    request_id: testRequestId,
    report_id: reportId,
    display_title: '[AUDIT_TEST] Locked Option',
    highlight_summary: 'This is a test reason',
    candidate_channel: 'online',
    reveal_locked: true,
    display_rank: 1
  });
  if (snapErr) { console.error('❌ Failed to insert snapshot:', snapErr); process.exit(1); }

  console.log(`✅ Context: Request=${testRequestId}, Owner=${ownerCust.auth_user_id}, Attacker=${attackerCust.auth_user_id}`);

  let allPassed = true;

  try {
    // TEST 1: Unreleased Report
    console.log('\n--- TEST 1: Unreleased Report ---');
    try {
      await unlockSnapshot(snapshotId, ownerCust.auth_user_id);
      console.error('❌ FAILED: Unlock succeeded for unreleased report.');
      allPassed = false;
    } catch (err: any) {
      console.log(`✅ PASSED: Blocked with error: ${err.message}`);
    }

    // --- RELEASE VIA TRANSITION ENGINE ---
    console.log('\n⏳ Releasing request via transition engine...');
    // Add shortlist item to satisfy release guards
    await adminClient.from('request_candidate_shortlists').insert({
      request_id: testRequestId,
      candidate_channel: 'online',
      option_label: '[AUDIT_TEST] Shortlist Item',
      ranking_position: 1
    });
    // Set to client_ready so transition engine accepts it
    await adminClient.from('requests').update({ current_status: 'client_ready' }).eq('id', testRequestId);
    
    const { error: transErr } = await adminClient.rpc('fn_execute_request_transition', {
      p_transition_name: 'RELEASE_FINAL',
      p_request_id: testRequestId,
      p_actor_staff_id: activeStaffId,
      p_notes: 'Released for [AUDIT_TEST]'
    });
    if (transErr) { console.error('❌ Failed to release via transition:', transErr); process.exit(1); }

    // TEST 2: Wrong Customer
    console.log('\n--- TEST 2: Wrong Customer (Cross-Tenant Attack) ---');
    try {
      await unlockSnapshot(snapshotId, attackerCust.auth_user_id);
      console.error('❌ FAILED: Attacker successfully unlocked someone else\'s option.');
      allPassed = false;
    } catch (err: any) {
      console.log(`✅ PASSED: Blocked with error: ${err.message}`);
    }

    // TEST 3: Invalid Actor (Random UUID)
    console.log('\n--- TEST 3: Invalid Actor (Random UUID) ---');
    try {
      await unlockSnapshot(snapshotId, randomUUID());
      console.error('❌ FAILED: Unknown actor successfully unlocked an option.');
      allPassed = false;
    } catch (err: any) {
      console.log(`✅ PASSED: Blocked with error: ${err.message}`);
    }
 
    // TEST 4: Successful Unlock by Owner
    console.log('\n--- TEST 4: Successful Unlock by Owner ---');
    try {
      const result = await unlockSnapshot(snapshotId, ownerCust.auth_user_id);
      console.log(`✅ Unlock call returned success for Request ${result.request_id}.`);
      
      const { data: updatedSnap } = await adminClient
        .from('report_option_snapshots')
        .select('reveal_locked')
        .eq('id', snapshotId)
        .single();
        
      if (updatedSnap?.reveal_locked === false) {
        console.log('✅ DB state verified: reveal_locked is now FALSE.');
      } else {
        console.error('❌ FAILED: DB state was not updated.');
        allPassed = false;
      }
    } catch (err: any) {
      console.error(`❌ FAILED: Owner was blocked from unlocking: ${err.message}`);
      allPassed = false;
    }

    // TEST 5: Duplicate Unlock by Owner (Idempotency)
    console.log('\n--- TEST 5: Duplicate Unlock by Owner (Idempotency) ---');
    try {
      const result = await unlockSnapshot(snapshotId, ownerCust.auth_user_id);
      if (result.already_unlocked) {
        console.log('✅ Success: Correctly identified as already_unlocked.');
      } else {
        console.error('❌ FAILED: Second unlock did not return already_unlocked.');
        allPassed = false;
      }
    } catch (err: any) {
      console.error(`❌ FAILED: Owner was blocked on second unlock: ${err.message}`);
      allPassed = false;
    }

    // TEST 6: Attacker attempts revealed snapshot (Information Leak Guard)
    console.log('\n--- TEST 6: Attacker attempts revealed snapshot ---');
    try {
      await unlockSnapshot(snapshotId, attackerCust.auth_user_id);
      console.error('❌ FAILED: Attacker accessed a revealed snapshot status.');
      allPassed = false;
    } catch (err: any) {
      if (err.message.includes('Unauthorized')) {
        console.log('✅ PASSED: Blocked with correct ownership error.');
      } else {
        console.error(`❌ FAILED: Blocked with wrong error: ${err.message}`);
        allPassed = false;
      }
    }

    // TEST 7: Audit Verification (Count should be exactly 1)
    console.log('\n--- TEST 7: Audit Verification ---');
    const { data: audits, count: auditCount } = await adminClient
      .from('request_status_history')
      .select('*', { count: 'exact' })
      .eq('request_id', testRequestId)
      .eq('transition_name', 'CUSTOMER_OPTION_UNLOCKED');

    if (auditCount === 1) {
      console.log('✅ PASSED: Exactly 1 audit record found (Idempotency confirmed).');
    } else {
      console.error(`❌ FAILED: Found ${auditCount} audit records, expected 1.`);
      allPassed = false;
    }

    const audit = audits ? audits[0] : null;
    if (audit) {
      if (audit.event_source === 'customer_action') {
        console.log('✅ Event source is correctly "customer_action".');
      } else {
        console.error(`❌ FAILED: Event source is "${audit.event_source}", expected "customer_action".`);
        allPassed = false;
      }
    }

    // TEST 8: Timeline UI Data (v_request_timeline)
    console.log('\n--- TEST 8: Timeline View Compatibility ---');
    const { data: timeline } = await adminClient
      .from('v_request_timeline')
      .select('*')
      .eq('request_id', testRequestId)
      .eq('transition_name', 'CUSTOMER_OPTION_UNLOCKED')
      .limit(1);

    if (timeline && timeline.length > 0) {
      console.log('✅ Event visible in v_request_timeline.');
    } else {
      console.error('❌ FAILED: Event not visible in v_request_timeline.');
      allPassed = false;
    }

  } finally {
    console.log('\n--- CLEANUP ---');
    // Deprioritize the request instead of deleting to preserve audit history
    await adminClient.from('requests').update({ 
      is_archived: true,
      title: `${testTitle} (COMPLETED)`
    }).eq('id', testRequestId);
    console.log('✅ Test artifacts archived (history preserved).');
    console.log('⚠️ Immutable snapshots remain in DB by design.');
  }

  if (!allPassed) {
    console.error('\n[VERDICT] FAILED: One or more governance checks failed.');
    process.exit(1);
  }

  console.log('\n[VERDICT] SUCCESS: Customer unlock governance hardened and verified.');
}

main().catch(err => {
  console.error('\n[VERDICT] FAILED: Unexpected error during verification.');
  console.error(err);
  process.exit(1);
});
