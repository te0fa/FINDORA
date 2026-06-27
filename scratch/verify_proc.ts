import { createAdminClient } from '../src/lib/dal/customers';

async function verifyTransitionProc() {
    const db = await createAdminClient();
    try {
        const { data, error } = await db.rpc('fn_execute_request_transition', {
            p_transition_name: 'START_RESEARCH',
            p_request_id: '00000000-0000-0000-0000-000000000000',
            p_actor_staff_id: '00000000-0000-0000-0000-000000000000',
            p_notes: 'audit'
        });
        console.log('Result:', data, error?.message);
    } catch (e: any) {
        console.log('Caught Error:', e.message);
    }
}

verifyTransitionProc();
