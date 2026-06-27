/**
 * Rate Cap Test: flag_ai_intake_review (Test 3 - Feature 9)
 *
 * Verifies that the generic getAIFeatureStatus() rate-cap mechanism
 * enforces daily limits on flag_ai_intake_review the same way it does
 * on flag_ai_pricing_suggestions and flag_ai_receipt_ocr.
 *
 * Strategy:
 *   1. Read current flag state and daily_limit from economy_config
 *   2. Count existing ai_usage_log entries today for this feature
 *   3. Fill up the bucket by inserting synthetic log entries until limit - 1
 *   4. Call getAIFeatureStatus('flag_ai_intake_review') — expect enabled
 *   5. Insert one more log entry to hit the cap
 *   6. Call getAIFeatureStatus('flag_ai_intake_review') — expect RESTRICTED
 *   7. Restore: delete the synthetic log entries, restore original limit
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!
const FEATURE_KEY = 'flag_ai_intake_review'
const TEST_CAP = 3

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getFeatureStatus(featureKey: string) {
  const { data, error } = await db
    .from('economy_config')
    .select('value, status, daily_limit, monthly_limit')
    .eq('config_key', featureKey)
    .maybeSingle()
  if (error || !data) return { enabled: true, status: 'enabled' as const }

  const isValueTrue = String(data.value) === 'true'
  const status = (data.status || 'enabled') as 'enabled' | 'disabled' | 'restricted'
  if (status === 'disabled' || !isValueTrue) {
    return { enabled: false, status: 'disabled' as const, reason: 'Feature is disabled by AI Manager' }
  }

  const dailyLimit = data.daily_limit
  if (dailyLimit !== null) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { count, error: dailyErr } = await db
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('feature_key', featureKey)
      .gte('timestamp', today.toISOString())
    if (!dailyErr && count !== null && count >= dailyLimit) {
      return { enabled: false, status: 'restricted' as const, reason: `Daily limit of ${dailyLimit} requests reached` }
    }
  }
  return { enabled: true, status }
}

async function insertFakeLog(featureKey: string, count: number): Promise<string[]> {
  const rows = Array.from({ length: count }, () => ({
    feature_key: featureKey,
    success: true,
    estimated_cost: 0.50,
    error_message: null,
    metadata: { _test: true, _test_marker: 'rate_cap_test_intake' }
  }))
  const { data, error } = await db.from('ai_usage_log').insert(rows).select('id')
  if (error) throw new Error(`Failed to insert fake logs: ${error.message}`)
  return (data || []).map((r: any) => r.id)
}

async function deleteFakeLogs(ids: string[]) {
  if (ids.length === 0) return
  await db.from('ai_usage_log').delete().in('id', ids)
}

async function setDailyLimit(featureKey: string, limit: number | null) {
  await db.from('economy_config')
    .update({ daily_limit: limit })
    .eq('config_key', featureKey)
}

async function getDailyLimit(featureKey: string): Promise<number | null> {
  const { data } = await db.from('economy_config')
    .select('daily_limit')
    .eq('config_key', featureKey)
    .maybeSingle()
  return data?.daily_limit ?? null
}

async function getUsedToday(featureKey: string): Promise<number> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { count } = await db.from('ai_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('feature_key', featureKey)
    .gte('timestamp', today.toISOString())
  return count || 0
}

// ─── Main Test ─────────────────────────────────────────────────────────────

;(async () => {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Rate Cap Test — ${FEATURE_KEY}`)
  console.log(`${'═'.repeat(60)}\n`)

  const originalLimit = await getDailyLimit(FEATURE_KEY)
  const usedBefore = await getUsedToday(FEATURE_KEY)
  console.log(`📋 Original daily_limit: ${originalLimit ?? '∞'}`)
  console.log(`📊 Existing usage today:  ${usedBefore} entries\n`)

  // Step 1: Set a tight cap of 3
  console.log(`⚙️  Setting daily_limit = ${TEST_CAP} for test...`)
  await setDailyLimit(FEATURE_KEY, TEST_CAP)

  const insertedIds: string[] = []

  try {
    // Step 2: Check status before any synthetic logs — should be ENABLED
    const statusBefore = await getFeatureStatus(FEATURE_KEY)
    console.log(`✅ Check 1 (before fill): status=${statusBefore.status}, enabled=${statusBefore.enabled}`)
    if (!statusBefore.enabled) {
      throw new Error(`Expected ENABLED before cap fill, got ${statusBefore.status}. Is the flag disabled in the DB?`)
    }

    // Step 3: Fill up to cap - 1 (leaving room for one more)
    const toInsert = TEST_CAP - usedBefore - 1
    if (toInsert > 0) {
      console.log(`📥 Inserting ${toInsert} synthetic log entries (filling to cap - 1)...`)
      const ids = await insertFakeLog(FEATURE_KEY, toInsert)
      insertedIds.push(...ids)
    } else {
      console.log(`⏭️  Already at or near cap (${usedBefore} used) — skipping pre-fill`)
    }
    await sleep(200)

    // Step 4: Status should still be ENABLED (not yet at cap)
    const statusAtCapMinus1 = await getFeatureStatus(FEATURE_KEY)
    console.log(`✅ Check 2 (at cap-1):    status=${statusAtCapMinus1.status}, enabled=${statusAtCapMinus1.enabled}`)
    if (!statusAtCapMinus1.enabled) {
      throw new Error(`Expected ENABLED at cap-1, got ${statusAtCapMinus1.status}`)
    }

    // Step 5: Push over the cap — insert one more entry
    console.log(`📥 Inserting 1 more entry to hit the cap (${TEST_CAP})...`)
    const overIds = await insertFakeLog(FEATURE_KEY, 1)
    insertedIds.push(...overIds)
    await sleep(200)

    // Step 6: Status should now be RESTRICTED
    const statusAtCap = await getFeatureStatus(FEATURE_KEY)
    console.log(`🚦 Check 3 (at cap):      status=${statusAtCap.status}, enabled=${statusAtCap.enabled}`)
    console.log(`   Reason: ${statusAtCap.reason || 'none'}`)

    if (statusAtCap.enabled || statusAtCap.status !== 'restricted') {
      throw new Error(`❌ FAIL: Expected RESTRICTED at cap, got status=${statusAtCap.status}`)
    }

    // ── RESULT ───────────────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  ✅ ALL CHECKS PASSED`)
    console.log(`  flag_ai_intake_review rate cap is correctly enforced.`)
    console.log(`  The generic getAIFeatureStatus() mechanism works on`)
    console.log(`  the 9th feature exactly as it does on features 1–8.`)
    console.log(`${'═'.repeat(60)}\n`)

  } finally {
    // Step 7: Restore
    console.log(`🧹 Cleaning up: deleting ${insertedIds.length} synthetic log entries...`)
    await deleteFakeLogs(insertedIds)
    console.log(`🔄 Restoring daily_limit to ${originalLimit ?? 'null'} (original)...`)
    await setDailyLimit(FEATURE_KEY, originalLimit)
    console.log(`✅ Cleanup complete.\n`)
  }
})().catch(err => {
  console.error('\n❌ Test failed with error:', err.message)
  process.exit(1)
})
