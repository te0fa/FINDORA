import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const WALLET_ID = '316218ea-a326-4f08-9e65-9cd09ec0a565'
const CONTRIBUTOR_ID = '790bf460-5b55-4af7-ac02-aae6e029359f'

async function runIndividualTests() {
  console.log('=== STARTING INDIVIDUAL FUNCTION AUDIT VERIFICATION ===\n')

  // 0. Reset Database State
  console.log('[0] Resetting wallet and truncating transactions...')
  await supabase.from('wallet_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('contributor_withdrawals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('contributor_wallets').update({
    balance_egp: 0,
    points_balance: 0,
    pending_withdrawal_egp: 0,
    lifetime_earned_egp: 0,
    lifetime_withdrawn_egp: 0
  }).eq('id', WALLET_ID)

  // =========================================================================
  // Test 1: adjustWalletBalance (Admin Adjustment)
  // =========================================================================
  console.log('\n--- TEST 1: adjustWalletBalance (Admin Adjustment) ---')
  
  // Get wallet state before
  const { data: w1Before } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Balance Before: ${w1Before.balance_egp} EGP`)

  // Call RPC as done in adjustWalletBalance
  const amountEgp = 100
  const { data: r1Result, error: r1Error } = await supabase.rpc('fn_lock_and_insert_transaction', {
    p_contributor_id: CONTRIBUTOR_ID,
    p_wallet_id: WALLET_ID,
    p_tx_type: 'manual_adjustment',
    p_amount_egp: amountEgp,
    p_amount_points: 10,
    p_reference_type: 'admin_adjustment',
    p_reference_id: null,
    p_description_en: 'Admin credit test',
    p_description_ar: 'تعديل إداري تجريبي',
    p_metadata: { staff_reviewer_id: '00000000-0000-0000-0000-000000000000' },
    p_idempotency_key: null
  })

  if (r1Error || !(r1Result as any).success) {
    console.error('Error in T1 RPC:', r1Error || r1Result)
    return
  }

  // Get wallet state after
  const { data: w1After } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Balance After: ${w1After.balance_egp} EGP`)
  console.log(`Expected Change: +${amountEgp} EGP`)
  console.log(`Actual Change: +${Number(w1After.balance_egp) - Number(w1Before.balance_egp)} EGP`)
  const t1Passed = (Number(w1After.balance_egp) - Number(w1Before.balance_egp)) === amountEgp
  console.log(`T1 (1x Change Verification): ${t1Passed ? 'PASS' : 'FAIL (Double Update!)'}`)

  // =========================================================================
  // Test 2: requestWithdrawal (Withdrawal Hold)
  // =========================================================================
  console.log('\n--- TEST 2: requestWithdrawal (Withdrawal Hold) ---')
  
  // Get wallet state before
  const { data: w2Before } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Balance Before: ${w2Before.balance_egp} EGP, Pending Before: ${w2Before.pending_withdrawal_egp} EGP`)

  const withdrawAmount = 30
  
  // Call RPC as done in requestWithdrawal
  const { data: r2Result, error: r2Error } = await supabase.rpc('fn_lock_and_insert_transaction', {
    p_contributor_id: CONTRIBUTOR_ID,
    p_wallet_id: WALLET_ID,
    p_tx_type: 'withdrawal_hold',
    p_amount_egp: -withdrawAmount,
    p_amount_points: 0,
    p_reference_type: 'withdrawal_request',
    p_reference_id: null,
    p_description_en: 'Withdrawal hold test',
    p_description_ar: 'حجز سحب تجريبي',
    p_metadata: { payment_method: 'vodafone_cash' },
    p_idempotency_key: null
  })

  if (r2Error || !(r2Result as any).success) {
    console.error('Error in T2 RPC:', r2Error || r2Result)
    return
  }

  // Create mock withdrawal request in DB
  const { data: withdrawalReq } = await supabase.from('contributor_withdrawals').insert({
    contributor_id: CONTRIBUTOR_ID,
    wallet_id: WALLET_ID,
    amount_egp: withdrawAmount,
    payment_method: 'vodafone_cash',
    payment_details: { phone: '01000000000' },
    status: 'pending'
  }).select('id').single()

  // Get wallet state after
  const { data: w2After } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Balance After: ${w2After.balance_egp} EGP, Pending After: ${w2After.pending_withdrawal_egp} EGP`)
  console.log(`Expected Change: Balance -${withdrawAmount} EGP, Pending +${withdrawAmount} EGP`)
  
  const balanceDiff = Number(w2Before.balance_egp) - Number(w2After.balance_egp)
  const pendingDiff = Number(w2After.pending_withdrawal_egp) - Number(w2Before.pending_withdrawal_egp)
  
  console.log(`Actual Balance Change: -${balanceDiff} EGP`)
  console.log(`Actual Pending Change: +${pendingDiff} EGP`)
  const t2Passed = balanceDiff === withdrawAmount && pendingDiff === withdrawAmount
  console.log(`T2 (1x Change Verification): ${t2Passed ? 'PASS' : 'FAIL (Double Update!)'}`)

  // =========================================================================
  // Test 3: approveWithdrawal (Withdrawal Completion)
  // =========================================================================
  console.log('\n--- TEST 3: approveWithdrawal (Withdrawal Completion) ---')
  
  // Get wallet state before
  const { data: w3Before } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Pending Before: ${w3Before.pending_withdrawal_egp} EGP, Lifetime Withdrawn Before: ${w3Before.lifetime_withdrawn_egp} EGP`)

  // Call RPC as done in approveWithdrawal
  const { data: r3Result, error: r3Error } = await supabase.rpc('fn_lock_and_insert_transaction', {
    p_contributor_id: CONTRIBUTOR_ID,
    p_wallet_id: WALLET_ID,
    p_tx_type: 'withdrawal',
    p_amount_egp: -withdrawAmount,
    p_amount_points: 0,
    p_reference_type: 'withdrawal_request',
    p_reference_id: withdrawalReq!.id,
    p_description_en: 'Approved Withdrawal Payout test',
    p_description_ar: 'صرف سحب تجريبي',
    p_metadata: { receipt_url: 'http://test.com' },
    p_idempotency_key: null
  })

  if (r3Error || !(r3Result as any).success) {
    console.error('Error in T3 RPC:', r3Error || r3Result)
    return
  }

  // Get wallet state after
  const { data: w3After } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Pending After: ${w3After.pending_withdrawal_egp} EGP, Lifetime Withdrawn After: ${w3After.lifetime_withdrawn_egp} EGP`)
  
  const pendingDiff3 = Number(w3Before.pending_withdrawal_egp) - Number(w3After.pending_withdrawal_egp)
  const withdrawnDiff3 = Number(w3After.lifetime_withdrawn_egp) - Number(w3Before.lifetime_withdrawn_egp)
  
  console.log(`Actual Pending Change: -${pendingDiff3} EGP`)
  console.log(`Actual Withdrawn Change: +${withdrawnDiff3} EGP`)
  const t3Passed = pendingDiff3 === withdrawAmount && withdrawnDiff3 === withdrawAmount
  console.log(`T3 (1x Change Verification): ${t3Passed ? 'PASS' : 'FAIL (Double Update!)'}`)

  // =========================================================================
  // Test 4: verifySubmission (Points Reward)
  // =========================================================================
  console.log('\n--- TEST 4: verifySubmission (Points Reward) ---')
  
  // Get wallet state before
  const { data: w4Before } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Points Before: ${w4Before.points_balance} Pts`)

  const pointsEarned = 15
  
  // Insert directly as done in actions.ts after audit
  const { error: r4Error } = await supabase.from('wallet_transactions').insert({
    contributor_id: CONTRIBUTOR_ID,
    wallet_id: WALLET_ID,
    tx_type: 'task_reward',
    amount_egp: 0,
    amount_points: pointsEarned,
    metadata: { source: 'supply_submission', submission_id: '00000000-0000-0000-0000-000000000000' }
  })

  if (r4Error) {
    console.error('Error in T4 insert:', r4Error)
    return
  }

  // Get wallet state after
  const { data: w4After } = await supabase.from('contributor_wallets').select('*').eq('id', WALLET_ID).single()
  console.log(`Points After: ${w4After.points_balance} Pts`)
  console.log(`Expected Change: +${pointsEarned} Pts`)
  console.log(`Actual Change: +${Number(w4After.points_balance) - Number(w4Before.points_balance)} Pts`)
  const t4Passed = (Number(w4After.points_balance) - Number(w4Before.points_balance)) === pointsEarned
  console.log(`T4 (1x Change Verification): ${t4Passed ? 'PASS' : 'FAIL (Double Update!)'}`)

  console.log('\n=== INDIVIDUAL TEST SUMMARY ===')
  console.log(`T1 (adjustWalletBalance): ${t1Passed ? 'SUCCESS' : 'FAILURE'}`)
  console.log(`T2 (requestWithdrawal):   ${t2Passed ? 'SUCCESS' : 'FAILURE'}`)
  console.log(`T3 (approveWithdrawal):   ${t3Passed ? 'SUCCESS' : 'FAILURE'}`)
  console.log(`T4 (verifySubmission):    ${t4Passed ? 'SUCCESS' : 'FAILURE'}`)
}

runIndividualTests().catch(console.error)
