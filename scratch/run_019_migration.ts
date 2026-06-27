import { createAdminClient } from '../src/lib/dal/customers';
import fs from 'fs';
import path from 'path';

async function run019Migration() {
    const db = await createAdminClient();
    const sqlPath = path.join(process.cwd(), '019_ai_control_panel.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing 019_ai_control_panel.sql...');
    const { data, error } = await db.rpc('fn_exec_sql', { p_sql: sql });
    if (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } else {
        console.log('Migration successful:', data);
        process.exit(0);
    }
}

run019Migration().catch(e => {
    console.error('Migration crashed:', e);
    process.exit(1);
});
