import { createAdminClient } from '../src/lib/dal/customers';

async function verifyProtectedGuard() {
  const db = await createAdminClient();
  console.log('--- BATCH 7B.6: PROTECTED SYSTEM DATA GUARD VERIFIER ---');

  // 1. Check table existence
  const tables = ['staff_members', 'communication_templates', 'ai_agent_configs'];
  for (const t of tables) {
    const { count, error } = await db.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`❌ Table ${t} check failed: ${error.message}`);
    } else {
      console.log(`✅ Table ${t} exists (Count: ${count})`);
    }
  }

  // 2. Confirm at least one staff member
  const { count: staffCount } = await db.from('staff_members').select('*', { count: 'exact', head: true });
  if (!staffCount || staffCount === 0) {
    console.error('❌ No staff members found. Pre-requisite failed.');
    process.exit(1);
  }

  // 3. Test DELETE block on communication_templates
  console.log('\nTesting DELETE block on communication_templates...');
  const { error: deleteError } = await db.from('communication_templates').delete().eq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError && deleteError.message.includes('PROTECTED_TABLE_DELETE_BLOCKED')) {
    console.log('✅ DELETE successfully blocked: ' + deleteError.message);
  } else {
    console.error('❌ DELETE was NOT blocked or returned wrong error: ' + (deleteError?.message || 'Success?'));
  }

  // 4. Test DELETE block on ai_agent_configs
  console.log('Testing DELETE block on ai_agent_configs...');
  const { error: deleteError2 } = await db.from('ai_agent_configs').delete().eq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError2 && deleteError2.message.includes('PROTECTED_TABLE_DELETE_BLOCKED')) {
    console.log('✅ DELETE successfully blocked: ' + deleteError2.message);
  } else {
    console.error('❌ DELETE was NOT blocked: ' + (deleteError2?.message || 'Success?'));
  }

  // 5. Test Column Immutability on ai_agent_configs
  console.log('\nTesting Column Immutability on ai_agent_configs (agent_code)...');
  const { data: agents } = await db.from('ai_agent_configs').select('*').limit(1);
  if (agents && agents[0]) {
    const original = agents[0];
    const { error: updateError } = await db.from('ai_agent_configs').update({ agent_code: 'hacker_agent' }).eq('id', original.id);
    if (updateError && updateError.message.includes('PROTECTED_COLUMN_UPDATE_BLOCKED')) {
      console.log('✅ Update to agent_code successfully blocked: ' + updateError.message);
    } else {
      console.error('❌ Update to agent_code was NOT blocked: ' + (updateError?.message || 'Success?'));
    }

    // 6. Test Allowed Update
    console.log('Testing Allowed Update (enabled toggle)...');
    const originalEnabled = original.enabled;
    const { error: allowUpdateError } = await db.from('ai_agent_configs').update({ enabled: !originalEnabled }).eq('id', original.id);
    if (allowUpdateError) {
      console.error('❌ Allowed update failed: ' + allowUpdateError.message);
    } else {
      console.log('✅ Allowed update (enabled toggle) worked.');
      // Restore
      await db.from('ai_agent_configs').update({ enabled: originalEnabled }).eq('id', original.id);
      console.log('✅ Restored original value.');
    }
  }

  // 7. Test Column Immutability on communication_templates
  console.log('\nTesting Column Immutability on communication_templates (template_code)...');
  const { data: templates } = await db.from('communication_templates').select('*').limit(1);
  if (templates && templates[0]) {
    const original = templates[0];
    const { error: updateError } = await db.from('communication_templates').update({ template_code: 'hacker_template' }).eq('id', original.id);
    if (updateError && updateError.message.includes('PROTECTED_COLUMN_UPDATE_BLOCKED')) {
      console.log('✅ Update to template_code successfully blocked: ' + updateError.message);
    } else {
      console.error('❌ Update to template_code was NOT blocked: ' + (updateError?.message || 'Success?'));
    }
  }

  // 8. Test Column Immutability on staff_members
  console.log('\nTesting Column Immutability on staff_members (auth_user_id)...');
  const { data: staff } = await db.from('staff_members').select('*').limit(1);
  if (staff && staff[0]) {
    const original = staff[0];
    const { error: updateError } = await db.from('staff_members').update({ auth_user_id: '00000000-0000-0000-0000-000000000000' }).eq('id', original.id);
    if (updateError && updateError.message.includes('PROTECTED_COLUMN_UPDATE_BLOCKED')) {
      console.log('✅ Update to auth_user_id successfully blocked: ' + updateError.message);
    } else {
      console.error('❌ Update to auth_user_id was NOT blocked: ' + (updateError?.message || 'Success?'));
    }
  }

  console.log('\n--- VERIFICATION COMPLETE ---');
}

verifyProtectedGuard().catch(console.error);
