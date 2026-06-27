import { createAdminClient } from '../src/lib/dal/customers';

async function getFunc(funcName: string) {
    const db = await createAdminClient();
    const { data, error } = await db.rpc('fn_exec_sql', {
        p_sql: `
            SELECT pg_get_functiondef(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE p.proname = '${funcName}';
        `
    });

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Function Definition:', data[0]?.pg_get_functiondef);
    }
}

getFunc('fn_execute_request_transition');
