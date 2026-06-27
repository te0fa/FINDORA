import { Client } from 'pg';

async function listTables(dbName: string, password: string) {
  const client = new Client({ connectionString: `postgresql://postgres:${password}@localhost:5432/${dbName}` });
  try {
    await client.connect();
    console.log(`Connected to local ${dbName} database!`);
    const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    `);
    console.log(`Tables in ${dbName}:`, res.rows.map(r => r.table_name));
  } catch (err: any) {
    console.error(`Error on local ${dbName}:`, err.message);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

async function main() {
  await listTables('postgres', 'postgres');
  await listTables('tradeora', '123456');
}
main();
