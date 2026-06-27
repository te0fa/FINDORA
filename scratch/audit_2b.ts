import { createAdminClient } from '../src/lib/dal/customers';

async function auditFoundation() {
    const db = await createAdminClient();

    console.log('--- 1. FOUNDATION COMPONENT AUDIT ---');

    // 1.1 fn_execute_request_transition
    const { data: proc1, error: err1 } = await db.rpc('get_functions').eq('name', 'fn_execute_request_transition');
    console.log('fn_execute_request_transition exists:', !err1 && (proc1?.length || 0) > 0);

    // 1.2 fn_resolve_canonical_state
    const { data: proc2, error: err2 } = await db.rpc('get_functions').eq('name', 'fn_resolve_canonical_state');
    console.log('fn_resolve_canonical_state exists:', !err2 && (proc2?.length || 0) > 0);

    // 1.3 v_request_timeline
    const { data: view1, error: err3 } = await db.from('v_request_timeline').select('*').limit(1);
    console.log('v_request_timeline is accessible:', !err3);

    // 1.4 request_status_history columns
    const { data: historyRow, error: err4 } = await db.from('request_status_history').select('*').limit(1);
    const historyCols = Object.keys(historyRow?.[0] || {});
    const requiredHistoryCols = ['from_canonical_state', 'to_canonical_state', 'transition_name', 'event_source', 'metadata'];
    console.log('Missing history columns:', requiredHistoryCols.filter(c => !historyCols.includes(c)));

    // 1.5 requests stage columns
    const { data: requestRow, error: err5 } = await db.from('requests').select('*').limit(1);
    const requestCols = Object.keys(requestRow?.[0] || {});
    const stageCols = ['operations_entered_at', 'reporting_entered_at', 'ready_entered_at'];
    console.log('Missing stage columns:', stageCols.filter(c => !requestCols.includes(c)));

    console.log('\n--- 2. BUSINESS LOGIC AUDIT ---');

    // 2.1 urgency_level values
    // In Postgres, check for CHECK constraints or just sample
    // Since I can't check constraints easily via RPC, I'll check what's in the DB
    const { data: prefs, error: err6 } = await db.from('request_preferences').select('urgency_level').limit(100);
    const uniqueUrgency = [...new Set(prefs?.map(p => p.urgency_level).filter(Boolean))];
    console.log('Detected urgency_level values:', uniqueUrgency);

    // 2.2 Operational Ownership (jobs vs v_staff_job_queue)
    // I'll check which one the code uses and what the view contains
    const { data: jobQueueCols, error: err7 } = await db.from('v_staff_job_queue').select('*').limit(1);
    console.log('v_staff_job_queue columns:', Object.keys(jobQueueCols?.[0] || {}));

    // 2.3 Legacy null transitions
    const { data: nullTransitions, error: err8 } = await db.from('request_status_history').select('id').is('transition_name', null).limit(10);
    console.log('Legacy null transition rows count (sample):', nullTransitions?.length || 0);

}

// I need get_functions RPC to work, or I'll use another way to check procs
// I'll just try to call them and catch errors if missing
async function auditProcs() {
    const db = await createAdminClient();
    try {
        await db.rpc('fn_resolve_canonical_state', {
            p_is_archived: false,
            p_current_status: 'submitted',
            p_reviewer_decision: null,
            p_client_released_at: null
        });
        console.log('fn_resolve_canonical_state: OK');
    } catch (e: any) {
        console.log('fn_resolve_canonical_state: FAILED ->', e.message);
    }
}

auditFoundation().then(() => auditProcs());
