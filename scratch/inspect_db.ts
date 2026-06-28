import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createAdminClient } from '../src/lib/supabase/admin'

async function inspect() {
  const db = createAdminClient()
  console.log("=== DB Inspection ===\n")

  const tables = ['vendors', 'merchants', 'merchant_profiles', 'vendor_profile_details', 'merchant_offers', 'vendor_bids']
  for (const t of tables) {
    try {
      const { data, error, count } = await db.from(t).select('*', { count: 'exact', head: false }).limit(1)
      if (error) {
        console.log(`Table ${t}: Error / Not found: ${error.message}`)
      } else {
        console.log(`Table ${t}: EXISTS! Count: ${count}`)
        if (data && data.length > 0) {
          console.log(`Columns in ${t}:`, Object.keys(data[0]))
        } else {
          console.log(`Table ${t} has 0 rows, let's query columns via RPC or catalog if possible.`)
        }
      }
    } catch (e: any) {
      console.log(`Table ${t}: Exception: ${e.message}`)
    }
  }

  // Query database schema information for columns of these tables
  console.log("\n--- Detailed Columns via query ---\n")
  try {
    // We can query pg_attribute or information_schema if we have access via RPC or custom queries.
    // Let's see if we can do a query on RPC or if we can run direct SQL.
    // Since we don't have direct SQL runner RPC, let's see if we can use postgres client if DATABASE_URL or direct connection is in env.
    const pgUrl = process.env.DATABASE_URL
    if (pgUrl) {
      const { Client } = require('pg')
      const client = new Client({ connectionString: pgUrl })
      await client.connect()
      console.log("Connected directly to PostgreSQL via DATABASE_URL.")
      for (const t of tables) {
        const res = await client.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [t])
        console.log(`\nColumns for table: ${t}`)
        res.rows.forEach((row: any) => {
          console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
        })
      }
      await client.end()
    } else {
      console.log("No DATABASE_URL in .env.local, cannot run pg query directly.")
    }
  } catch (err: any) {
    console.error("Direct connection error:", err.message)
  }
}

inspect().catch(console.error)
