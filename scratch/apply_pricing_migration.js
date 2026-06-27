// scratch/apply_pricing_migration.js
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function apply() {
  console.log('Env URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Env Key:', process.env.SUPABASE_SECRET_KEY ? 'present' : 'missing')
  
  // Construct DATABASE_URL using the standard Supabase connection string format
  // if not explicitly defined in the environment.
  // Standard format: postgres://postgres.[project_ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  // Let's check if DATABASE_URL is defined:
  let connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    // If not in env, we can construct the direct connection or transaction pooler if we know the password.
    // Wait, the project ref is 'knsjvttjkbdztxmtjxpz'.
    // Let's check if the password is known or if we can read it from any other files.
    console.error('DATABASE_URL is missing')
  }

  if (!connectionString) {
    // Let's try to connect to the local postgres or check if there is an alternative connection string
    console.log('Attempting connection string construction...')
    // Usually the DB password in these test environments is 'postgres' or similar, let's check
    connectionString = 'postgresql://postgres:postgres@localhost:54322/postgres'
  }

  console.log('Connecting using:', connectionString)
  const client = new Client({ connectionString })
  await client.connect()

  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260529000000_pricing_lifecycle_system.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Applying pricing migration...')
    await client.query(sql)
    console.log('✅ Pricing migration applied successfully.')
  } catch (err) {
    console.error('❌ Failed to apply migration:', err)
  } finally {
    await client.end()
  }
}

apply().catch(console.error)
