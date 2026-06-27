// scratch/check_ai_migration_status_v2.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createAdminClient } from '../src/lib/dal/customers'

async function checkStatus() {
  const db = await createAdminClient()
  
  console.log('Checking ai_agent_configs...')
  const { data, error } = await db.from('ai_agent_configs').select('id').limit(1)
  if (error) {
    console.log(`❌ ai_agent_configs error: ${error.message} (Code: ${error.code})`)
  } else {
    console.log('✅ ai_agent_configs table exists and is accessible.')
  }

  console.log('Checking ai_copilot_runs...')
  const { error: error2 } = await db.from('ai_copilot_runs').select('id').limit(1)
  if (error2) {
    console.log(`❌ ai_copilot_runs error: ${error2.message} (Code: ${error2.code})`)
  } else {
    console.log('✅ ai_copilot_runs table exists and is accessible.')
  }
}

checkStatus().catch(console.error)
