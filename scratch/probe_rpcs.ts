import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/dal/customers';

async function probe() {
    const db = await createAdminClient();
    const commonNames = [
        'exec_sql', 'execute_sql', 'run_sql', 'sql', 'query', 'exec', 
        'fn_exec_sql', 'fn_execute_sql', 'fn_run_sql', 'fn_sql', 
        'execute_sql_query', 'execute_sql_internal', 'run_sql_query',
        'exec_query', 'execute_query', 'run_query', 'fn_execute_query',
        'apply_migration', 'migrate', 'db_migrate', 'run_migration'
    ];

    console.log('Probing for SQL RPCs...');
    for (const name of commonNames) {
        const { error } = await db.rpc(name, { p_sql: 'SELECT 1', sql: 'SELECT 1', query: 'SELECT 1', sql_query: 'SELECT 1' });
        if (error) {
            if (error.message.includes('Could not find the function')) {
                console.log(`[NOT FOUND] ${name}`);
            } else {
                console.log(`[POSSIBLE] ${name}: ${error.message}`);
            }
        } else {
            console.log(`[FOUND!] ${name}: Success!`);
        }
    }
}

probe();
