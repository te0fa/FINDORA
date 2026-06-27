import { createAdminClient } from '../src/lib/dal/customers';

async function checkConstraints() {
    const db = await createAdminClient();
    const { data, error } = await db.rpc('fn_exec_sql', {
        p_sql: `
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'merchant_quotes'::regclass;
        `
    });

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Constraints:', data);
    }
}

checkConstraints();
