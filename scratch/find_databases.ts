// scratch/find_databases.ts
import { Client } from 'pg'

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' })
  await client.connect()
  try {
    const dbs = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;')
    console.log('Available databases:', dbs.rows.map(r => r.datname))
  } catch (err: any) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}
main()
