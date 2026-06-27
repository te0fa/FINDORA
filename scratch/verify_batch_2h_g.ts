import { getStaffUiPermissions, StaffMemberLite } from '../src/lib/dal/staff';
import { getActiveFindoraDeals, createFindoraDealInquiry } from '../src/lib/dal/marketing';
import { createAdminClient } from '../src/lib/dal/customers';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyBatch2HG() {
  console.log('--- Verifying Batch 2H-G: Findora Deals ---');

  // 1. Permission Mapping Checks
  console.log('Checking permission mapping...');
  
  const admin: StaffMemberLite = {
    id: 'admin-1', auth_user_id: 'a1', staff_role: 'admin', team_code: 'HQ', is_active: true,
    can_approve_requests: true, can_manage_merchants: true, can_view_financials: true, extra_roles: []
  };

  const dealsManager: StaffMemberLite = {
    id: 'dm-1', auth_user_id: 'd1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['deals_manager']
  };

  const newsManager: StaffMemberLite = {
    id: 'nm-1', auth_user_id: 'n1', staff_role: 'field_agent', team_code: 'HQ', is_active: true,
    can_approve_requests: false, can_manage_merchants: false, can_view_financials: false, extra_roles: ['news_manager']
  };

  const pAdmin = getStaffUiPermissions(admin);
  const pDeals = getStaffUiPermissions(dealsManager);
  const pNews = getStaffUiPermissions(newsManager);

  assert(pAdmin.canManageDeals === true, 'Admin should manage deals');
  assert(pDeals.canManageDeals === true, 'Deals manager (extra role) should manage deals');
  assert(pNews.canManageDeals === false, 'News manager alone should NOT manage deals');

  // 2. DAL Deals Check
  console.log('Checking Marketing DAL for active deals...');
  const adminClient = await createAdminClient();
  const deals = await getActiveFindoraDeals(adminClient);
  
  console.log(`Active deals found: ${deals?.length || 0}`);
  
  // 3. Inquiry Check (if deal exists)
  if (deals && deals.length > 0) {
    const deal = deals[0];
    console.log('Testing inquiry creation...');
    try {
      const inquiry = await createFindoraDealInquiry({
        deal_id: deal.id,
        customer_name: 'E2E Test User',
        customer_phone: '+201000000000',
        notes: 'Verification inquiry'
      }, adminClient);
      assert(!!inquiry.id, 'Inquiry should have an ID');
      console.log('Inquiry creation: PASSED');
    } catch (err: any) {
       console.error('Inquiry creation: FAILED', err.message);
       throw err;
    }
  }

  // 4. Schema Integrity Check
  console.log('Checking schema integrity (no new columns in staff_members)...');
  const { data: staffCols } = await adminClient.from('staff_members').select('*').limit(1);
  const colNames = Object.keys(staffCols?.[0] || {});
  
  const unexpected = ['can_manage_deals'].filter(c => colNames.includes(c));
  assert(unexpected.length === 0, `Detected unexpected schema changes in staff_members: ${unexpected.join(', ')}`);

  console.log('PASSED: Batch 2H-G verification successful.');
}

verifyBatch2HG().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
