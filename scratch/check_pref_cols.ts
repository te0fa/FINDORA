import { createAdminClient } from '../src/lib/dal/customers';

async function main() {
    const db = await createAdminClient();
    const { data, error } = await db.from('request_preferences').select('*').limit(1);
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Columns in request_preferences:', Object.keys(data[0] || {}));
    }
}

main();
