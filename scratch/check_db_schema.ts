import { createAdminClient } from '../src/lib/dal/customers';

async function checkDbSchema() {
    const db = await createAdminClient();
    
    // Select one row from economy_config to see what columns it returns
    console.log('Fetching a row from economy_config...');
    const { data, error } = await db.from('economy_config').select('*').limit(1);
    if (error) {
        console.error('Error fetching economy_config:', error.message);
    } else {
        console.log('Columns in economy_config:', Object.keys(data[0] || {}));
        console.log('Sample row:', data[0]);
    }
}

checkDbSchema();
