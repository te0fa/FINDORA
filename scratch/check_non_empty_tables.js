const { Client } = require('pg');

async function checkNonEmptyTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/postgres'
  });
  await client.connect();
  
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  console.log('--- Tables with Row Counts ---');
  for (const row of res.rows) {
    const tableName = row.table_name;
    try {
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${tableName}"`);
      const count = parseInt(countRes.rows[0].count, 10);
      if (count > 0) {
        console.log(`${tableName.padEnd(40)} : ${count} rows`);
      }
    } catch (e) {
      console.log(`${tableName.padEnd(40)} : Error (${e.message})`);
    }
  }
  
  await client.end();
}
checkNonEmptyTables().catch(console.error);
