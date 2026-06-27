import { createAdminClient } from '../../src/lib/dal/customers';
import { getStaffMemberByAuthUserId } from '../../src/lib/dal/staff';
import crypto from 'node:crypto';

/**
 * FINDORA Staff Test Setup
 * Manually creates a test request and preferences to avoid DAL side effects
 * and satisfy the upsert requirement.
 */
export async function createMutatingTestRequest() {
  const adminClient = await createAdminClient();

  // 1. Get E2E Staff Member
  const staffEmail = process.env.E2E_STAFF_EMAIL;
  if (!staffEmail) throw new Error('E2E_STAFF_EMAIL not set');

  const { data: { users }, error: userError } = await adminClient.auth.admin.listUsers();
  if (userError) throw new Error(`Failed to list users: ${userError.message}`);
  
  const targetUser = users.find(u => u.email === staffEmail);
  if (!targetUser) throw new Error(`Staff user with email ${staffEmail} not found`);

  const staff = await getStaffMemberByAuthUserId(targetUser.id);
  if (!staff) throw new Error(`Staff member record not found for auth ID ${targetUser.id}`);

  // 2. Find or Create Test Customer
  const testCustomerEmail = 'e2e-staff-test-customer@example.com';
  let customerId: string;
  
  const { data: existingCust } = await adminClient
    .from('customers')
    .select('id')
    .eq('email', testCustomerEmail)
    .maybeSingle();

  if (existingCust) {
    customerId = existingCust.id;
  } else {
    const { data: newCust, error: custErr } = await adminClient
      .from('customers')
      .insert({
        full_name: 'E2E Staff Test Customer',
        email: testCustomerEmail,
        customer_code: `CUST-E2E-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'active'
      } as any)
      .select()
      .single();
    
    if (custErr) throw new Error(`Failed to create test customer: ${custErr.message}`);
    customerId = newCust.id;
  }

  // 3. Create Request Manually (to use upsert for preferences)
  const requestCode = `REQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  
  const { data: request, error: reqErr } = await adminClient
    .from('requests')
    .insert({
      request_code: requestCode,
      customer_id: customerId,
      title: '[E2E_TEST_STAFF_MUTATION] Full staff workflow',
      raw_description: 'E2E test description for full workflow journey.',
      current_status: 'submitted',
      source_channel: 'e2e',
      request_kind: 'general',
      intake_mode: 'quick',
      pricing_decision: 'pending_review'
    })
    .select()
    .single();

  if (reqErr) throw new Error(`Failed to create request: ${reqErr.message}`);

  // 3.1 Upsert Preferences (Issue 2 fix)
  const { error: prefError } = await adminClient
    .from('request_preferences')
    .upsert(
      {
        request_id: request.id,
        urgency_level: 'high',
        search_scope: 'online_and_offline',
        budget_min: 1000,
        budget_max: 5000,
        preferred_governorate: 'Cairo'
      },
      { onConflict: 'request_id' }
    );

  if (prefError) throw new Error(`Request preferences upsert failed: ${prefError.message}`);

  // 4. Assign to Staff
  const { error: assignErr } = await adminClient
    .from('requests')
    .update({
      assigned_reviewer_staff_id: staff.id,
      reviewer_assignment_status: 'assigned',
      reviewer_assigned_at: new Date().toISOString()
    })
    .eq('id', request.id);

  if (assignErr) throw new Error(`Failed to assign request: ${assignErr.message}`);

  return {
    requestId: request.id,
    requestCode: request.request_code,
    customerId,
    staffId: staff.id
  };
}
