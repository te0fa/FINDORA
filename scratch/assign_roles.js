const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseSecret);

async function run() {
  const staffMemberId = 'c1d6d4d7-fb4a-4989-ae85-4f329f089e61'; // zrzor1 (zrzortrials1@gmail.com)

  // Check if reporter role already exists for this staff member
  const { data: existing, error: findError } = await supabase
    .from('staff_member_roles')
    .select('*')
    .eq('staff_member_id', staffMemberId)
    .eq('role_code', 'reporter')
    .maybeSingle();

  if (findError) {
    console.error('Error finding role:', findError);
    return;
  }

  if (existing) {
    console.log('Existing role record found:', existing);
    const { data: updated, error: updateError } = await supabase
      .from('staff_member_roles')
      .update({ is_active: true })
      .eq('id', existing.id)
      .select();

    if (updateError) {
      console.error('Error updating role:', updateError);
    } else {
      console.log('Successfully activated role:', updated);
    }
  } else {
    console.log('No existing role record. Inserting new one...');
    const { data: inserted, error: insertError } = await supabase
      .from('staff_member_roles')
      .insert({
        staff_member_id: staffMemberId,
        role_code: 'reporter',
        is_active: true
      })
      .select();

    if (insertError) {
      console.error('Error inserting role:', insertError);
    } else {
      console.log('Successfully inserted role:', inserted);
    }
  }
}

run();
