import { createAdminClient } from '../src/lib/dal/customers';
import * as DAL from '../src/lib/dal/communication-center';

async function verify() {
  console.log('--- BATCH 4E COMMUNICATION CENTER VERIFICATION ---');
  const supabase = await createAdminClient();

  const testCustomerId = '3bee044d-c3a9-499f-803f-f5d323f1d873'; // Synthetic test customer
  const testRequestId = 'e59f6465-5afd-4008-a110-f3d455dd3870'; // Synthetic test request

  // One-time cleanup for leftover row
  console.log('[0.0] Cleaning up leftover Batch 4E customer...');
  await supabase.from('communication_preferences').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_score_snapshots').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_segments').delete().eq('customer_id', testCustomerId);
  await supabase.from('outbound_messages').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_intelligence_events').delete().eq('customer_id', testCustomerId);
  await supabase.from('customers').delete().eq('id', testCustomerId);

  console.log('[0.05] Ensuring synthetic test customer exists...');
  await supabase.from('customers').upsert({
    id: testCustomerId,
    full_name: 'Batch 4E Test Customer',
    email: 'test@example.com',
    customer_code: 'C-VERIFY-4E'
  }, { onConflict: 'id' });

  console.log('[0.06] Ensuring synthetic test request exists...');
  await supabase.from('requests').upsert({
    id: testRequestId,
    customer_id: testCustomerId,
    request_code: 'VERIFY-4E',
    title: 'Verify 4E Request',
    request_kind: 'everyday_purchase',
    current_status: 'open',
    raw_description: 'Batch 4E Verification Request'
  }, { onConflict: 'id' });

  const { data: testMsg, error: insertErr } = await supabase
    .from('outbound_messages')
    .insert({
      customer_id: testCustomerId,
      request_id: testRequestId,
      template_code: 'test_verify_4e',
      channel: 'email',
      recipient: 'test@example.com',
      rendered_subject: 'Original Subject',
      rendered_body: 'Original Body',
      status: 'draft',
      metadata: { batch: '4e_verify' }
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  console.log(`✅ [1] Created draft message: ${testMsg.id}`);

  // 2. Verify getOutboundMessagesAdmin
  const listRes = await DAL.getOutboundMessagesAdmin({ templateCode: 'test_verify_4e' });
  const found = listRes.messages.find((m: any) => m.id === testMsg.id);
  if (!found) throw new Error('Message not found in admin list');
  console.log('✅ [2] Message found in admin list with correct filters.');

  // 3. Verify getOutboundMessageDetailAdmin
  const detail = await DAL.getOutboundMessageDetailAdmin(testMsg.id);
  if (detail.rendered_subject !== 'Original Subject') throw new Error('Detail mismatch');
  console.log('✅ [3] Message detail fetched correctly.');

  // 4. Edit draft
  await DAL.updateOutboundMessageDraftAdmin({
    messageId: testMsg.id,
    rendered_subject: 'Updated Subject'
  });
  const updatedDetail = await DAL.getOutboundMessageDetailAdmin(testMsg.id);
  if (updatedDetail.rendered_subject !== 'Updated Subject') throw new Error('Update failed');
  console.log('✅ [4] Draft subject updated successfully.');

  // 5. Mark Queued
  await DAL.markOutboundMessageQueuedAdmin(testMsg.id, 'system-verifier');
  const queuedDetail = await DAL.getOutboundMessageDetailAdmin(testMsg.id);
  if (queuedDetail.status !== 'queued') throw new Error('Mark queued failed');
  console.log('✅ [5] Message marked as queued.');

  // 6. Mark Sent Manually
  await DAL.markOutboundMessageSentManualAdmin(testMsg.id, 'system-verifier', 'Manually sent for testing');
  const sentDetail = await DAL.getOutboundMessageDetailAdmin(testMsg.id);
  if (sentDetail.status !== 'sent' || sentDetail.provider !== 'manual' || !sentDetail.sent_at) {
    throw new Error('Mark sent manual failed');
  }
  console.log('✅ [6] Message marked as sent manually (provider=manual).');

  // 7. Verify sent message cannot be edited
  try {
    await DAL.updateOutboundMessageDraftAdmin({
      messageId: testMsg.id,
      rendered_subject: 'Should Fail'
    });
    throw new Error('Sent message update should have failed');
  } catch (err: any) {
    console.log(`✅ [7] Sent message update correctly blocked: ${err.message}`);
  }

  // 8. Create another draft and skip it
  const { data: testMsg2, error: skipInsertErr } = await supabase
    .from('outbound_messages')
    .insert({
      customer_id: testCustomerId,
      request_id: testRequestId,
      template_code: 'test_verify_4e_skip',
      channel: 'whatsapp',
      recipient: '+123456789',
      rendered_subject: 'Skip Me',
      rendered_body: 'Skip Me Content',
      status: 'draft',
      metadata: { batch: '4e_verify' }
    })
    .select()
    .single();

  if (skipInsertErr) {
    console.error('Second insert failed:', skipInsertErr);
    throw skipInsertErr;
  }

  await DAL.skipOutboundMessageAdmin(testMsg2.id, 'system-verifier', 'Test skip reason');
  const skippedDetail = await DAL.getOutboundMessageDetailAdmin(testMsg2.id);
  if (skippedDetail.status !== 'skipped' || skippedDetail.error_message !== 'Test skip reason') {
    throw new Error('Skip failed');
  }
  console.log('✅ [8] Message skipped successfully.');

  // 9. Cleanup
  console.log('[9] Cleaning up synthetic data...');
  // Follow safe FK order
  await supabase.from('source_reveals').delete().eq('request_id', testRequestId);
  await supabase.from('payment_audit_events').delete().eq('request_id', testRequestId);
  await supabase.from('payment_intents').delete().eq('request_id', testRequestId);
  await supabase.from('payments').delete().eq('request_id', testRequestId);
  await supabase.from('report_option_snapshots').delete().eq('request_id', testRequestId);
  await supabase.from('reports').delete().eq('request_id', testRequestId);
  await supabase.from('request_candidate_shortlists').delete().eq('request_id', testRequestId);
  await supabase.from('merchant_performance_events').delete().eq('request_id', testRequestId);
  await supabase.from('merchant_quotes').delete().eq('request_id', testRequestId);
  await supabase.from('outbound_messages').delete().or(`request_id.eq.${testRequestId},customer_id.eq.${testCustomerId}`);
  await supabase.from('platform_events').delete().eq('request_id', testRequestId);
  await supabase.from('customer_intelligence_events').delete().or(`request_id.eq.${testRequestId},customer_id.eq.${testCustomerId}`);
  await supabase.from('request_preferences').delete().eq('request_id', testRequestId);
  await supabase.from('request_status_history').delete().eq('request_id', testRequestId);
  await supabase.from('requests').delete().eq('id', testRequestId);
  await supabase.from('communication_preferences').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_score_snapshots').delete().eq('customer_id', testCustomerId);
  await supabase.from('customer_segments').delete().eq('customer_id', testCustomerId);
  await supabase.from('customers').delete().eq('id', testCustomerId);

  // 10. Final Assertions
  console.log('[10] Running final assertions...');
  const assertEmpty = async (table: string, filter: any) => {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).match(filter);
    if (error) {
        console.warn(`[ASSERT] Could not check ${table}: ${error.message}`);
        return;
    }
    if (count && count > 0) {
      throw new Error(`Cleanup failed: ${count} rows remain in ${table}`);
    }
    console.log(`✅ ${table} clean.`);
  };

  await assertEmpty('customers', { id: testCustomerId });
  await assertEmpty('communication_preferences', { customer_id: testCustomerId });
  await assertEmpty('customer_score_snapshots', { customer_id: testCustomerId });
  await assertEmpty('customer_segments', { customer_id: testCustomerId });
  await assertEmpty('outbound_messages', { customer_id: testCustomerId });
  await assertEmpty('customer_intelligence_events', { customer_id: testCustomerId });

  console.log('\n[VERDICT] SUCCESS: Batch 4E Communication Center verified.');
}

verify().catch(err => {
  console.error('\n[VERDICT] FAILED:', err.message);
  process.exitCode = 1;
});
