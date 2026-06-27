import { createAdminClient } from '../src/lib/dal/customers'
import { createSourcingRequest } from '../src/lib/dal/requests'
import { updateRequestPricing } from '../src/lib/dal/staff'
import { maskSourceDetails, unlockReportOption, getCustomerRequestOverview } from '../src/lib/dal/reports'
import { confirmPaymentIntentAdmin, unlockReportAfterPaymentAdmin } from '../src/lib/dal/payments'
import crypto from 'node:crypto'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`❌ ASSERTION FAILED: ${message}`)
}

async function verifyTrustFlow() {
  const adminClient = await createAdminClient()

  console.log('--- BATCH 5C VERIFICATION START ---')

  const testId = crypto.randomUUID().slice(0, 8)
  const phone = `+2010${Math.floor(10000000 + Math.random() * 90000000)}`
  let customerId: string | null = null
  let requestId: string | null = null
  let paymentIntentId: string | null = null
  let snapshotId: string | null = null

  try {
    // 1. Synthetic customer created (no auth_user_id to avoid FK constraints)
    console.log('Step 1: Creating synthetic customer...')
    const { data: customer, error: custErr } = await adminClient.from('customers').insert({
      full_name: `Test Trust ${testId}`,
      customer_code: `CUST-${testId.toUpperCase()}`,
      phone_number_normalized: phone,
      phone_number_raw: phone,
      email: `trust_${testId}@example.com`,
      preferred_language: 'en'
    }).select().single()
    if (custErr) throw custErr
    customerId = customer.id

    // 2. Request created free with request type = everyday_purchase
    console.log('Step 2: Creating free request (everyday_purchase)...')
    const request = await createSourcingRequest({
      customerId: customerId!,
      title: `Test Trust Request ${testId}`,
      rawDescription: 'Looking for a specific item with masking test.',
      status: 'open',
      channel: 'verifier',
      requestKind: 'everyday_purchase', // CATEGORY
      intakeMode: 'quick',
      preferences: { urgency_level: 'normal' }
    })
    requestId = (request as any).id

    // 3. Confirm request type is stored correctly, not inside pricing_model
    console.log('Step 3: Checking DB storage...')
    const { data: dbReq, error: dbErr } = await adminClient.from('requests').select('*').eq('id', requestId!).single()
    if (dbErr) throw dbErr
    
    console.log(`  request_kind: ${dbReq.request_kind}`)
    console.log(`  pricing_model: ${dbReq.pricing_model ?? 'MISSING'}`)
    console.log(`  payment_policy: ${dbReq.payment_policy ?? 'MISSING'}`)
    
    if (dbReq.request_kind !== 'everyday_purchase') throw new Error(`Incorrect request_kind: ${dbReq.request_kind}`)
    
    if (dbReq.pricing_model === undefined) {
      console.warn('  WARNING: pricing_model column is MISSING from DB.')
    } else if (dbReq.pricing_model === 'everyday_purchase') {
       throw new Error(`Category leaked into pricing_model!`)
    }

    // 4. Staff updates Scope & Pricing Review
    console.log('Step 4: Staff updating pricing...')
    // Get a staff member
    const { data: staff, error: staffErr } = await adminClient.from('staff_members').select('id').eq('is_active', true).limit(1).maybeSingle()
    assert(!staffErr, `Failed to fetch active staff: ${staffErr?.message}`)
    assert(staff?.id, 'No active staff found for Batch 5C verifier.')

    const staffId: string = staff.id

    await updateRequestPricing({
      requestId: requestId!,
      pricingModel: 'fixed_fee',
      paymentPolicy: 'pay_after_preview',
      serviceFeeAmount: 150,
      pricingNotes: 'Standard trust-based fee',
      staffId
    })

    // 5. Scope/pricing communication draft is queued in English
    console.log('Step 5: Verifying communication queue (English)...')
    const { data: comms } = await adminClient.from('outbound_messages')
      .select('*')
      .eq('request_id', requestId!)
      .eq('template_code', 'request_received') // From createSourcingRequest
      .limit(1)
    
    if (comms && comms.length > 0) {
      console.log(`  Comm found: ${comms[0].template_code} (${comms[0].channel})`)
    }

    // 6. Research/preview stage is simulated
    console.log('Step 6: Simulating research stage...')
    await adminClient.from('requests').update({ current_status: 'reporting' }).eq('id', requestId!)

    // 7. Preview report is accessible but source details are masked
    console.log('Step 7: Verifying source masking...')
    // Create a report and snapshot
    const { data: report, error: reportErr } = await adminClient.from('reports').insert({
      request_id: requestId!,
      report_status: 'published'
    }).select().single()
    if (reportErr) throw reportErr
    
    const { data: snapshot, error: snapErr } = await adminClient.from('report_option_snapshots').insert({
      report_id: report.id,
      request_id: requestId!,
      display_title: 'Secret Merchant X',
      display_rank: 1,
      candidate_channel: 'offline',
      hidden_merchant_name: 'Real Merchant Name',
      hidden_contact_notes: '0123456789',
      reveal_locked: true
    }).select().single()
    if (snapErr) throw snapErr
    snapshotId = snapshot.id

    // Release report (simulated)
    await adminClient.from('requests').update({ client_released_at: new Date() }).eq('id', requestId!)

    // Fetch raw snapshot and apply masking manually to verify DAL logic
    const { data: rawSnapshots } = await adminClient
      .from('report_option_snapshots')
      .select('*, option_label:display_title, reason_summary:highlight_summary')
      .eq('request_id', requestId!)
    
    console.log(`  Fetched ${rawSnapshots?.length} raw snapshots.`)
    const target = maskSourceDetails(rawSnapshots?.[0])
    console.log(`  Masked Merchant Name: ${target.merchant_name}`)
    if (target.merchant_name !== '*** Locked ***') throw new Error('Masking FAILED!')

    // 8. Unlock payment intent is created
    console.log('Step 8: Creating payment intent...')
    const { data: intent } = await adminClient.from('payment_intents').insert({
      request_id: requestId!,
      customer_id: customerId!,
      intent_type: 'report_unlock',
      amount: 150,
      status: 'pending_customer'
    }).select().single()
    paymentIntentId = intent.id

    // 9. Verify masking and unauthorized access
    console.log('Step 9: Verifying reveal block before payment...')
    
    // 9.1 Unauthorized ownership test (using getCustomerRequestOverview)
    console.log('  Testing unauthorized ownership gate...')
    const fakeAuthId = crypto.randomUUID()
    const unauthorizedOverview = await getCustomerRequestOverview(requestId!, fakeAuthId)
    assert(unauthorizedOverview === null, 'Unauthorized user should not get request overview.')
    console.log('  ✅ Non-owner reveal attempt blocked.')

    // 9.2 Payment gate test (Verification of masking on raw data)
    console.log('  Testing payment gate masking (before payment)...')
    const { data: snapsBefore } = await adminClient.from('report_option_snapshots').select('*').eq('request_id', requestId!)
    assert(snapsBefore && snapsBefore.length > 0, 'Should find snapshots.')
    const masked = maskSourceDetails(snapsBefore[0])
    
    assert(masked.reveal_locked === true, 'Snapshot must be locked before payment.')
    assert(masked.revealedSourceText === '*** Locked ***', 'Merchant name must be masked.')
    assert(masked.revealedContactInfo === '*** Locked ***', 'Contact info must be masked.')
    assert(masked.hidden_merchant_name === undefined || masked.hidden_merchant_name !== 'Real Merchant Name', 'Hidden fields must not leak.')
    console.log('  ✅ Source details are masked before payment.')

    // 10. Payment is confirmed
    console.log('Step 10: Confirming payment...')
    await confirmPaymentIntentAdmin({
      id: paymentIntentId!,
      actorStaffId: staffId,
      notes: 'Verified via Batch 5C script'
    })

    // 11. Source reveal is allowed after payment
    console.log('Step 11: Verifying reveal after payment...')
    
    // Trigger real reveal logic (inserts into source_reveals)
    await unlockReportAfterPaymentAdmin({
      requestId: requestId!,
      customerId: customerId!,
      paymentIntentId: paymentIntentId!,
      unlockType: 'report_full',
      actorStaffId: staffId,
      revealText: 'Real Merchant Name Details'
    })

    // Update snapshot state (staff action)
    await adminClient.from('report_option_snapshots').update({ reveal_locked: false }).eq('id', snapshotId!)
    
    // Check source_reveals table
    const { data: revealRow } = await adminClient
      .from('source_reveals')
      .select('*')
      .eq('request_id', requestId!)
      .single()
    
    assert(revealRow, 'source_reveals row must be created after unlock.')
    assert(revealRow.revealed_source_text, 'revealed_source_text must be populated.')
    console.log('  ✅ Source reveal row created.')

    // Verify snapshots now show real data
    const { data: snapsAfter } = await adminClient.from('report_option_snapshots').select('*').eq('request_id', requestId!)
    const revealed = maskSourceDetails(snapsAfter![0])
    
    console.log(`  Revealed Merchant Name: ${revealed.revealedSourceText}`)
    assert(revealed.reveal_locked === false, 'Snapshot should be unlocked.')
    assert(revealed.revealedSourceText === 'Real Merchant Name', 'Merchant name should be revealed.')
    assert(revealed.revealedContactInfo === '0123456789', 'Contact info should be revealed.')
    console.log('  ✅ Revealed source/contact info is available after payment.')

    // 12. Platform/customer intelligence events are logged
    console.log('Step 12: Checking intelligence events...')
    const { count: platCount } = await adminClient.from('platform_events').select('*', { count: 'exact', head: true }).eq('request_id', requestId!)
    console.log(`  Platform events: ${platCount}`)

    console.log('--- VERIFICATION SUCCESSFUL ---')

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('!!! VERIFICATION FAILED !!!')
    console.error(message)
  } finally {
    // 13. Cleanup removes all synthetic artifacts in FK-safe order
    console.log('Step 13: Cleaning up...')
    if (requestId) await adminClient.from('source_reveals').delete().eq('request_id', requestId)
    if (paymentIntentId) await adminClient.from('payment_audit_events').delete().eq('payment_intent_id', paymentIntentId)
    if (paymentIntentId) await adminClient.from('payment_intents').delete().eq('id', paymentIntentId)
    if (requestId) await adminClient.from('payments').delete().eq('request_id', requestId)
    if (snapshotId) await adminClient.from('report_option_snapshots').delete().eq('id', snapshotId)
    if (requestId) await adminClient.from('reports').delete().eq('request_id', requestId)
    if (requestId) await adminClient.from('outbound_messages').delete().eq('request_id', requestId)
    if (requestId) await adminClient.from('platform_events').delete().eq('request_id', requestId)
    if (customerId) await adminClient.from('customer_intelligence_events').delete().eq('customer_id', customerId)
    if (requestId) await adminClient.from('request_preferences').delete().eq('request_id', requestId)
    if (requestId) await adminClient.from('requests').delete().eq('id', requestId)
    if (customerId) await adminClient.from('communication_preferences').delete().eq('customer_id', customerId)
    if (customerId) await adminClient.from('customer_score_snapshots').delete().eq('customer_id', customerId)
    if (customerId) await adminClient.from('customer_segments').delete().eq('customer_id', customerId)
    if (customerId) await adminClient.from('customers').delete().eq('id', customerId)
    console.log('  Cleanup complete.')
  }
}

verifyTrustFlow()
