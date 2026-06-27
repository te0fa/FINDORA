import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/dal/customers';

async function countDrift() {
  const supabase = await createAdminClient();
  
  // Get all request IDs
  const { data: requests, error: reqError } = await supabase
    .from('requests')
    .select('id, title, created_at, customer_id');
    
  if (reqError) {
    console.error('Error fetching requests:', reqError.message);
    return;
  }
  
  // Get all customer_request IDs
  const { data: custRequests, error: custError } = await supabase
    .from('customer_requests')
    .select('id');
    
  if (custError) {
    console.error('Error fetching customer_requests:', custError.message);
    return;
  }
  
  const custRequestIds = new Set(custRequests.map((r: any) => r.id));
  const missing = requests.filter((r: any) => !custRequestIds.has(r.id));
  
  console.log(`Total requests: ${requests.length}`);
  console.log(`Total customer_requests: ${custRequests.length}`);
  console.log(`Requests missing customer_requests: ${missing.length}`);
  if (missing.length > 0) {
    console.log('Sample missing requests:', JSON.stringify(missing.slice(0, 5), null, 2));
  }
}

countDrift();
