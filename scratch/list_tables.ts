import { Client } from 'pg';

const connectionStrings = [
  'postgresql://postgres:123456@localhost:5432/postgres',
  'postgresql://postgres:postgres@localhost:5432/postgres',
  'postgresql://postgres:postgres@localhost:54322/postgres'
];

async function listTables() {
  for (const connStr of connectionStrings) {
    console.log(`\nChecking: ${connStr.replace(/:[^:@/]+@/, ':***@')}...`);
    const client = new Client({ connectionString: connStr });

    try {
      await client.connect();
      const res = await client.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
      `);
      console.log(`Success! Tables count: ${res.rows.length}`);
      console.log('Tables:', res.rows.map(r => `${r.table_schema}.${r.table_name}`));
      await client.end();
    } catch (err: any) {
      console.error('Error:', err.message);
    }
  }
}

listTables();
