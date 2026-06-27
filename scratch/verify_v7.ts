import { createAdminClient } from '../src/lib/dal/customers';
import { executeTransition } from '../src/lib/dal/transitions';
import { getRequestTimeline } from '../src/lib/dal/timeline';

async function verify() {
    const db = await createAdminClient();

    // 1) هات Request يكون فعلاً Canonical INTAKE
    const { data: request, error: reqError } = await db
        .from('requests')
        .select('id, request_code, current_status, reviewer_decision, is_archived')
        .in('current_status', ['submitted', 'open'])
        .is('reviewer_decision', null)
        .eq('is_archived', false)
        .limit(1)
        .single();

    if (reqError || !request) {
        console.log('No canonical INTAKE request found for testing.');
        console.log('Need a request with: current_status in (submitted, open), reviewer_decision = null, is_archived = false');
        return;
    }

    console.log(`Testing with request: ${request.id} (${request.request_code})`);
    console.log('Initial state:', request);

    // 2) هات Admin
    const { data: staff, error: staffError } = await db
        .from('staff_members')
        .select('id, full_name, staff_role')
        .eq('staff_role', 'admin')
        .limit(1)
        .single();

    if (staffError || !staff) {
        console.log('No admin staff found.');
        return;
    }

    console.log(`Using admin: ${staff.full_name ?? staff.id}`);

    // 3) CLARIFY_INTAKE
    console.log('\nTesting CLARIFY_INTAKE...');
    const res1 = await executeTransition(
        'CLARIFY_INTAKE',
        request.id,
        staff.id,
        'Test clarification from verify_v7'
    );
    console.log('Result:', JSON.stringify(res1));

    // 4) RESOLVE_ISSUE
    console.log('\nTesting RESOLVE_ISSUE...');
    const res2 = await executeTransition(
        'RESOLVE_ISSUE',
        request.id,
        staff.id,
        'Test resolve from verify_v7'
    );
    console.log('Result:', JSON.stringify(res2));

    // 5) جرّب transition غلط intentionally
    console.log('\nTesting invalid transition: REVERT_TO_OPS on INTAKE...');
    try {
        await executeTransition('REVERT_TO_OPS', request.id, staff.id);
        console.log('ERROR: REVERT_TO_OPS unexpectedly succeeded.');
    } catch (err: any) {
        console.log('PASS (expected failure):', err.message);
    }

    // 6) اقرأ timeline من الـ view
    console.log('\nVerifying Timeline...');
    const timeline = await getRequestTimeline(request.id);

    console.log(`Timeline events count: ${timeline.length}`);
    for (const [i, e] of timeline.entries()) {
        console.log(
            `[${i}] ${e.event_at} | ${e.transition_name} | ${e.from_canonical_state} -> ${e.to_canonical_state}`
        );
    }

    // 7) اقرأ آخر history rows من الجدول نفسه
    const { data: historyRows, error: historyError } = await db
        .from('request_status_history')
        .select('created_at, transition_name, from_canonical_state, to_canonical_state, changed_by_staff_id, change_reason')
        .eq('request_id', request.id)
        .not('transition_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

    if (historyError) {
        console.log('History read error:', historyError.message);
        return;
    }

    console.log('\nRecent transition history rows:');
    console.log(JSON.stringify(historyRows, null, 2));
}

verify().catch((err) => {
    console.error('VERIFY FAILED:', err.message);
    process.exit(1);
});