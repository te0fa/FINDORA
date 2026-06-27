import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function runAudit() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Secret Key')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const tables = [
    'products',
    'marketplace_products',
    'wallet_transactions',
    'request_status_history',
    'rate_limit_logs',
    'fraud_audit_log'
  ]

  console.log('--- Table Count Audit ---')
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`Table "${table}": Error fetching count - ${error.message}`)
    } else {
      console.log(`Table "${table}": ${count} rows`)
    }
  }
}

runAudit()
