import { createAdminClient } from '../src/lib/dal/customers';

async function checkInfoSchema() {
    const db = await createAdminClient();
    const { data, error } = await db.rpc('get_functions'); // I'll just use a raw query if I could
    // Since I can't use raw query, I'll try to find a view that shows columns
    const { data: cols, error: err } = await db.from('request_status_history').select('*').limit(0);
    console.log('Columns from select:', Object.keys(cols?.[0] || {}));
}
// I'll use a different approach. I'll check if table_name should be lower case or something.
// Postgres usually stores them in lower case.
