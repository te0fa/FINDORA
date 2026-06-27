// scratch/run_rate_cap_tests.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { generatePricingSuggestion } from '../src/lib/pricing/aiAgent'
import { verifyInstapayReceiptWithGemini } from '../src/lib/gemini/ocr'
import { createAdminClient } from '../src/lib/dal/customers'

async function run() {
  console.log('--- TEST 3: RATE CAP ENFORCEMENT VERIFICATION ---')
  const db = await createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ==========================================
  // Part 1: Verify flag_ai_pricing_suggestions
  // ==========================================
  console.log('\n1. Testing Feature: flag_ai_pricing_suggestions...')
  
  // 1a. Set daily limit to 3
  console.log('  Setting daily_limit to 3 for flag_ai_pricing_suggestions...')
  await db
    .from('economy_config')
    .update({ daily_limit: 3, status: 'restricted', value: 'true' })
    .eq('config_key', 'flag_ai_pricing_suggestions')

  // 1b. Clear logs for today
  console.log('  Clearing today\'s logs for flag_ai_pricing_suggestions...')
  await db
    .from('ai_usage_log')
    .delete()
    .eq('feature_key', 'flag_ai_pricing_suggestions')
    .gte('timestamp', today.toISOString())

  const mockContext = {
    service_type: 'express_sourcing',
    urgency: 'high' as const,
    complexity: 'medium' as const,
    exact_match: true,
  }
  const mockBasePricing = {
    service_type: 'express_sourcing',
    price: 100,
    currency: 'EGP',
  }

  // 1c. Trigger 5 calls
  console.log('  Triggering 5 calls to generatePricingSuggestion...')
  for (let i = 1; i <= 5; i++) {
    const res = await generatePricingSuggestion(mockContext, mockBasePricing)
    const isCapped = res.reasoning.includes('محرك الذكاء الاصطناعي غير نشط')
    console.log(`    Call ${i}: Success=${!isCapped}, Reasoning: ${res.reasoning.substring(0, 50)}...`)
    
    if (i <= 3 && isCapped) {
      console.error(`❌ Fail: Call ${i} was capped when it shouldn't be.`)
      process.exit(1)
    }
    if (i > 3 && !isCapped) {
      console.error(`❌ Fail: Call ${i} was NOT capped when limit is 3.`)
      process.exit(1)
    }
  }
  console.log('✅ flag_ai_pricing_suggestions rate capping verified successfully!')

  // 1d. Restore daily limit to 1000
  console.log('  Restoring daily_limit to 1000...')
  await db
    .from('economy_config')
    .update({ daily_limit: 1000, status: 'enabled' })
    .eq('config_key', 'flag_ai_pricing_suggestions')


  // ==========================================
  // Part 2: Verify flag_ai_receipt_ocr
  // ==========================================
  console.log('\n2. Testing Feature: flag_ai_receipt_ocr...')

  // 2a. Set daily limit to 3
  console.log('  Setting daily_limit to 3 for flag_ai_receipt_ocr...')
  await db
    .from('economy_config')
    .update({ daily_limit: 3, status: 'restricted', value: 'true' })
    .eq('config_key', 'flag_ai_receipt_ocr')

  // 2b. Clear logs for today
  console.log('  Clearing today\'s logs for flag_ai_receipt_ocr...')
  await db
    .from('ai_usage_log')
    .delete()
    .eq('feature_key', 'flag_ai_receipt_ocr')
    .gte('timestamp', today.toISOString())

  // 2c. Trigger 5 calls
  console.log('  Triggering 5 calls to verifyInstapayReceiptWithGemini...')
  for (let i = 1; i <= 5; i++) {
    const res = await verifyInstapayReceiptWithGemini('https://example.com/receipt.jpg')
    const isCapped = res.reason.includes('AI OCR is disabled')
    console.log(`    Call ${i}: Success=${!isCapped}, Reason: ${res.reason}`)

    if (i <= 3 && isCapped) {
      console.error(`❌ Fail: Call ${i} was capped when it shouldn't be.`)
      process.exit(1)
    }
    if (i > 3 && !isCapped) {
      console.error(`❌ Fail: Call ${i} was NOT capped when limit is 3.`)
      process.exit(1)
    }
  }
  console.log('✅ flag_ai_receipt_ocr rate capping verified successfully!')

  // 2d. Restore daily limit to 200
  console.log('  Restoring daily_limit to 200...')
  await db
    .from('economy_config')
    .update({ daily_limit: 200, status: 'enabled' })
    .eq('config_key', 'flag_ai_receipt_ocr')

  console.log('\n--- ALL RATE CAP TESTS PASSED SUCCESSFULLY ---')
}

run().catch(err => {
  console.error('Rate cap tests failed:', err)
  process.exit(1)
})
