import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createAdminClient } from '../src/lib/dal/customers';
import { getStaffUiPermissions, getStaffMemberByAuthUserId } from '../src/lib/dal/staff';
import * as AIControl from '../src/lib/dal/ai-control';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  console.log('--- BATCH 7B.5: REVIEWER ROLE UI AUDIT ---');

  const admin = await createAdminClient();

  // 1. Check Active Staff
  console.log('1. Checking active staff members...');
  const { data: staffList } = await admin.from('staff_members').select('*').eq('is_active', true);
  if (!staffList || staffList.length === 0) {
    console.log('❌ FAIL: No active staff members found.');
    process.exit(1);
  }
  console.log(`✅ Found ${staffList.length} active staff members.`);

  // 2. Staff Permission Resolver Test
  console.log('2. Testing permission resolver for "reviewer" role...');
  const mockReviewer = {
    id: 'test-reviewer-id',
    auth_user_id: 'test-auth-id',
    full_name: 'Test Reviewer',
    staff_role: 'reviewer',
    team_code: 'ops',
    is_active: true,
    can_approve_requests: true,
    can_manage_merchants: false,
    can_view_financials: false,
    extra_roles: []
  };
  const perms = getStaffUiPermissions(mockReviewer as any);
  console.log('Reviewer Permissions:', {
    canReviewIntake: perms.canReviewIntake,
    canResearch: perms.canResearch,
    canReport: perms.canReport,
    canAccessDashboard: perms.canAccessDashboard,
    isAdmin: perms.isAdmin
  });

  // 3. AI Config Table Audit
  console.log('3. Auditing ai_agent_configs...');
  const configs = await AIControl.getAIAgentConfigsAdmin();
  console.log(`✅ Found ${configs.length} configs.`);
  
  const required = [
    'intake_reviewer', 'pricing_advisor', 'research_planner', 
    'research_retriever', 'report_writer', 'communication_drafter', 
    'trust_safety_checker', 'dashboard_insights'
  ];
  const found = configs.map(c => c.agent_code);
  const unknown = found.filter(c => !required.includes(c));
  if (unknown.length > 0) {
    console.log(`⚠️ UNKNOWN agents found: ${unknown.join(', ')}`);
  } else {
    console.log('✅ No unknown agents found.');
  }

  // 4. Check Disabled Agents
  const restricted = ['research_retriever', 'communication_drafter', 'report_writer'];
  for (const code of restricted) {
    const cfg = configs.find(c => c.agent_code === code);
    if (cfg?.enabled) {
      console.log(`❌ FAIL: Agent ${code} should be DISABLED.`);
      process.exit(1);
    } else {
      console.log(`✅ Agent ${code} is correctly disabled.`);
    }
  }

  // 5. Staff Route Files Check
  console.log('5. Verifying staff route files...');
  const routes = [
    'src/app/[locale]/staff/dashboard/page.tsx',
    'src/app/[locale]/staff/queue/page.tsx',
    'src/app/[locale]/staff/workspace/[request_id]/page.tsx',
    'src/app/[locale]/staff/payments/page.tsx',
    'src/app/[locale]/staff/intelligence/ai/page.tsx'
  ];
  for (const route of routes) {
    if (fs.existsSync(path.join(process.cwd(), route))) {
      console.log(`✅ Route exists: ${route}`);
    } else {
      console.log(`❌ FAIL: Missing route file: ${route}`);
      process.exit(1);
    }
  }

  // 6. formatLogDate and toLocaleString Audit
  console.log('6. Auditing AIControlCenter for hydration safety...');
  const aiControlPath = path.join(process.cwd(), 'src/components/staff/ai/AIControlCenter.tsx');
  const aiControlContent = fs.readFileSync(aiControlPath, 'utf8');
  if (aiControlContent.includes('formatLogDate') && !aiControlContent.includes('.toLocaleString()')) {
    console.log('✅ AIControlCenter uses formatLogDate and avoids toLocaleString.');
  } else if (aiControlContent.includes('.toLocaleString()')) {
    console.log('❌ FAIL: AIControlCenter still contains .toLocaleString().');
    process.exit(1);
  }

  console.log('--- AUDIT SUCCESSFUL ---');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
