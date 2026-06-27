import { createAdminClient } from '../src/lib/dal/customers';

async function listFunctions() {
    const db = await createAdminClient();
    const { data, error } = await db.rpc('get_functions'); // Standard Supabase doesn't have this, but worth a shot
    if (error) {
        console.log('Error listing functions:', error.message);
        // Fallback: try to query information_schema if possible via a view or RPC
    } else {
        console.log('Functions:', data);
    }
}

listFunctions();
