import { getStaffUiPermissions, StaffMemberLite } from '../src/lib/dal/staff';
import { getActivePricingForService } from '../src/lib/dal/marketing';
import { createAdminClient } from '../src/lib/dal/customers';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyBatch2HE() {
  console.log('--- Verifying Batch 2H-E: Pricing Management ---');

  // 1. Permission Mapping Checks
  console.log('Checking permission mapping...');
  
  const admin: StaffMemberLite = {
    id: 'admin-1', auth_user_id: 'a1', staff_role: 'admin', team_code: 'HQ', is_active: true,
    can_approve_requests: true, can_manage_merchants: true, can_view_financials: true, extra_roles: []
  };

  const pricingManager: StaffMemberLite = {
    id: 'pm-1', auth_user_id: 'p1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['pricing_manager']
  };

  const dealsManager: StaffMemberLite = {
    id: 'dm-1', auth_user_id: 'd1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['deals_manager']
  };

  const pAdmin = getStaffUiPermissions(admin);
  const pPricing = getStaffUiPermissions(pricingManager);
  const pDeals = getStaffUiPermissions(dealsManager);

  assert(pAdmin.canManagePricing === true, 'Admin should manage pricing');
  assert(pPricing.canManagePricing === true, 'Pricing manager (extra role) should manage pricing');
  assert(pDeals.canManagePricing === false, 'Deals manager alone should NOT manage pricing');

  // 2. DAL Pricing Check
  console.log('Checking Marketing DAL for everyday_purchase...');
  const adminClient = await createAdminClient();
  const pricing = await getActivePricingForService('everyday_purchase', adminClient);
  
  if (!pricing) {
    console.error('FAILED: No active pricing found for everyday_purchase. Seed might be missing.');
    process.exit(1);
  }

  console.log('Pricing found:', {
    service: pricing.service_key,
    original: pricing.original_price,
    current: pricing.current_price,
    currency: pricing.currency_code,
    promo: pricing.promo_label_en
  });

  assert(pricing.original_price == 299, 'Original price should be 299');
  assert(pricing.current_price == 99, 'Current price should be 99');

  // 3. Schema Integrity Check
  console.log('Checking schema integrity (no new columns in staff_members)...');
  const { data: staffCols } = await adminClient.from('staff_members').select('*').limit(1);
  const colNames = Object.keys(staffCols?.[0] || {});
  
  const unexpected = ['can_manage_pricing', 'can_manage_deals'].filter(c => colNames.includes(c));
  assert(unexpected.length === 0, `Detected unexpected schema changes in staff_members: ${unexpected.join(', ')}`);

  console.log('PASSED: Batch 2H-E verification successful.');
}

verifyBatch2HE().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
