import { getStaffUiPermissions, StaffMemberLite } from '../src/lib/dal/staff';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyPermissions() {
  console.log('--- Verifying Staff Permissions Mapping for Batch 2H-D ---');

  const admin: StaffMemberLite = {
    id: 'admin-1',
    auth_user_id: 'auth-admin-1',
    full_name: 'Admin User',
    staff_role: 'admin',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: true,
    can_manage_merchants: true,
    can_view_financials: true,
    extra_roles: []
  };

  const dealsManager: StaffMemberLite = {
    id: 'dm-1',
    auth_user_id: 'auth-dm-1',
    full_name: 'Deals Manager',
    staff_role: 'deals_manager',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: false,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const newsManager: StaffMemberLite = {
    id: 'nm-1',
    auth_user_id: 'auth-nm-1',
    full_name: 'News Manager',
    staff_role: 'news_manager',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: false,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const pricingManager: StaffMemberLite = {
    id: 'pm-1',
    auth_user_id: 'auth-pm-1',
    full_name: 'Pricing Manager',
    staff_role: 'pricing_manager',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: false,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const contentManager: StaffMemberLite = {
    id: 'cm-1',
    auth_user_id: 'auth-cm-1',
    full_name: 'Content Manager',
    staff_role: 'content_manager',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: false,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const reviewer: StaffMemberLite = {
    id: 'rev-1',
    auth_user_id: 'auth-rev-1',
    full_name: 'Reviewer',
    staff_role: 'reviewer',
    team_code: 'HQ',
    is_active: true,
    can_approve_requests: true,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };

  const pAdmin = getStaffUiPermissions(admin);
  const pDeals = getStaffUiPermissions(dealsManager);
  const pNews = getStaffUiPermissions(newsManager);
  const pPricing = getStaffUiPermissions(pricingManager);
  const pContent = getStaffUiPermissions(contentManager);
  const pReviewer = getStaffUiPermissions(reviewer);

  // Admin checks
  assert(pAdmin.isAdmin === true, 'Admin should be admin');
  assert(pAdmin.canManageDeals === true, 'Admin should manage deals');
  assert(pAdmin.canManageNews === true, 'Admin should manage news');
  assert(pAdmin.canManagePricing === true, 'Admin should manage pricing');
  assert(pAdmin.canManageContent === true, 'Admin should manage content');
  assert(pAdmin.canManageMarketing === true, 'Admin should manage marketing');

  // Deals Manager checks
  assert(pDeals.canManageDeals === true, 'Deals manager should manage deals');
  assert(pDeals.canManageMarketing === true, 'Deals manager should have marketing flag');
  assert(pDeals.canManageNews === false, 'Deals manager should NOT manage news');

  // News Manager checks
  assert(pNews.canManageNews === true, 'News manager should manage news');
  assert(pNews.canManageMarketing === true, 'News manager should have marketing flag');

  // Pricing Manager checks
  assert(pPricing.canManagePricing === true, 'Pricing manager should manage pricing');
  assert(pPricing.canManageMarketing === true, 'Pricing manager should have marketing flag');

  // Content Manager checks
  assert(pContent.canManageContent === true, 'Content manager should manage content');
  assert(pContent.canManageMarketing === true, 'Content manager should have marketing flag');

  // Reviewer checks (Baseline)
  assert(pReviewer.canReviewIntake === true, 'Reviewer should review intake');
  assert(pReviewer.canManageDeals === false, 'Reviewer should NOT manage deals');

  console.log('PASSED: Permissions mapping for Batch 2H-D verified.');
}

async function run() {
  await verifyPermissions();
  console.log('--- Batch 2H-D Verification COMPLETED ---');
}

run().catch(err => {
  console.error('FAILED: Verification error:', err.message);
  process.exit(1);
});
