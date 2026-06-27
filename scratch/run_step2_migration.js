const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

async function runMigration() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error('Missing credentials');
    return;
  }

  const supabase = createClient(url, key);

  const sql = `
DO $$ 
BEGIN
    -- 1. Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'assigned_reviewer_staff_id') THEN
        ALTER TABLE public.requests ADD COLUMN assigned_reviewer_staff_id uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'reviewer_assignment_status') THEN
        ALTER TABLE public.requests ADD COLUMN reviewer_assignment_status text NOT NULL DEFAULT 'unassigned';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'reviewer_assigned_at') THEN
        ALTER TABLE public.requests ADD COLUMN reviewer_assigned_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'reviewer_assigned_by_staff_id') THEN
        ALTER TABLE public.requests ADD COLUMN reviewer_assigned_by_staff_id uuid;
    END IF;

    -- 2. Add Constraints
    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS fk_requests_assigned_reviewer;
    ALTER TABLE public.requests 
        ADD CONSTRAINT fk_requests_assigned_reviewer 
        FOREIGN KEY (assigned_reviewer_staff_id) REFERENCES public.staff_members(id);

    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS fk_requests_reviewer_assigned_by;
    ALTER TABLE public.requests 
        ADD CONSTRAINT fk_requests_reviewer_assigned_by 
        FOREIGN KEY (reviewer_assigned_by_staff_id) REFERENCES public.staff_members(id);

    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS ck_reviewer_assignment_status;
    ALTER TABLE public.requests 
        ADD CONSTRAINT ck_reviewer_assignment_status 
        CHECK (reviewer_assignment_status IN ('unassigned', 'assigned'));

    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS ck_reviewer_assignment_consistency;
    ALTER TABLE public.requests 
        ADD CONSTRAINT ck_reviewer_assignment_consistency 
        CHECK (
            (reviewer_assignment_status = 'unassigned' AND 
             assigned_reviewer_staff_id IS NULL AND 
             reviewer_assigned_at IS NULL AND 
             reviewer_assigned_by_staff_id IS NULL)
            OR
            (reviewer_assignment_status = 'assigned' AND 
             assigned_reviewer_staff_id IS NOT NULL)
        );

    -- 3. Add Indexes
    CREATE INDEX IF NOT EXISTS idx_requests_assigned_reviewer ON public.requests(assigned_reviewer_staff_id);
    CREATE INDEX IF NOT EXISTS idx_requests_assignment_status ON public.requests(reviewer_assignment_status);
    CREATE INDEX IF NOT EXISTS idx_requests_assignment_composite ON public.requests(reviewer_assignment_status, assigned_reviewer_staff_id);
END $$;
`;

  console.log('Attempting to run migration via RPC...');
  
  const rpcs = ['exec_sql', 'execute_sql', 'run_sql'];
  let success = false;

  for (const rpc of rpcs) {
    console.log(`Trying RPC: ${rpc}`);
    try {
      const { data, error } = await supabase.rpc(rpc, { sql_query: sql, query: sql, sql: sql });
      if (!error) {
        console.log(`Success with RPC: ${rpc}`);
        success = true;
        break;
      } else {
        console.log(`Failed with RPC ${rpc}:`, error.message);
      }
    } catch (e) {
      console.log(`Error calling RPC ${rpc}:`, e.message);
    }
  }

  if (!success) {
    console.log('Migration via RPC failed. Checking if columns already exist...');
  }

  // Verification Query
  console.log('Verifying columns in public.requests...');
  const { data: cols, error: verifyError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'requests')
    .in('column_name', [
      'assigned_reviewer_staff_id',
      'reviewer_assignment_status',
      'reviewer_assigned_at',
      'reviewer_assigned_by_staff_id'
    ]);

  if (verifyError) {
    console.error('Verification query failed:', verifyError.message);
  } else {
    console.log('Verification successful. Columns found:', cols);
    if (cols.length === 4) {
      console.log('ALL 4 COLUMNS PRESENT.');
    } else {
      console.log(`Only ${cols.length}/4 columns present.`);
    }
  }
}

runMigration();
