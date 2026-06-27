const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is missing');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('--- Inspecting Constraints on source_reveals ---');
  const { data: constraints, error: constError } = await supabase.rpc('fn_exec_sql', {
    p_sql: `
        SELECT conname, pg_get_constraintdef(c.oid) as def
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE conrelid = 'source_reveals'::regclass;
    `
  });

  if (constError) {
    console.log('❌ Constraints fetch error:', constError.message);
  } else {
    console.log('✅ Constraints for source_reveals:', JSON.stringify(constraints, null, 2));
  }

  console.log('\n--- Inspecting Columns of public.payments ---');
  const { data: colsPay, error: errPay } = await supabase.rpc('fn_exec_sql', {
    p_sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'payments' AND table_schema = 'public';
    `
  });
  if (errPay) {
    console.log('❌ payments columns error:', errPay.message);
  } else {
    console.log('✅ payments columns:', colsPay);
  }

  console.log('\n--- Inspecting Columns of public.payment_intents ---');
  const { data: colsPI, error: errPI } = await supabase.rpc('fn_exec_sql', {
    p_sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'payment_intents' AND table_schema = 'public';
    `
  });
  if (errPI) {
    console.log('❌ payment_intents columns error:', errPI.message);
  } else {
    console.log('✅ payment_intents columns:', colsPI);
  }
}

main().catch(console.error);
