// scratch/reload_schema.ts
import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  const connStr = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
  console.log(`Connecting to: ${connStr.replace(/:[^:@/]+@/, ':***@')}...`)
  try {
    const client = new Client({ connectionString: connStr })
    await client.connect()
    await client.query("NOTIFY pgrst, 'reload schema';")
    console.log("✅ SUCCESS: Sent NOTIFY pgrst, 'reload schema';")
    await client.end()
  } catch (err: any) {
    console.error(`❌ Failed: ${err.message}`)
  }
}

run().catch(console.error)
