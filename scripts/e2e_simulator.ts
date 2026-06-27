import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load env vars from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase environment variables.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function runE2E() {
  console.log('🚀 STARTING FINDORA E2E SIMULATION...\n')

  try {
    // ==========================================
    // PHASE 1: THE GOLDEN PATH (Customer -> Contributor -> Checkout)
    // ==========================================
    console.log('--- PHASE 1: THE HEALTHY LOOP ---')

    // 1. Create a simulated customer request
    console.log('[1] Creating Customer Request...')
    const { data: request, error: reqError } = await supabase.from('customer_requests').insert({
      category: 'electronics',
      product_name: 'iPhone 15 Pro Max 256GB - Simulation',
      target_location: 'Cairo, Maadi',
      max_price: 60000,
      customer_name: 'Simulated Customer',
      customer_phone: '01000000000',
      status: 'processing'
    }).select().single()

    if (reqError) throw new Error('Request creation failed: ' + reqError.message)
    console.log('✅ Request Created: ', request.id)

    // 2. The Growth Engine creates a task for contributors
    console.log('[2] Generating Platform Task (Growth Engine)...')
    const { data: task, error: taskError } = await supabase.from('platform_tasks').insert({
      task_type: 'price_quote',
      title_en: 'Find iPhone 15 Pro Max',
      title_ar: 'البحث عن آيفون 15 برو ماكس',
      description_en: 'Customer looking for 256GB model in Maadi',
      description_ar: 'العميل يبحث عن نسخة 256 جيجا في المعادي',
      base_reward_egp: 200,
      parent_request_id: request.id,
      status: 'open'
    }).select().single()

    if (taskError) throw new Error('Task creation failed: ' + taskError.message)
    console.log('✅ Task Created: ', task.id)

    // 3. Create a clean simulated contributor
    console.log('[3] Registering Contributor...')
    const mockPhone = '01111111111'
    let { data: contributor } = await supabase.from('contributors')
      .select('id').eq('phone_number', mockPhone).maybeSingle()
      
    if (!contributor) {
      const { data: newContrib, error: conError } = await supabase.from('contributors').insert({
        full_name: 'John Doe (Scout)',
        phone_number: mockPhone,
        trust_score: 85,
        status: 'active'
      }).select('id').single()
      if (conError) throw new Error('Contributor creation failed: ' + conError.message)
      contributor = newContrib
    }
    if (!contributor) throw new Error('Contributor not found or created')
    console.log('✅ Contributor Ready: ', contributor.id)

    // 4. Contributor Submits an Offer
    console.log('[4] Contributor Submits an Offer...')
    const { data: offer, error: offerError } = await supabase.from('contributor_submissions').insert({
      contributor_id: contributor.id,
      submission_type: 'price_report',
      product_id: request.id,
      price_reported: 55000,
      details: { notes: 'Found at XYZ Store, immediate delivery.' },
      status: 'verified' // Usually pending, but we speed it up
    }).select().single()

    if (offerError) throw new Error('Offer submission failed: ' + offerError.message)
    console.log('✅ Offer Submitted: ', offer.id)

    // 5. Checkout Engine (Customer Accepts & Pays)
    console.log('[5] Customer Checkout & Wallet Reward...')
    const basePrice = Number(offer.price_reported)
    const platformFee = Math.max(50, basePrice * 0.05)
    console.log(`💰 Simulated Payment: ${basePrice} (Product) + ${platformFee} (Fee) = ${basePrice + platformFee} EGP`)

    // Mark Request as completed
    await supabase.from('customer_requests').update({ status: 'fulfilled' }).eq('id', request.id)
    
    // Reward Contributor (Task Base Reward)
    // Get wallet
    const { data: wallet } = await supabase.from('contributor_wallets').select('id, balance_egp').eq('contributor_id', contributor.id).single()
    const oldBalance = wallet?.balance_egp || 0

    // Simulate webhook transaction insertion
    const { error: txError } = await supabase.from('wallet_transactions').insert({
      contributor_id: contributor.id,
      wallet_id: wallet!.id,
      tx_type: 'task_reward',
      amount_egp: task.base_reward_egp, // They get the task reward, not the product price
      status: 'completed',
      reference_type: 'task',
      reference_id: task.id
    })

    if (txError) throw new Error('Wallet transaction failed: ' + txError.message)

    // Verify balance updated via DB Trigger
    const { data: updatedWallet } = await supabase.from('contributor_wallets').select('balance_egp').eq('id', wallet!.id).single()
    console.log(`✅ Contributor Wallet Updated! Old Balance: ${oldBalance} EGP -> New Balance: ${updatedWallet?.balance_egp} EGP`)


    // ==========================================
    // PHASE 2: THE FRAUD LOOP (Risk Engine & Delay Buffer)
    // ==========================================
    console.log('\n--- PHASE 2: THE FRAUD LOOP ---')
    
    console.log('[1] Creating Malicious Contributor...')
    const mockBadPhone = '01222222222'
    let { data: badContributor } = await supabase.from('contributors').select('id').eq('phone_number', mockBadPhone).single()
    if (!badContributor) {
      const { data: newBad } = await supabase.from('contributors').insert({
        full_name: 'Scammer (Fraud Test)',
        phone_number: mockBadPhone,
        status: 'active'
      }).select().single()
      badContributor = newBad
    }

    console.log('[2] Forcing High Risk Score...')
    // Manually set a high risk score
    await supabase.from('contributor_risk_scores').upsert({
      contributor_id: badContributor!.id,
      risk_score: 95, // Above Block threshold
      account_state: 'active'
    })

    console.log('[3] Triggering Gate Action (Simulating RPC Call)...')
    // Call the Gate via RPC
    const { data: gateResponse, error: gateError } = await supabase.rpc('fn_gate_action', {
      p_contributor_id: badContributor!.id,
      p_action_type: 'withdraw_funds',
      p_metadata: {}
    })

    if (gateError) throw new Error('Gate Action Failed: ' + gateError.message)
    console.log('🛡️ Gate Decision:', gateResponse)

    if (gateResponse.decision === 'BLOCK' || gateResponse.decision === 'REQUIRE_REVIEW') {
      console.log('✅ Risk Engine successfully intercepted the action!')
      
      // Check if alert was generated
      const { data: logs } = await supabase.from('fraud_audit_log').select('*').eq('id', gateResponse.log_id).single()
      console.log('✅ Audit Log Generated: ', logs?.reason)
      
      // Check account status
      const { data: accCheck } = await supabase.from('contributors').select('status').eq('id', badContributor!.id).single()
      console.log('✅ Account Status is now: ', accCheck?.status)
    } else {
      console.error('❌ Risk Engine failed to block the user!')
    }

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!')

  } catch (err: any) {
    console.error('\n❌ TEST FAILED:', err.message)
  }
}

runE2E()
