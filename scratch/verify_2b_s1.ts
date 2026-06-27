import { createAdminClient } from '../src/lib/dal/customers';
import { getRequestStageClock } from '../src/lib/dal/performance';

async function verifyStageClock() {
    const db = await createAdminClient();

    // 1. Find an active request
    const { data: request, error: reqErr } = await db
        .from('requests')
        .select('id, request_code, current_status, reviewer_decision')
        .eq('is_archived', false)
        .neq('current_status', 'closed')
        .limit(1)
        .single();

    if (reqErr || !request) {
        console.log('No active request found for verification.');
        return;
    }

    console.log(`Verifying Stage Clock for: ${request.request_code} (${request.id})`);
    console.log(`Current Status: ${request.current_status}, Decision: ${request.reviewer_decision}`);

    const clock = await getRequestStageClock(request.id);
    if (!clock) {
        console.log('FAILED: Could not retrieve stage clock. Migration might not be applied.');
        return;
    }

    console.log('\n--- STAGE CLOCK METRICS ---');
    console.log(`Canonical State: ${clock.canonical_state}`);
    console.log(`Stage Code:      ${clock.current_stage_code}`);
    console.log(`Entered At:      ${clock.current_stage_entered_at}`);
    console.log(`Last Activity:   ${clock.last_transition_at}`);
    console.log(`Age (Minutes):   ${clock.stage_age_minutes?.toFixed(2) || 'N/A'}`);
    console.log(`Active Work:     ${clock.is_active_work}`);

    // Verification check
    if (clock.is_active_work && clock.current_stage_entered_at) {
        console.log('\nSUCCESS: Active work clock is running.');
    } else if (!clock.is_active_work && ['completed', 'archived'].includes(clock.current_stage_code)) {
        console.log('\nSUCCESS: Terminal state clock is stopped (NULL).');
    } else {
        console.log('\nWARNING: Unexpected clock state.');
    }
}

verifyStageClock();
