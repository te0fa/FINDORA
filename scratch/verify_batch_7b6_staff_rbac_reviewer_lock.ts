// scratch/verify_batch_7b6_staff_rbac_reviewer_lock.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

console.log('SUPABASE_URL:', supabaseUrl ? 'Defined' : 'UNDEFINED')
console.log('SUPABASE_SECRET_KEY:', supabaseServiceKey ? 'Defined' : 'UNDEFINED')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyReviewerLock() {
  console.log('--- VERIFYING BATCH 7B.6 STAFF RBAC LOCKDOWN ---')

  // 1. Fetch Reviewer Staff
  const { data: reviewer, error: revError } = await supabase
    .from('staff_members')
    .select('*')
    .eq('staff_role', 'reviewer')
    .single()

  if (revError || !reviewer) {
    console.error('❌ Could not find reviewer staff member. Ensure seed data exists.')
    return
  }

  console.log(`✅ Found Reviewer: ${reviewer.full_name} (${reviewer.staff_role})`)

  // 2. Fetch Admin Staff
  const { data: admin, error: admError } = await supabase
    .from('staff_members')
    .select('*')
    .eq('staff_role', 'admin')
    .single()

  if (admError || !admin) {
    console.error('❌ Could not find admin staff member.')
    return
  }

  console.log(`✅ Found Admin: ${admin.full_name} (${admin.staff_role})`)

  // 3. Test Navigation Visibility (Simulated)
  // We can't easily test the React UI here, but we verified the logic in layout.tsx
  console.log('ℹ️ Navigation visibility verified via code audit in src/app/[locale]/staff/layout.tsx')

  // 4. Verify Server Action Guards (DAL Level)
  // Reviewer should NOT have researcher permissions in DAL
  const { getStaffUiPermissions } = await import('../src/lib/dal/staff')
  
  const revPerms = getStaffUiPermissions(reviewer)
  const admPerms = getStaffUiPermissions(admin)

  console.log('\n--- Permission Comparison ---')
  console.log('Reviewer Perms:', JSON.stringify(revPerms, null, 2))
  console.log('Admin Perms:', JSON.stringify(admPerms, null, 2))

  const reviewerExpected = {
    isAdmin: false,
    canReviewIntake: true,
    canResearch: false,
    canSourceOffline: false,
    canReport: false,
    canManagePayments: false,
    canViewIntelligence: false,
    canManageCommunications: false,
    canManageAI: false,
    canManageArchive: false,
    canManageUsers: false,
    canManageMarketing: false
  }

  for (const [key, val] of Object.entries(reviewerExpected)) {
    if ((revPerms as any)[key] !== val) {
      console.error(`❌ Reviewer permission mismatch for ${key}: expected ${val}, got ${(revPerms as any)[key]}`)
    } else {
      console.log(`✅ Reviewer ${key} is correct (${val})`)
    }
  }

  // 4b. Verify Admin Permissions
  const adminExpected = {
    isAdmin: true,
    canViewIntelligence: true,
    canManageCommunications: true,
    canManageAI: true,
    canManageArchive: true,
    canManageUsers: true
  }

  for (const [key, val] of Object.entries(adminExpected)) {
    if ((admPerms as any)[key] !== val) {
      console.error(`❌ Admin permission mismatch for ${key}: expected ${val}, got ${(admPerms as any)[key]}`)
    } else {
      console.log(`✅ Admin ${key} is correct (${val})`)
    }
  }

  // 5. Verify AI Execution Scope
  // AI should only run on manual staff action (verified via code audit in ai-actions.ts)
  console.log('ℹ️ AI execution scope verified via code audit in src/app/[locale]/staff/workspace/[request_id]/ai-actions.ts')

  console.log('\n--- VERIFICATION COMPLETE ---')
}

verifyReviewerLock().catch(console.error)
