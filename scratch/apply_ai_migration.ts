// scratch/apply_ai_migration.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

async function apply() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is missing')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260508190000_batch_7b_ai_control_center.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Applying migration Batch 7B...')
    await client.query(sql)
    console.log('✅ Migration applied successfully.')
  } catch (err) {
    console.error('❌ Failed to apply migration:', err)
  } finally {
    await client.end()
  }
}

apply().catch(console.error)
