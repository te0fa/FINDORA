// scratch/find_tables.ts
import { Client } from 'pg'

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' })
  await client.connect()
  try {
    const tables = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema');
    `)
    console.log('Available tables count:', tables.rows.length)
    console.log('Tables:', tables.rows.map(r => `${r.table_schema}.${r.table_name}`))
  } catch (err: any) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}
main()
