// scratch/apply_rate_limit_migration.ts
import { createClient } from '@supabase/supabase-js'
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  const migrationFile = '018_rate_limit_tracking.sql'
  const filePath = path.join(process.cwd(), 'supabase/migrations', migrationFile)

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
  const sql = fs.readFileSync(filePath, 'utf8')

  // List of connection options to try
  const pgConnections = [
    process.env.DATABASE_URL,
    'postgresql://postgres:postgres@localhost:5432/postgres',
    'postgresql://postgres:postgres@localhost:54322/postgres'
  ].filter(Boolean) as string[]

  let applied = false

  // Try direct Postgres connection first
  for (const connStr of pgConnections) {
    console.log(`Attempting direct pg connection on: ${connStr.replace(/:[^:@/]+@/, ':***@')}...`)
    try {
      const client = new Client({ connectionString: connStr })
      await client.connect()
      await client.query(sql)
      console.log(`✅ SUCCESS: Applied ${migrationFile} via direct pg client!`)
      await client.end()
      applied = true
      break
    } catch (err: any) {
      console.log(`❌ Connection failed: ${err.message}`)
    }
  }

  // Fallback to Supabase RPCs if direct pg failed
  if (!applied && url && key) {
    console.log('\nDirect connections failed. Falling back to Supabase RPC APIs...')
    const db = createClient(url, key)
    const possibleRpcs = ['execute_sql_query', 'fn_exec_sql', 'fn_execute_sql', 'execute_sql', 'run_sql', 'exec_sql', 'fn_execute_query', 'fn_run_sql']
    const argNames = ['sql', 'p_sql', 'query']

    for (const rpcName of possibleRpcs) {
      for (const argName of argNames) {
        console.log(`Trying RPC: ${rpcName} with arg: ${argName}...`)
        try {
          const { data, error } = await db.rpc(rpcName, { [argName]: sql })
          if (!error) {
            console.log(`✅ SUCCESS: Applied ${migrationFile} via RPC ${rpcName} (${argName})!`)
            applied = true
            break
          } else {
            console.log(`❌ RPC ${rpcName} (${argName}) error: ${error.message.slice(0, 100)}`)
          }
        } catch (err: any) {
          console.log(`❌ RPC ${rpcName} (${argName}) exception: ${err.message.slice(0, 100)}`)
        }
      }
      if (applied) break
    }
  }

  if (!applied) {
    console.error(`Failed to apply ${migrationFile} via any method.`)
    process.exit(1)
  }
}

run().catch(console.error)
