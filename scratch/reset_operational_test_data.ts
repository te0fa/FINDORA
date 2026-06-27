import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// 1. Confirm CLI flag
if (!process.argv.includes('--confirm-full-test-reset')) {
  console.error('❌ Error: Missing --confirm-full-test-reset flag. Operational reset aborted.')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

if (!url || !key) {
  console.error('❌ Error: Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// Deletion order to respect Foreign Key constraints perfectly
const operationalTables = [
  'shortlist_items',
  'request_candidate_shortlists',
  'source_reveals',
  'payment_audit_events',
  'payment_intents',
  'payments',
  'report_option_snapshots',
  'reports',
  'merchant_performance_events',
  'merchant_quotes',
  'outbound_messages',
  'platform_events',
  'customer_intelligence_events',
  'request_status_history',
  'request_preferences',
  'research_items',
  'research_runs',
  'requests',
  'communication_preferences',
  'customer_score_snapshots',
  'customer_segments',
  'customer_communications',
  'customers',
  'ai_copilot_runs'
]

async function getCount(tableName: string): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
  if (error) return 0
  return count || 0
}

async function clearTable(tableName: string): Promise<boolean> {
  console.log(`Clearing table public."${tableName}"...`)
  
  // Try generic UUID filter first
  let { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  // If failed (e.g. integer primary key), try integer filter
  if (error) {
    const intRes = await supabase
      .from(tableName)
      .delete()
      .gte('id', 0)
    error = intRes.error
  }

  // Fallback: Fetch all rows and delete individually if filters fail
  if (error) {
    const { data: rows } = await supabase.from(tableName).select('*').limit(1000)
    if (rows && rows.length > 0) {
      console.log(`[Fallback] Individually deleting ${rows.length} rows from "${tableName}"...`)
      for (const row of rows) {
        const pk = row.id !== undefined ? 'id' : Object.keys(row)[0]
        const { error: delErr } = await supabase
          .from(tableName)
          .delete()
          .eq(pk, row[pk])
        if (delErr) {
          console.error(`❌ Failed to delete row ${pk}=${row[pk]} from "${tableName}":`, delErr.message)
          return false
        }
      }
      return true
    }
  }

  if (error) {
    console.error(`❌ Failed to clear "${tableName}":`, error.message)
    return false
  }

  return true
}

async function runReset() {
  console.log('========================================================================')
  console.log('                 RESETTING OPERATIONAL DEV/TEST DATA                    ')
  console.log('========================================================================')

  const beforeCounts: Record<string, number> = {}
  
  // 1. Gather Before Counts
  console.log('Gathering initial row counts...')
  for (const table of operationalTables) {
    beforeCounts[table] = await getCount(table)
  }

  // 2. Perform Deletions in FK-safe Order
  console.log('\nExecuting deletion sequence...')
  for (const table of operationalTables) {
    if (beforeCounts[table] > 0) {
      const success = await clearTable(table)
      if (!success) {
        console.error(`❌ Reset process halted due to failure in table: ${table}`)
        process.exit(1)
      }
    } else {
      console.log(`Table "${table}" is already empty. Skipping delete.`)
    }
  }

  // 3. Gather After Counts & Validate
  console.log('\nVerifying post-reset state...')
  let failures = 0
  const afterCounts: Record<string, number> = {}
  
  for (const table of operationalTables) {
    const count = await getCount(table)
    afterCounts[table] = count
    if (count > 0) {
      console.error(`❌ Verification Failed: Table "${table}" still has ${count} rows!`)
      failures++
    } else {
      console.log(`✅ Table "${table}" is confirmed clean (0 rows).`)
    }
  }

  console.log('\n========================================================================')
  console.log('                           RESET SUMMARY                                ')
  console.log('========================================================================')
  console.log('Table Name                     | Before Reset | After Reset | Status')
  console.log('------------------------------------------------------------------------')
  for (const table of operationalTables) {
    const status = afterCounts[table] === 0 ? 'CLEANED' : 'FAILED'
    console.log(`${table.padEnd(30)} | ${String(beforeCounts[table]).padEnd(12)} | ${String(afterCounts[table]).padEnd(11)} | ${status}`)
  }
  console.log('========================================================================')

  if (failures > 0) {
    console.error(`\n❌ Operational data reset failed verification with ${failures} errors.`)
    process.exit(1)
  } else {
    console.log('\n🎉 ALL OPERATIONAL TABLES CONFIRMED CLEAN! SYSTEM IS READY.')
  }
}

runReset().catch(console.error)
