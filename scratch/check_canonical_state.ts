import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/dal/customers';

async function checkState() {
  const supabase = await createAdminClient();
  const { data: requests, error } = await supabase
    .from('requests')
    .select('id, request_code, title, current_status, canonical_state');
    
  if (error) {
    console.error('Error fetching requests:', error.message);
    return;
  }
  
  console.log('Existing requests canonical_state list:');
  console.log(JSON.stringify(requests, null, 2));
}

checkState();
