import { createAdminClient } from '../src/lib/dal/customers';
import fs from 'fs';
import path from 'path';

async function tryExecSql() {
    const db = await createAdminClient();
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260502010101_request_history_v7.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Trying fn_exec_sql...');
    const { data, error } = await db.rpc('fn_exec_sql', { p_sql: sql });
    if (error) {
        console.log('fn_exec_sql failed:', error.message);
    } else {
        console.log('fn_exec_sql success:', data);
    }
}

tryExecSql();

