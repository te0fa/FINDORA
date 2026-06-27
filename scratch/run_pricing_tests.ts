import { createClient } from '@supabase/supabase-js'
import { resolveCustomerServiceFee, resolveVendorTransactionFee } from '../src/lib/pricing/feeResolvers'

// We use the admin client from dotenv config
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function runTests() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SECRET_KEY!
  const db = createClient(url, key)

  console.log('=== FINDORA Unified Pricing & Fees Architecture Test Suite ===\n')

  // Helper to update current active customer phase
  async function setCustomerPhase(phaseName: string, updates = {}) {
    await db.from('customer_fee_phases').update({ is_current_phase: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await db.from('customer_fee_phases').update({ is_current_phase: true, ...updates }).eq('phase_name', phaseName)
    if (error) throw error
  }

  // Helper to update current active vendor phase
  async function setVendorPhase(phaseName: string, updates = {}) {
    await db.from('vendor_fee_phases').update({ is_current_phase: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await db.from('vendor_fee_phases').update({ is_current_phase: true, ...updates }).eq('phase_name', phaseName)
    if (error) throw error
  }

  // Helper to create a test customer
  async function createTestCustomer(phoneVerified = false) {
    const code = `TEST-CUST-${Math.floor(1000 + Math.random() * 9000)}`
    const { data, error } = await db.from('customers').insert({
      full_name: 'Test Customer',
      customer_code: code,
      phone_verified: phoneVerified,
      has_used_free_first_request: false,
      status: 'active'
    }).select().single()
    if (error) throw error
    return data
  }

  // Save current phase state to restore later
  const { data: initialCustomerPhases } = await db.from('customer_fee_phases').select('*')
  const { data: initialVendorPhases } = await db.from('vendor_fee_phases').select('*')

  const results: any[] = []

  try {
    // ----------------------------------------------------
    // Test 1: free_launch phase, service fee = 0
    // ----------------------------------------------------
    await setCustomerPhase('free_launch')
    const cust1 = await createTestCustomer(true)
    const res1 = await resolveCustomerServiceFee(cust1.id)
    results.push({
      id: 1,
      name: 'Test 1: free_launch service fee is 0',
      passed: res1.fee === 0 && res1.usedFree === false
    })

    // ----------------------------------------------------
    // Test 2: growth phase, verified customer first request free
    // ----------------------------------------------------
    await setCustomerPhase('growth')
    const cust2 = await createTestCustomer(true)
    const res2 = await resolveCustomerServiceFee(cust2.id)
    // Retrieve the customer from DB to verify has_used_free_first_request is now true
    const { data: updatedCust2 } = await db.from('customers').select('*').eq('id', cust2.id).single()
    results.push({
      id: 2,
      name: 'Test 2: Growth phase verified customer gets 0 EGP & flag is set true',
      passed: res2.fee === 0 && res2.usedFree === true && updatedCust2.has_used_free_first_request === true
    })

    // ----------------------------------------------------
    // Test 2b: Concurrency race condition simulation
    // ----------------------------------------------------
    const custRace = await createTestCustomer(true)
    // Send two concurrent requests resolving the fee
    const [raceRes1, raceRes2] = await Promise.all([
      resolveCustomerServiceFee(custRace.id),
      resolveCustomerServiceFee(custRace.id)
    ])
    const { data: updatedCustRace } = await db.from('customers').select('*').eq('id', custRace.id).single()

    // One must be 0 (usedFree = true) and the other must be 99 (usedFree = false)
    const fees = [raceRes1.fee, raceRes2.fee].sort((a, b) => a - b)
    const flags = [raceRes1.usedFree, raceRes2.usedFree].sort()
    results.push({
      id: '2b',
      name: 'Test 2b: Race condition check (only 1 of 2 concurrent requests claims free promo)',
      passed: fees[0] === 0 && fees[1] === 99 && flags[0] === false && flags[1] === true && updatedCustRace.has_used_free_first_request === true
    })

    // ----------------------------------------------------
    // Test 3: Growth phase same customer second request is 99
    // ----------------------------------------------------
    const res3 = await resolveCustomerServiceFee(cust2.id)
    results.push({
      id: 3,
      name: 'Test 3: Growth phase customer second request gets full fee (99)',
      passed: res3.fee === 99 && res3.usedFree === false
    })

    // ----------------------------------------------------
    // Test 4: Growth phase unverified customer first request is 99
    // ----------------------------------------------------
    const cust4 = await createTestCustomer(false)
    const res4 = await resolveCustomerServiceFee(cust4.id)
    results.push({
      id: 4,
      name: 'Test 4: Growth phase unverified customer first request gets full fee (99)',
      passed: res4.fee === 99 && res4.usedFree === false
    })

    // ----------------------------------------------------
    // Test 5: Transition to standard phase, request gets 299
    // ----------------------------------------------------
    await setCustomerPhase('standard')
    const cust5 = await createTestCustomer(true)
    const res5 = await resolveCustomerServiceFee(cust5.id)
    results.push({
      id: 5,
      name: 'Test 5: Transition to standard phase request gets 299',
      passed: res5.fee === 299 && res5.usedFree === false
    })

    // ----------------------------------------------------
    // Test 6: Edit standard phase fee amount (e.g. to 350)
    // ----------------------------------------------------
    await setCustomerPhase('standard', { fee_amount_egp: 350 })
    const res6 = await resolveCustomerServiceFee(cust5.id)
    results.push({
      id: 6,
      name: 'Test 6: Edited standard phase fee to 350 reflects instantly',
      passed: res6.fee === 350 && res6.usedFree === false
    })

    // ----------------------------------------------------
    // Test 7: DB error fallback resolves to standard 299
    // ----------------------------------------------------
    const res7 = await resolveCustomerServiceFee('FORCE_ERROR')
    results.push({
      id: 7,
      name: 'Test 7: DB fallback logic resolves to standard customer fee 299',
      passed: res7.fee === 299 && res7.usedFree === false
    })

    // ----------------------------------------------------
    // Test 8: Vendor fallback works when standard has NULL placeholder
    // ----------------------------------------------------
    await setVendorPhase('standard', { commission_rate: null, min_fee_egp: null })
    const res8 = await resolveVendorTransactionFee(1000) // 1000 EGP * 5% = 50 EGP
    results.push({
      id: 8,
      name: 'Test 8: Vendor transaction fallback resolves to 5% with 50 EGP minimum',
      passed: res8 === 50
    })

  } catch (err) {
    console.error('Test suite encountered exception:', err)
  } finally {
    // Restore initial DB phase states
    console.log('\nRestoring database configurations...')
    if (initialCustomerPhases) {
      for (const p of initialCustomerPhases) {
        await db.from('customer_fee_phases').update({
          is_current_phase: p.is_current_phase,
          fee_amount_egp: p.fee_amount_egp,
          first_request_free_with_verified_phone: p.first_request_free_with_verified_phone
        }).eq('id', p.id)
      }
    }
    if (initialVendorPhases) {
      for (const p of initialVendorPhases) {
        await db.from('vendor_fee_phases').update({
          is_current_phase: p.is_current_phase,
          commission_rate: p.commission_rate,
          min_fee_egp: p.min_fee_egp,
          subscription_monthly_egp: p.subscription_monthly_egp
        }).eq('id', p.id)
      }
    }
  }

  // Print results
  console.log('\n=== TEST RESULTS ===')
  let allPassed = true
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`)
    if (!r.passed) allPassed = false
  }

  if (allPassed) {
    console.log('\n🎉 ALL MIGRATION AND RESOLVER TESTS PASSED!')
  } else {
    console.log('\n❌ SOME TESTS FAILED.')
    process.exit(1)
  }
}

runTests()
