// scratch/verify_batch_7b2_real_gemini_runtime.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import * as AIControl from '../src/lib/dal/ai-control'
import * as Copilot from '../src/lib/ai/findora-copilot'
import { getAIConfig } from '../src/lib/ai/provider'
import { createAdminClient } from '../src/lib/dal/customers'

async function runVerification() {
  console.log('--- BATCH 7B.2: REAL GEMINI RUNTIME VERIFIER ---')

  const db = await createAdminClient()

  // TASK A & B: Verify tables and seed defaults
  console.log('Verifying DB tables and seeding defaults...')
  const { error: tableError } = await db.from('ai_agent_configs').select('id').limit(1)
  if (tableError) {
    console.log(`⚠️ ai_agent_configs check failed: ${tableError.message}. Code: ${tableError.code}`)
    if (tableError.code === 'PGRST205') {
       console.log('❌ MIGRATION NOT APPLIED. STOPPING.')
       return
    }
  }

  const agentsToEnable = [
    'intake_reviewer', 'pricing_advisor', 'research_planner', 'trust_safety_checker'
  ]
  const agentsToDisable = [
    'research_retriever', 'report_writer', 'communication_drafter', 'dashboard_insights'
  ]

  const env = getAIConfig()
  console.log(`AI_ENABLED: ${env.enabled}`)
  console.log(`AI_PROVIDER: ${env.provider}`)
  console.log(`AI_MODEL: ${env.model}`)
  console.log(`HAS_API_KEY: ${!!env.apiKey}`)

  if (!env.enabled) {
    console.log('⚠️ AI_ENABLED is false. Temporarily overriding for smoke test...')
    process.env.AI_ENABLED = 'true'
  }

  console.log('Seeding agent configs...')
  for (const agent of [...agentsToEnable, ...agentsToDisable]) {
    const isEnabled = agentsToEnable.includes(agent)
    await AIControl.updateAIAgentConfigAdmin({
      agent_code: agent,
      enabled: isEnabled,
      provider: isEnabled ? 'gemini' : 'disabled',
      model: isEnabled ? (process.env.AI_MODEL || 'gemini-1.5-flash') : null,
      temperature: 0.2,
      safety_level: 'strict'
    })
  }
  console.log('✅ Default agent configs seeded.')

  // TASK D: Real Harmless Gemini Smoke Test
  console.log('Running harmless Gemini smoke test (intake_reviewer)...')
  try {
    const res = await Copilot.analyzeRequestIntake({
      title: 'Looking for high-quality sustainable cotton fabrics',
      description: 'I need 500 meters of organic GOTS certified cotton, white color, for a fashion project in Cairo.',
      language: 'en'
    })

    if (res.error) {
      console.log(`❌ Smoke test returned error: ${res.error}`)
    } else {
      console.log('✅ Smoke test response received!')
      console.log('Summary:', res.summary)
      console.log('Risks:', res.risks)
      
      // Verification of safety rules
      if (JSON.stringify(res).includes('SECRET') || JSON.stringify(res).includes('hidden_')) {
         console.log('❌ FAIL: Hidden data leak suspected in AI response.')
      } else {
         console.log('✅ No obvious data leaks detected.')
      }
    }
  } catch (err: any) {
    console.log(`❌ Smoke test crashed: ${err.message}`)
  }

  // Final check: logging
  console.log('Checking if run was logged...')
  const runs = await AIControl.getAICopilotRunsAdmin(5)
  const intakeRun = runs.find(r => r.agent_code === 'intake_reviewer')
  if (intakeRun) {
    console.log(`✅ Found log for intake_reviewer (Status: ${intakeRun.status})`)
  } else {
    console.log('❌ FAIL: No log entry found for the smoke test.')
  }

  console.log('--- VERIFICATION COMPLETE ---')
}

runVerification().catch(err => {
  console.error('Verification failed:', err)
  process.exit(1)
})
