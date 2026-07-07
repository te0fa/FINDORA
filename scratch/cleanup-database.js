const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'SUPABASE_SECRET_KEY') supabaseSecret = value;
    }
  });
}

const client = createClient(supabaseUrl, supabaseSecret);

async function run() {
  console.log('--- STARTING COMPLETE DATABASE RESET AND CLEANUP ---');

  // 1. Fetch staff auth IDs to protect
  const { data: staff, error: staffErr } = await client.from('staff_members').select('auth_user_id');
  if (staffErr) {
    console.error('Error fetching staff:', staffErr.message);
    return;
  }
  const staffAuthIds = new Set(staff.map(s => s.auth_user_id).filter(Boolean));
  console.log('Preserving staff auth IDs:', Array.from(staffAuthIds));

  // 2. Fetch all auth users
  const { data: { users }, error: authErr } = await client.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) {
    console.error('Error listing auth users:', authErr.message);
    return;
  }

  // Delete non-staff auth users
  for (const user of users) {
    if (staffAuthIds.has(user.id)) {
      console.log(`Preserving staff user: ${user.email} (${user.id})`);
    } else {
      console.log(`Deleting auth user: ${user.email} (${user.id})...`);
      const { error: delErr } = await client.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`Failed to delete auth user ${user.id}:`, delErr.message);
      }
    }
  }

  // 3. Clear all dependent child tables to prevent foreign key violations
  console.log('Clearing child tables...');
  const tablesToClear = [
    'alert_events',
    'buyer_qa',
    'communication_preferences',
    'customer_contacts',
    'customer_discovery_interviews',
    'customer_intelligence_events',
    'customer_points_ledger',
    'customer_score_snapshots',
    'customer_segments',
    'customer_subscriptions',
    'customer_verification_events',
    'findora_deal_inquiries',
    'group_buying_members',
    'merchant_customer_feedback',
    'outbound_messages',
    'payments',
    'payment_intents',
    'platform_events',
    'price_alerts',
    'price_guarantees',
    'product_waitlists',
    'report_option_snapshots',
    'report_option_unlocks',
    'merchant_quotes',
    'online_merchant_quotes',
    'request_operational_states',
    'request_preferences',
    'request_disputes',
    'requests'
  ];

  for (const table of tablesToClear) {
    console.log(`Clearing table ${table}...`);
    // Delete all rows in the table
    const { error: clearErr } = await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id').limit(1);
    // If it doesn't have an 'id' column, delete by checking a common condition
    if (clearErr && clearErr.message.includes('column "id" does not exist')) {
      if (table.includes('preference') || table.includes('operational') || table.includes('dispute')) {
        await client.from(table).delete().neq('request_id', '00000000-0000-0000-0000-000000000000');
      } else {
        await client.from(table).delete().neq('customer_id', '00000000-0000-0000-0000-000000000000');
      }
    }
  }

  // 4. Clear all customers
  console.log('Clearing customers table...');
  const { error: custDelErr } = await client.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (custDelErr) {
    console.error('Error clearing customers:', custDelErr.message);
  } else {
    console.log('Customers table cleared successfully.');
  }

  console.log('--- DATABASE RESET AND CLEANUP COMPLETED ---');
}

run();
