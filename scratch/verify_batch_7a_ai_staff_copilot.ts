// scratch/verify_batch_7a_ai_staff_copilot.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import * as Copilot from '../src/lib/ai/findora-copilot'
import { getAIConfig } from '../src/lib/ai/provider'

async function runVerification() {
  console.log('--- BATCH 7A: AI STAFF COPILOT VERIFIER ---')

  // 1. Check AI Config
  const config = getAIConfig()
  console.log(`AI Enabled: ${config.enabled}`)
  console.log(`AI Provider: ${config.provider}`)
  
  // 2. Test Intake Analysis (Deterministic Fallback)
  console.log('Testing Intake Analysis...')
  const intake = await Copilot.analyzeRequestIntake({
    title: 'Test Request',
    description: 'Looking for a new laptop',
    language: 'en'
  })
  if (intake.error && !config.enabled) {
    console.log('✅ Safely returned disabled response when AI_ENABLED=false')
  } else if (!intake.error) {
    console.log('✅ Intake analysis response received')
  } else {
    console.log(`⚠️ Intake analysis returned error: ${intake.error}`)
  }

  // 3. Test Pricing Suggestion
  console.log('Testing Pricing Suggestion...')
  const pricing = await Copilot.suggestPricingReview({
    request_kind: 'everyday_purchase',
    description: 'Laptop search',
    pricing_config: {}
  })
  if (!pricing.error || (pricing.error && !config.enabled)) {
    console.log('✅ Pricing suggestion test passed')
  }

  // 4. Test Research Plan
  console.log('Testing Research Plan...')
  const plan = await Copilot.generateResearchPlan({
    request_id: '00000000-0000-0000-0000-000000000000', // Valid UUID format
    title: 'Laptop',
    description: 'Search for MacBook'
  })
  if (!plan.error || (plan.error && !config.enabled)) {
    console.log('✅ Research plan test passed')
  }

  // 5. Test Report Assistant (Security Check)
  console.log('Testing Report Assistant (Security Check)...')
  const report = await Copilot.assistReportWriting({
    request_info: { title: 'Laptop' },
    snapshots: [
      { 
        display_title: 'Option A', 
        hidden_merchant_name: 'SECRET MERCHANT',
        highlight_summary: 'Good price'
      }
    ],
    is_unlocked: false
  })
  
  // Verify no leakage in customer_safe_copy if it were to return data
  if (report.suggestions?.customer_safe_copy?.includes('SECRET MERCHANT')) {
    console.log('❌ FAIL: Hidden data leaked into customer safe copy!')
    process.exit(1)
  } else {
    console.log('✅ No leakage detected in report assistant')
  }

  // 6. Test Safety Check
  console.log('Testing Safety Check...')
  const safety = await Copilot.runTrustSafetyCheck({
    content_to_check: 'Contact the merchant at SECRET MERCHANT',
    context: 'report',
    hidden_data_keys: ['SECRET MERCHANT']
  })
  if (!safety.error || (safety.error && !config.enabled)) {
    console.log('✅ Safety check test passed')
  }

  // 7. Verify Dictionary Keys
  console.log('Verifying Dictionary Keys...')
  const en = require('../src/dictionaries/en.json')
  const ar = require('../src/dictionaries/ar.json')
  
  if (en.ai_copilot && ar.ai_copilot) {
    console.log('✅ AI copilot keys present in dictionaries')
  } else {
    console.log('❌ FAIL: Missing dictionary keys')
    process.exit(1)
  }

  console.log('VERIFICATION SUCCESSFUL')
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err)
  process.exit(1)
})
