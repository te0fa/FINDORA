import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createAdminClient } from '../src/lib/dal/customers';

async function main() {
  const db = await createAdminClient();
  const { data, error } = await db.from('v_request_ui_status').select('*').limit(1);
  if (error) {
    console.log("Error fetching view data:", error);
  } else {
    console.log("View record:", data[0]);
  }
}

main();
