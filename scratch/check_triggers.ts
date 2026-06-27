import { createAdminClient } from '../src/lib/dal/customers';

async function main() {
    const db = await createAdminClient();
    const { data, error } = await db.rpc('fn_exec_sql', { 
        p_sql: "SELECT tgname FROM pg_trigger WHERE tgrelid = 'requests'::regclass" 
    });
    
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Triggers on requests:', data);
    }
}

main();
