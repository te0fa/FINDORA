import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createAdminClient } from './src/lib/dal/customers';

async function main() {
  const admin = await createAdminClient();
  const { data, error } = await (admin as any).rpc('fn_debug_view_definition', { view_name: 'v_request_ui_status' });
  if (error) {
    console.error('ERROR:', error.message);
    const { data: data2, error: error2 } = await (admin as any).rpc('fn_get_view_definition', { p_view_name: 'v_request_ui_status' });
    if (error2) console.error('ERROR 2:', error2.message);
    else console.log('VIEW DEF 2:', data2);
  } else {
    console.log('VIEW DEF:', data);
  }
}

main();
