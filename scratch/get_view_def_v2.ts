import { createAdminClient } from '../src/lib/dal/customers';

async function main() {
    const db = await createAdminClient();
    const { data, error } = await db.rpc('fn_exec_sql', { 
        p_sql: "SELECT definition FROM pg_views WHERE viewname = 'v_request_ui_status'" 
    });
    
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('View Definition:', data?.[0]?.definition);
    }
}

main();
