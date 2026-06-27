import { createAdminClient } from '../src/lib/dal/customers';

async function main() {
    const db = await createAdminClient();
    const { data, error } = await db.from('requests').select('request_kind').limit(10);
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Sample request_kind values:', data.map(r => r.request_kind));
    }
}

main();
