import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TABLES = [
  'ai_copilot_runs',
  'customer_intelligence_events',
  'customer_score_snapshots',
  'customer_segments',
  'communication_preferences',
  'merchant_customer_feedback',
  'merchant_performance_events',
  'merchant_score_snapshots',
  'merchant_quotes',
  'outbound_messages',
  'payment_audit_events',
  'payment_intents',
  'platform_events',
  'request_candidate_shortlists',
  'request_preferences',
  'request_status_history',
  'research_items',
  'research_runs',
  'jobs',
  'source_reveals',
  'requests',
  'customers'
]

async function runAudit() {
  console.log('==================================================')
  console.log('   FINDORA OPERATIONAL DATA RESET AUDIT (DRY-RUN) ')
  console.log('==================================================')
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log('--------------------------------------------------')

  let totalRows = 0

  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`❌ Table: ${table.padEnd(30)} | Error: ${error.message}`)
    } else {
      console.log(`📊 Table: ${table.padEnd(30)} | Rows: ${count ?? 0}`)
      totalRows += (count ?? 0)
    }
  }

  console.log('--------------------------------------------------')
  console.log(`Total operational rows to reset: ${totalRows}`)
  console.log('==================================================')
}

runAudit()
