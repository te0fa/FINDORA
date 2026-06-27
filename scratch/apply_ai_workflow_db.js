// scratch/apply_ai_workflow_db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const sql = `
DO $$ 
BEGIN
    -- 1. Add ai_summary_en and ai_summary_ar to requests if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'ai_summary_en') THEN
        ALTER TABLE public.requests ADD COLUMN ai_summary_en text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'ai_summary_ar') THEN
        ALTER TABLE public.requests ADD COLUMN ai_summary_ar text;
    END IF;

    -- 2. Create request_messages table
    CREATE TABLE IF NOT EXISTS public.request_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
        customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
        sender_type text NOT NULL, -- 'system', 'customer', 'staff'
        subject text,
        body text NOT NULL,
        channel text NOT NULL DEFAULT 'email', -- 'email', 'whatsapp', 'sms'
        created_at timestamptz DEFAULT now()
    );

    -- 3. Enable RLS on request_messages
    ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

    -- 4. Policies for request_messages
    DROP POLICY IF EXISTS "Staff manage request_messages" ON public.request_messages;
    CREATE POLICY "Staff manage request_messages" ON public.request_messages FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff_members
            WHERE auth_user_id = auth.uid() AND is_active = true
        )
    );

    DROP POLICY IF EXISTS "Customers view own request_messages" ON public.request_messages;
    CREATE POLICY "Customers view own request_messages" ON public.request_messages FOR SELECT USING (
        customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid())
    );

END $$;
`;

async function run() {
  console.log('Running AI workflow migrations on Supabase remote DB...');
  const rpcs = ['exec_sql', 'execute_sql', 'run_sql'];
  let success = false;

  for (const rpc of rpcs) {
    console.log(`Trying RPC: ${rpc}`);
    try {
      const { data, error } = await supabase.rpc(rpc, { 
        sql_query: sql, 
        query: sql, 
        sql: sql 
      });
      
      if (!error) {
        console.log(`Success executing SQL with RPC: ${rpc}`);
        success = true;
        break;
      } else {
        console.log(`Failed with RPC ${rpc}:`, error.message);
      }
    } catch (e) {
      console.log(`Error calling RPC ${rpc}:`, e.message);
    }
  }

  if (success) {
    console.log("Migration executed successfully!");
  } else {
    console.log("Could not execute SQL via RPC. If this is a restricted environment, we will fallback to standard columns and mock/metadata fallbacks.");
  }
}

run();
