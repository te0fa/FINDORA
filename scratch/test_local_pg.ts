import { Client } from 'pg';

async function listTables() {
    const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/postgres' });
    try {
        await client.connect();
        
        // List databases
        const dbs = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.log('Databases:', dbs.rows.map(r => r.datname));

        // List tables in current db
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        console.log('Tables in postgres:', res.rows.map(r => r.table_name));

        await client.end();
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

listTables();
