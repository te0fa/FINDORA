import { createAdminClient } from '../src/lib/dal/customers';

async function checkNewColumns() {
    const db = await createAdminClient();
    const { data, error } = await db.from('request_status_history').select('*').limit(1);
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

checkNewColumns();
