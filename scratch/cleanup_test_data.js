const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Secret Key not found in environment!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  // Clean up E2E test customers
  console.log('Fetching E2E test customers...');
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('id, full_name')
    .like('full_name', '[E2E_TEST]%');

  if (custError) {
    console.warn('Error fetching customers:', custError.message);
  } else if (customers && customers.length > 0) {
    console.log(`Found ${customers.length} E2E test customers.`);
    const customerIds = customers.map(c => c.id);

    // Clean up customer sessions or logs if any
    const customerChildTables = ['customer_sessions', 'customer_audit_logs'];
    for (const table of customerChildTables) {
      try {
        await supabase.from(table).delete().in('customer_id', customerIds);
        console.log(`Deleted rows from ${table}`);
      } catch (e) {
        // ignore
      }
    }

    const { error: deleteCustError } = await supabase
      .from('customers')
      .delete()
      .in('id', customerIds);

    if (deleteCustError) {
      console.error('Error deleting from customers table:', deleteCustError.message);
    } else {
      console.log('Successfully deleted E2E test customers!');
    }
  } else {
    console.log('No E2E test customers found.');
  }
}

cleanup().catch(console.error);
