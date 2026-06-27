
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
async function run() {
  const { data } = await supabase.from('ai_agent_configs').select('agent_code, enabled').order('agent_code');
  console.log(JSON.stringify(data, null, 2));
}
run();
