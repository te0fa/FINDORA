import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function probe() {
    const commonNames = [
        'exec_sql', 'execute_sql', 'run_sql', 'sql', 'query', 'exec', 
        'fn_exec_sql', 'fn_execute_sql', 'fn_run_sql', 'fn_sql', 
        'execute_sql_query', 'execute_sql_internal', 'run_sql_query',
        'exec_query', 'execute_query', 'run_query', 'fn_execute_query',
        'apply_migration', 'migrate', 'db_migrate', 'run_migration'
    ];

    console.log('Probing for SQL RPCs...');
    for (const name of commonNames) {
        const { error } = await supabase.rpc(name, { p_sql: 'SELECT 1', sql: 'SELECT 1', query: 'SELECT 1', sql_query: 'SELECT 1' });
        if (error) {
            if (error.message.includes('Could not find the function')) {
                // do nothing
            } else {
                console.log(`[POSSIBLE] ${name}: ${error.message}`);
            }
        } else {
            console.log(`[FOUND!] ${name}: Success!`);
        }
    }
}

probe();
