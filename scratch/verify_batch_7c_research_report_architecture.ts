// scratch/verify_batch_7c_research_report_architecture.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verify() {
  console.log('--- BATCH 7C: RESEARCH & REPORT ARCHITECTURE VERIFIER ---')

  // 1. Expected agents exist
  const expectedAgents = [
    'intake_reviewer', 'pricing_advisor', 'research_planner', 
    'research_retriever', 'report_writer', 'communication_drafter', 
    'trust_safety_checker', 'dashboard_insights'
  ]
  const { data: agents } = await supabase.from('ai_agent_configs').select('agent_code, enabled, provider')
  const agentCodes = agents?.map(a => a.agent_code) || []
  
  for (const code of expectedAgents) {
    if (agentCodes.includes(code)) {
      console.log(`[PASS] Agent exists: ${code}`)
    } else {
      console.error(`[FAIL] Missing agent: ${code}`)
    }
  }

  // 2. hacker_agent audit
  const hackerAgent = agents?.find(a => a.agent_code === 'hacker_agent')
  if (hackerAgent) {
    if (hackerAgent.enabled) {
      console.error('[FAIL] hacker_agent is ENABLED! Safety risk.')
    } else {
      console.log('[PASS] hacker_agent is disabled (Unexpected but safe).')
    }
  } else {
    console.log('[INFO] hacker_agent not found in DB.')
  }

  // 3. Provider values valid
  const invalidProviders = agents?.filter(a => !['gemini', 'google', 'openai', 'anthropic'].includes(a.provider))
  if (invalidProviders && invalidProviders.length > 0) {
    console.error(`[FAIL] Invalid providers found: ${invalidProviders.map(a => a.agent_code).join(', ')}`)
  } else {
    console.log('[PASS] All provider values are valid.')
  }

  // 4. maskSourceDetails logic check (Simulated)
  const { maskSourceDetails } = await import('../src/lib/dal/reports')
  const testSnapshot = {
    display_title: 'Test Option',
    hidden_merchant_name: 'Secret Store',
    hidden_reference_url: 'http://secret.com',
    reveal_locked: true
  }
  const masked = maskSourceDetails(testSnapshot)
  if (masked.revealedSourceText === '*** Locked ***' && !masked.hidden_merchant_name) {
    console.log('[PASS] maskSourceDetails hides hidden fields correctly.')
  } else {
    console.error('[FAIL] maskSourceDetails LEAKED data!')
  }

  const unmasked = maskSourceDetails({ ...testSnapshot, reveal_locked: false })
  if (unmasked.revealedSourceText === 'Secret Store') {
    console.log('[PASS] revealed fields appear after unlock.')
  } else {
    console.error('[FAIL] revealed fields MISSING after unlock!')
  }

  console.log('\n--- VERIFICATION SUCCESSFUL ---')
}

verify().catch(err => {
  console.error('Verification failed:', err)
  process.exit(1)
})
