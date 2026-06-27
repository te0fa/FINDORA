import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const WALLET_ID = '316218ea-a326-4f08-9e65-9cd09ec0a565'
const CONTRIBUTOR_ID = '790bf460-5b55-4af7-ac02-aae6e029359f'

async function resetWallet(balance = 0) {
  // 1. Delete all transactions and withdrawals to start clean
  await supabase.from('wallet_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('contributor_withdrawals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  // 2. Reset wallet balance to 0 directly
  await supabase.from('contributor_wallets').update({
    balance_egp: 0,
    points_balance: 0,
    pending_withdrawal_egp: 0,
    lifetime_earned_egp: 0,
    lifetime_withdrawn_egp: 0
  }).eq('id', WALLET_ID)
  
  // 3. If a non-zero starting balance is requested, insert a transaction to trigger it cleanly
  if (balance > 0) {
    const { error } = await supabase.from('wallet_transactions').insert({
      contributor_id: CONTRIBUTOR_ID,
      wallet_id: WALLET_ID,
      tx_type: 'manual_adjustment',
      amount_egp: balance,
      description_en: 'Initial Starting Balance Setup'
    })
    if (error) {
      console.error('Error setting up starting balance:', error)
    }
  }
}

async function getWallet() {
  const { data } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  return data
}

async function runStressTests() {
  console.log('=== STARTING WALLET HARDENING STRESS TESTS ===\n')

  // =========================================================================
  // Test A — 100 concurrent credit operations
  // =========================================================================
  console.log('--- TEST A: 100 Concurrent Credit Operations ---')
  await resetWallet(0)
  let w = await getWallet()
  let initialBalance = Number(w.balance_egp)
  console.log(`Initial Balance: ${initialBalance} EGP`)

  const countA = 100
  const amountA = 10 // 10 EGP each -> 1000 EGP total
  const expectedIncreaseA = countA * amountA

  console.log(`Launching ${countA} concurrent additions of ${amountA} EGP...`)
  let startTime = Date.now()
  let promisesA = Array.from({ length: countA }).map((_, idx) => {
    return supabase.from('wallet_transactions').insert({
      contributor_id: CONTRIBUTOR_ID,
      wallet_id: WALLET_ID,
      tx_type: 'task_reward',
      amount_egp: amountA,
      description_en: `Stress Test A #${idx + 1}`
    })
  })
  
  let resultsA = await Promise.all(promisesA)
  let durationA = Date.now() - startTime
  w = await getWallet()
  let finalBalanceA = Number(w.balance_egp)
  
  let succeededA = resultsA.filter(r => !r.error).length
  let failedA = resultsA.filter(r => r.error).length
  let diffA = finalBalanceA - (initialBalance + expectedIncreaseA)

  console.log(`Duration: ${durationA}ms`)
  console.log(`Succeeded Requests: ${succeededA}, Failed Requests: ${failedA}`)
  console.log(`Expected Balance: ${initialBalance + expectedIncreaseA} EGP`)
  console.log(`Actual Balance: ${finalBalanceA} EGP`)
  console.log(`Difference: ${diffA} EGP`)
  
  const passA = succeededA === countA && diffA === 0
  console.log(`Test A Verdict: ${passA ? 'PASS' : 'FAIL'}\n`)

  // =========================================================================
  // Test B — 500 concurrent credit operations
  // =========================================================================
  console.log('--- TEST B: 500 Concurrent Credit Operations ---')
  await resetWallet(0)
  w = await getWallet()
  initialBalance = Number(w.balance_egp)
  console.log(`Initial Balance: ${initialBalance} EGP`)

  const countB = 500
  const amountB = 2 // 2 EGP each -> 1000 EGP total
  const expectedIncreaseB = countB * amountB

  console.log(`Launching ${countB} concurrent additions of ${amountB} EGP...`)
  startTime = Date.now()
  let promisesB = Array.from({ length: countB }).map((_, idx) => {
    return supabase.from('wallet_transactions').insert({
      contributor_id: CONTRIBUTOR_ID,
      wallet_id: WALLET_ID,
      tx_type: 'task_reward',
      amount_egp: amountB,
      description_en: `Stress Test B #${idx + 1}`
    })
  })
  
  let resultsB = await Promise.all(promisesB)
  let durationB = Date.now() - startTime
  w = await getWallet()
  let finalBalanceB = Number(w.balance_egp)
  
  let succeededB = resultsB.filter(r => !r.error).length
  let failedB = resultsB.filter(r => r.error).length
  let diffB = finalBalanceB - (initialBalance + expectedIncreaseB)

  console.log(`Duration: ${durationB}ms`)
  console.log(`Succeeded Requests: ${succeededB}, Failed Requests: ${failedB}`)
  console.log(`Expected Balance: ${initialBalance + expectedIncreaseB} EGP`)
  console.log(`Actual Balance: ${finalBalanceB} EGP`)
  console.log(`Difference: ${diffB} EGP`)
  
  const passB = succeededB === countB && diffB === 0
  console.log(`Test B Verdict: ${passB ? 'PASS' : 'FAIL'}\n`)

  // =========================================================================
  // Test C — 1000 concurrent credit operations
  // =========================================================================
  console.log('--- TEST C: 1000 Concurrent Credit Operations ---')
  await resetWallet(0)
  w = await getWallet()
  initialBalance = Number(w.balance_egp)
  console.log(`Initial Balance: ${initialBalance} EGP`)

  const countC = 1000
  const amountC = 1 // 1 EGP each -> 1000 EGP total
  const expectedIncreaseC = countC * amountC

  console.log(`Launching ${countC} concurrent additions of ${amountC} EGP...`)
  startTime = Date.now()
  const chunkSize = 250
  let resultsC: any[] = []
  for (let i = 0; i < countC; i += chunkSize) {
    let chunk = Array.from({ length: Math.min(chunkSize, countC - i) }).map((_, idx) => {
      return supabase.from('wallet_transactions').insert({
        contributor_id: CONTRIBUTOR_ID,
        wallet_id: WALLET_ID,
        tx_type: 'task_reward',
        amount_egp: amountC,
        description_en: `Stress Test C #${i + idx + 1}`
      })
    })
    let chunkRes = await Promise.all(chunk)
    resultsC.push(...chunkRes)
  }
  
  let durationC = Date.now() - startTime
  w = await getWallet()
  let finalBalanceC = Number(w.balance_egp)
  
  let succeededC = resultsC.filter(r => !r.error).length
  let failedC = resultsC.filter(r => r.error).length
  let diffC = finalBalanceC - (initialBalance + expectedIncreaseC)

  console.log(`Duration: ${durationC}ms`)
  console.log(`Succeeded Requests: ${succeededC}, Failed Requests: ${failedC}`)
  console.log(`Expected Balance: ${initialBalance + expectedIncreaseC} EGP`)
  console.log(`Actual Balance: ${finalBalanceC} EGP`)
  console.log(`Difference: ${diffC} EGP`)
  
  const passC = succeededC === countC && diffC === 0
  console.log(`Test C Verdict: ${passC ? 'PASS' : 'FAIL'}\n`)

  // =========================================================================
  // Test D — Idempotency Storm (5 rounds of 50 concurrent requests)
  // =========================================================================
  console.log('--- TEST D: Idempotency Storm (5 rounds) ---')
  await resetWallet(0)
  let stormPass = true
  
  for (let round = 1; round <= 5; round++) {
    const key = `storm_key_round_${round}_${Date.now()}`
    console.log(`[Round ${round}] Launching 50 concurrent requests with key "${key}"...`)
    
    let promisesD = Array.from({ length: 50 }).map(() => {
      return supabase.from('wallet_transactions').insert({
        contributor_id: CONTRIBUTOR_ID,
        wallet_id: WALLET_ID,
        tx_type: 'task_reward',
        amount_egp: 10,
        idempotency_key: key,
        description_en: `Idempotency Storm Test`
      })
    })
    
    let resultsD = await Promise.all(promisesD)
    let succeededD = resultsD.filter(r => !r.error).length
    let failedD = resultsD.filter(r => r.error).length
    
    console.log(`  Round ${round} Results: Succeeded = ${succeededD}, Failed = ${failedD}`)
    if (succeededD !== 1 || failedD !== 49) {
      stormPass = false
    }
  }
  
  w = await getWallet()
  console.log(`Final Balance after 5 rounds: ${w.balance_egp} EGP (Expected: 50 EGP)`)
  const passD = stormPass && Number(w.balance_egp) === 50
  console.log(`Test D Verdict: ${passD ? 'PASS' : 'FAIL'}\n`)

  // =========================================================================
  // Test E — Overdraft Attack
  // =========================================================================
  console.log('--- TEST E: Overdraft Attack ---')
  await resetWallet(50) // Set balance to 50 EGP via transaction
  w = await getWallet()
  initialBalance = Number(w.balance_egp)
  console.log(`Initial Balance: ${initialBalance} EGP`)

  const overdraftAmount = 100 // Try to deduct 100 EGP (balance is only 50)
  console.log(`Attempting to deduct ${overdraftAmount} EGP (exceeds balance)...`)
  
  const { data: rpcResE, error: errE } = await supabase.rpc('fn_lock_and_insert_transaction', {
    p_contributor_id: CONTRIBUTOR_ID,
    p_wallet_id: WALLET_ID,
    p_tx_type: 'manual_adjustment',
    p_amount_egp: -overdraftAmount,
    p_amount_points: 0,
    p_reference_type: 'admin_adjustment',
    p_reference_id: null,
    p_description_en: 'Overdraft attack test',
    p_description_ar: 'تعديل سحب مكشوف تجريبي',
    p_metadata: {},
    p_idempotency_key: null
  })

  w = await getWallet()
  let finalBalanceE = Number(w.balance_egp)
  
  const isRejected = errE || !(rpcResE as any).success
  console.log(`Request status: ${isRejected ? 'REJECTED (Correct)' : 'ACCEPTED (Incorrect)'}`)
  console.log(`Final Balance: ${finalBalanceE} EGP`)
  
  const passE = isRejected && finalBalanceE === initialBalance
  console.log(`Test E Verdict: ${passE ? 'PASS' : 'FAIL'}\n`)

  // =========================================================================
  // Test F — Concurrent Overdraft
  // =========================================================================
  console.log('--- TEST F: Concurrent Overdraft (The Gold Standard) ---')
  await resetWallet(100) // Set balance to 100 EGP via transaction
  w = await getWallet()
  initialBalance = Number(w.balance_egp)
  console.log(`Initial Balance: ${initialBalance} EGP`)

  console.log(`Launching 2 concurrent withdrawal holds of 70 EGP each (Total = 140 EGP)...`)
  
  let promisesF = [
    supabase.rpc('fn_lock_and_insert_transaction', {
      p_contributor_id: CONTRIBUTOR_ID,
      p_wallet_id: WALLET_ID,
      p_tx_type: 'withdrawal_hold',
      p_amount_egp: -70,
      p_amount_points: 0,
      p_reference_type: 'withdrawal_request',
      p_reference_id: null,
      p_description_en: 'Concurrent Overdraft Test 1',
      p_description_ar: 'تزامن سحب مكشوف 1',
      p_metadata: {},
      p_idempotency_key: null
    }),
    supabase.rpc('fn_lock_and_insert_transaction', {
      p_contributor_id: CONTRIBUTOR_ID,
      p_wallet_id: WALLET_ID,
      p_tx_type: 'withdrawal_hold',
      p_amount_egp: -70,
      p_amount_points: 0,
      p_reference_type: 'withdrawal_request',
      p_reference_id: null,
      p_description_en: 'Concurrent Overdraft Test 2',
      p_description_ar: 'تزامن سحب مكشوف 2',
      p_metadata: {},
      p_idempotency_key: null
    })
  ]
  
  let resultsF = await Promise.all(promisesF)
  w = await getWallet()
  let finalBalanceF = Number(w.balance_egp)
  let finalPendingF = Number(w.pending_withdrawal_egp)
  
  let succeededF = resultsF.filter(r => !r.error && (r.data as any).success).length
  let failedF = resultsF.filter(r => r.error || !(r.data as any).success).length
  
  console.log(`Succeeded requests: ${succeededF} (Expected: 1)`)
  console.log(`Failed requests: ${failedF} (Expected: 1)`)
  console.log(`Final Balance: ${finalBalanceF} EGP (Expected: 30 EGP)`)
  console.log(`Final Pending Withdrawal: ${finalPendingF} EGP (Expected: 70 EGP)`)
  
  const passF = succeededF === 1 && failedF === 1 && finalBalanceF === 30 && finalPendingF === 70
  console.log(`Test F Verdict: ${passF ? 'PASS' : 'FAIL'}\n`)

  // =========================================================================
  // Run Reconciliation Check
  // =========================================================================
  console.log('--- RUNNING WALLET RECONCILIATION CHECK ---')
  const { data: reconResults } = await supabase.rpc('fn_wallet_reconciliation_check')
  console.log(`Reconciliation results:`, reconResults)
  const passRecon = !reconResults || reconResults.length === 0
  console.log(`Reconciliation Verdict: ${passRecon ? 'PASS (No Differences)' : 'FAIL (Differences Detected)'}\n`)

  console.log('=== OVERALL STRESS TEST RESULTS ===')
  console.log(`Test A (100 Credit):      ${passA ? 'PASS' : 'FAIL'}`)
  console.log(`Test B (500 Credit):      ${passB ? 'PASS' : 'FAIL'}`)
  console.log(`Test C (1000 Credit):     ${passC ? 'PASS' : 'FAIL'}`)
  console.log(`Test D (Storm):           ${passD ? 'PASS' : 'FAIL'}`)
  console.log(`Test E (Overdraft):       ${passE ? 'PASS' : 'FAIL'}`)
  console.log(`Test F (Conc Overdraft):  ${passF ? 'PASS' : 'FAIL'}`)
  console.log(`Reconciliation Check:     ${passRecon ? 'PASS' : 'FAIL'}`)
  
  const finalPass = passA && passB && passC && passD && passE && passF && passRecon
  console.log(`\nWallet Hardening Complete: ${finalPass ? 'PASS' : 'FAIL'}`)
}

runStressTests().catch(console.error)
