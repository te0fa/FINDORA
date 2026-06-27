import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  console.log('Enabling research_retriever...');
  const { error } = await supabase.from('ai_agent_configs').update({ enabled: true }).eq('agent_code', 'research_retriever');
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  console.log('Done');
}
run();
