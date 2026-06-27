import { createAdminClient } from '../src/lib/dal/customers';

async function checkFunction() {
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.rpc('execute_sql_internal', {
    sql_query: "select pg_get_functiondef('public.fn_hard_delete_request_with_backup(uuid, uuid, uuid, text)'::regprocedure);"
  } as any);

  if (error) {
    // If execute_sql_internal doesn't exist, try direct query via from().select() if possible, 
    // but usually rpc is better if I can find a way.
    // Actually, I can try to use the pg-get-functiondef directly if I have a proxy.
    console.error('Error fetching function def:', error);
    
    // Fallback: try to just create the patch based on what I know I wrote.
  } else {
    console.log('Function definition:', data);
  }
}

checkFunction();
