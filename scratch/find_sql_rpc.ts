import { createAdminClient } from '../src/lib/dal/customers';

async function findSqlRpc() {
    const db = await createAdminClient();
    
    console.log(`Trying fn_execute_sql with sql_query...`);
    const { data, error } = await db.rpc('fn_execute_sql', { sql_query: 'SELECT 1 as val' });
    if (error) {
        console.log(`  Failed: ${error.message}`);
    } else {
        console.log(`  Success! Returned:`, data);
    }
}

findSqlRpc();
