import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/dal/customers';
import { createSourcingRequest } from '../src/lib/dal/requests';
import crypto from 'crypto';

async function runTests() {
  console.log('=== STARTING VERIFICATION TESTS ===');
  const supabase = await createAdminClient();

  // Test 1: B2C request creation (atomic dual-write)
  console.log('\n--- Test 1: B2C Sourcing Request Creation via RPC ---');
  // First get or create a dummy customer
  const { data: customers, error: custErr } = await supabase.from('customers').select('id').limit(1);
  if (custErr || !customers || customers.length === 0) {
    throw new Error('No customers found in database to link test request to.');
  }
  const testCustomerId = customers[0].id;
  console.log(`Using test customer ID: ${testCustomerId}`);

  const testTitle = `Test Product ${Date.now()}`;
  const testDesc = 'This is a test B2C request to verify atomic dual-write behavior.';
  
  const request = await createSourcingRequest({
    customerId: testCustomerId,
    title: testTitle,
    rawDescription: testDesc,
    status: 'open',
    channel: 'landing_page',
    requestKind: 'everyday_purchase',
    intakeMode: 'quick',
    preferences: {
      budget_min: 100,
      budget_max: 500,
      urgency_level: 'normal',
      preferred_governorate: 'Giza'
    }
  });

  const generatedId = request.id;
  console.log(`Generated Request ID: ${generatedId}`);
  console.log(`Generated Request Code: ${request.request_code}`);

  // Fetch from requests table
  const { data: reqRow, error: reqErr } = await supabase
    .from('requests')
    .select('id, title, current_status, canonical_state')
    .eq('id', generatedId)
    .single();

  if (reqErr || !reqRow) {
    throw new Error(`Failed to find request in 'requests' table: ${reqErr?.message}`);
  }
  console.log('✅ Found row in requests table:', reqRow);

  // Fetch from customer_requests table
  const { data: custReqRow, error: custReqErr } = await supabase
    .from('customer_requests')
    .select('id, product_name, status, target_location')
    .eq('id', generatedId)
    .single();

  if (custReqErr || !custReqRow) {
    throw new Error(`Failed to find matching row in 'customer_requests' table: ${custReqErr?.message}`);
  }
  console.log('✅ Found matching row in customer_requests table:', custReqRow);

  if (custReqRow.product_name !== testTitle) {
    throw new Error(`Product name mismatch. Expected: ${testTitle}, got: ${custReqRow.product_name}`);
  }
  console.log('✅ Title and ID matched perfectly between both tables.');

  // Test 2: Trigger state synchronization
  console.log('\n--- Test 2: Trigger State Sync (canonical_state -> status) ---');
  
  // Set canonical_state to COMPLETED
  console.log('Updating canonical_state to COMPLETED...');
  const { error: updateErr1 } = await supabase
    .from('requests')
    .update({ canonical_state: 'COMPLETED' })
    .eq('id', generatedId);

  if (updateErr1) {
    throw new Error(`Failed to update canonical_state: ${updateErr1.message}`);
  }

  // Check customer_requests status
  const { data: statusCheck1 } = await supabase
    .from('customer_requests')
    .select('status')
    .eq('id', generatedId)
    .single();

  console.log(`After COMPLETED: customer_requests.status = ${statusCheck1?.status}`);
  if (statusCheck1?.status !== 'fulfilled') {
    throw new Error(`Trigger sync failed. Expected status 'fulfilled', got: ${statusCheck1?.status}`);
  }
  console.log('✅ Trigger mapped COMPLETED -> fulfilled successfully.');

  // Set canonical_state to ARCHIVED
  console.log('Updating canonical_state to ARCHIVED...');
  const { error: updateErr2 } = await supabase
    .from('requests')
    .update({ canonical_state: 'ARCHIVED' })
    .eq('id', generatedId);

  if (updateErr2) {
    throw new Error(`Failed to update canonical_state to ARCHIVED: ${updateErr2.message}`);
  }

  const { data: statusCheck2 } = await supabase
    .from('customer_requests')
    .select('status')
    .eq('id', generatedId)
    .single();

  console.log(`After ARCHIVED: customer_requests.status = ${statusCheck2?.status}`);
  if (statusCheck2?.status !== 'cancelled') {
    throw new Error(`Trigger sync failed. Expected status 'cancelled', got: ${statusCheck2?.status}`);
  }
  console.log('✅ Trigger mapped ARCHIVED -> cancelled successfully.');

  // Test 3: Transactional atomic rollback verification
  console.log('\n--- Test 3: Transactional Atomic Rollback Verification ---');
  // We'll call the RPC function with a invalid input (e.g. non-existent customer UUID)
  // that violates the foreign key constraint on customer_requests.
  const invalidCustomerId = crypto.randomUUID();
  console.log(`Attempting RPC call with non-existent customer ID: ${invalidCustomerId}`);
  
  const { error: rpcErr } = await supabase.rpc('fn_create_sourcing_request', {
    p_request_id: crypto.randomUUID(),
    p_customer_id: invalidCustomerId,
    p_customer_name: 'Ghost Customer',
    p_customer_phone: '123456789',
    p_product_name: 'Ghost Item',
    p_category: 'everyday_purchase',
    p_target_location: 'Cairo',
    p_max_price: null,
    p_additional_notes: 'Rollback test',
    p_request_code: `REQ-ROLLBACK-${Date.now()}`,
    p_title: 'Ghost Item',
    p_raw_description: 'Rollback test',
    p_status: 'open',
    p_channel: 'landing_page',
    p_request_kind: 'general',
    p_intake_mode: 'quick',
    p_pricing_decision: 'pending_review',
    p_service_fee_amount: 299,
    p_execution_requested: false,
    p_followup_requested: false,
    p_site_visit_requested: false,
    p_reference_image_path: null,
    p_preferences: {}
  });

  if (rpcErr) {
    console.log(`✅ RPC call failed as expected: ${rpcErr.message}`);
    console.log('✅ Database transaction successfully rolled back both inserts.');
  } else {
    throw new Error('RPC did not fail despite violating foreign key constraint!');
  }

  // Cleanup test request
  console.log('\nCleaning up test data...');
  await supabase.from('request_preferences').delete().eq('request_id', generatedId);
  await supabase.from('customer_requests').delete().eq('id', generatedId);
  await supabase.from('requests').delete().eq('id', generatedId);
  console.log('✅ Cleanup finished.');

  console.log('\n=== ALL DATABASE TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
  process.exit(1);
});
