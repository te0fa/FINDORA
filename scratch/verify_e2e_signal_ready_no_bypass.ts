import { createAdminClient } from '../src/lib/dal/customers';
import { createSourcingRequest } from '../src/lib/dal/requests';
import { updateReviewerDecision, saveMerchantQuote, addToShortlist, prepareRequestClientBundle } from '../src/lib/dal/staff';
import { executeTransition } from '../src/lib/dal/transitions';
import { unlockReportOption, getCustomerRequestOverview } from '../src/lib/dal/reports';
import { resolveRequestState } from '../src/lib/dal/lifecycle';

async function verifyE2E() {
  const db = await createAdminClient();
  console.log('--- STARTING FULL E2E JOURNEY (NO BYPASS) ---');

  // 0. Setup Context
  const { data: staff } = await db.from('staff_members').select('*').eq('staff_role', 'admin').eq('is_active', true).limit(1).single();
  const { data: customer } = await db.from('customers').select('*').not('auth_user_id', 'is', null).limit(1).single();

  if (!staff || !customer) {
    console.error('Missing test context (staff or customer)');
    process.exit(1);
  }

  console.log(`Context: Staff=${staff.full_name} (${staff.id}), Customer=${customer.full_name} (${customer.id})`);

  let requestId: string = '';
  let reportId: string = '';

  try {
    // 1. Create Request (Manual insert to satisfy request_code NOT NULL)
    const requestCode = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data: request, error: insertErr } = await db
      .from('requests')
      .insert({
        customer_id: customer.id,
        title: '[E2E_SIGNAL_READY_NO_BYPASS] Test Request',
        raw_description: 'E2E testing the full lifecycle without bypass.',
        current_status: 'submitted',
        source_channel: 'web',
        request_kind: 'general',
        intake_mode: 'quick',
        request_code: requestCode
      })
      .select()
      .single();

    if (insertErr) throw new Error(`Request creation failed: ${insertErr.message}`);
    
    // Add preferences
    await db.from('request_preferences').insert({
      request_id: request.id,
      urgency_level: 'high',
      search_scope: 'online_and_offline',
      budget_min: 1000,
      budget_max: 5000,
      preferred_governorate: 'Cairo'
    });

    requestId = request.id;
    console.log(`[PASS] Request created: ${requestId} (${requestCode})`);

    // 2. Approve Intake
    await updateReviewerDecision({
      request_id: requestId,
      decision: 'approve',
      staff_id: staff.id,
      reviewer_notes: 'Approving for E2E test'
    });
    
    let { data: r1 } = await db.from('requests').select('*').eq('id', requestId).single();
    if (r1.current_status !== 'in_progress') throw new Error(`Status mismatch after APPROVE_INTAKE: ${r1.current_status}`);
    console.log('[PASS] APPROVE_INTAKE');

    // 3. Start Research
    await executeTransition('START_RESEARCH', requestId, staff.id);
    let { data: r2 } = await db.from('requests').select('*').eq('id', requestId).single();
    if (r2.current_status !== 'research') throw new Error(`Status mismatch after START_RESEARCH: ${r2.current_status}`);
    console.log('[PASS] START_RESEARCH');

    // 4. Add Online Finding
    const { data: run, error: runErr } = await db.from('research_runs').insert({
        request_id: requestId,
        run_kind: 'online_search',
        status: 'completed',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString()
    } as any).select().single();

    if (runErr) throw new Error(`Research run creation failed: ${runErr.message}`);
    if (!run) throw new Error('Research run creation returned no data');

    const { data: item, error: itemErr } = await db.from('research_items').insert({
        research_run_id: run.id,
        request_id: requestId,
        source_name: 'Example Store',
        product_title: 'Online Item A',
        price_amount: 1200,
        currency_code: 'EGP',
        listing_url: 'https://example.com/a',
        is_candidate: true
    } as any).select().single();

    if (itemErr) throw new Error(`Research item creation failed: ${itemErr.message}`);
    console.log('[PASS] Online finding added');

    // 5. Add Offline Merchant Quote
    const quote = await saveMerchantQuote({
      request_id: requestId,
      merchant_name: 'Merchant X',
      product_title: 'Offline Product B',
      price_amount: 1500,
      captured_by_staff_id: staff.id,
      address: 'Cairo, Egypt'
    });
    console.log('[PASS] Offline quote added');

    // 6. Add Shortlist Item
    await addToShortlist({
      request_id: requestId,
      candidate_channel: 'online',
      research_item_id: item.id,
      selected_by_user_id: staff.auth_user_id,
      reason_summary: 'Best online price',
      option_label: 'Online Choice'
    });
    
    await addToShortlist({
        request_id: requestId,
        candidate_channel: 'offline',
        merchant_quote_id: quote.id,
        selected_by_user_id: staff.auth_user_id,
        reason_summary: 'Best offline availability',
        option_label: 'Offline Choice'
    });
    console.log('[PASS] Shortlist item added');

    // 7. Move to Reporting
    await executeTransition('MOVE_TO_REPORTING', requestId, staff.id);
    let { data: r3 } = await db.from('requests').select('*').eq('id', requestId).single();
    if (r3.current_status !== 'reporting') throw new Error(`Status mismatch after MOVE_TO_REPORTING: ${r3.current_status}`);
    console.log('[PASS] MOVE_TO_REPORTING');

    // 8. Execute SIGNAL_READY (NO BYPASS)
    console.log('Executing SIGNAL_READY transition...');
    await executeTransition('SIGNAL_READY', requestId, staff.id);
    
    let { data: r4 } = await db.from('requests').select('*').eq('id', requestId).single();
    const state4 = resolveRequestState(r4);
    
    if (r4.current_status !== 'client_ready') throw new Error(`Status mismatch after SIGNAL_READY: ${r4.current_status}`);
    if (state4 !== 'READY') throw new Error(`State mismatch after SIGNAL_READY: ${state4}`);
    if (!r4.ready_entered_at) throw new Error('ready_entered_at is null after SIGNAL_READY');
    
    console.log('[PASS] SIGNAL_READY without bypass');

    // 9. Prepare Client Bundle
    reportId = crypto.randomUUID();
    await prepareRequestClientBundle({
      p_request_id: requestId,
      p_report_id: reportId,
      p_actor_user_id: staff.auth_user_id,
      p_note: 'E2E Test Bundle'
    });
    
    const { count: snapshotCount } = await db.from('report_option_snapshots').select('*', { count: 'exact', head: true }).eq('report_id', reportId);
    if ((snapshotCount ?? 0) === 0) throw new Error('No snapshots created in bundle');
    console.log(`[PASS] Bundle prepared (${snapshotCount} snapshots)`);

    // 10. Release to Customer
    await executeTransition('RELEASE_FINAL', requestId, staff.id, 'Releasing to customer for E2E test');
    
    let { data: uiStatus } = await db.from('v_request_ui_status').select('client_released_at').eq('request_id', requestId).single();
    if (!uiStatus?.client_released_at) throw new Error('client_released_at is null after RELEASE_FINAL');
    console.log('[PASS] RELEASE_FINAL');

    // 11. Customer Report Access
    const overview = await getCustomerRequestOverview(requestId, customer.auth_user_id);
    if (!overview) throw new Error('Customer cannot access report overview after release');
    console.log('[PASS] Customer report access');

    // 12. Reveal Option
    const { data: snapshot } = await db.from('report_option_snapshots').select('*').eq('report_id', reportId).limit(1).single();
    await unlockReportOption(snapshot.id, customer.auth_user_id);
    
    const { data: unlocked } = await db.from('report_option_snapshots').select('reveal_locked').eq('id', snapshot.id).single();
    if (unlocked.reveal_locked !== false) throw new Error('Reveal failed: reveal_locked is still true');
    console.log('[PASS] Reveal option');

    console.log('[VERDICT] SUCCESS: Full E2E journey passed without bypass.');

  } catch (err: any) {
    console.error('--- E2E STEP FAILED ---');
    console.error(`Step: ${err.message}`);
    console.error(`Request ID: ${requestId}`);
    
    if (requestId) {
        const { data: finalReq } = await db.from('requests').select('*').eq('id', requestId).single();
        console.error(`Current Status: ${finalReq?.current_status}`);
        console.error(`Canonical State: ${resolveRequestState(finalReq)}`);
    }
    
    console.error(`Database Error: ${err.message}`);
    console.error('Direct status bypass used: NO');
    process.exit(1);
  } finally {
    // 13. Cleanup (Archive)
    if (requestId) {
        console.log('Cleaning up: Archiving test request...');
        await db.from('requests').update({ is_archived: true, archived_at: new Date().toISOString(), archive_reason: 'E2E Test Cleanup' }).eq('id', requestId);
    }
  }
}

verifyE2E().catch(console.error);
