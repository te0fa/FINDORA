import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function verify() {
  console.log('--- VERIFYING BATCH 7C: AI RESEARCH RETRIEVAL ---');

  // 1. Check if research_retriever is enabled
  const { data: agent, error: agentError } = await supabase
    .from('ai_agent_configs')
    .select('enabled, provider, model')
    .eq('agent_code', 'research_retriever')
    .single();

  if (agentError) throw new Error(`Agent check failed: ${agentError.message}`);
  if (!agent?.enabled) throw new Error('research_retriever is NOT enabled');
  console.log(`[OK] research_retriever is enabled (${agent.provider}/${agent.model})`);

  // 2. Check for core files
  const requiredFiles = [
    'src/lib/actions/research-ai.ts',
    'src/lib/search/provider.ts',
    'src/lib/search/google.ts',
    'src/lib/ai/findora-copilot.ts',
    'src/lib/ai/provider.ts'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  }
  console.log('[OK] All core files present');

  // 3. Verify StartRequestForm changes (simple check)
  const formContent = fs.readFileSync('src/app/[locale]/start-request/StartRequestForm.tsx', 'utf8');
  if (!formContent.includes('image_search_intent')) throw new Error('StartRequestForm missing image_search_intent field');
  console.log('[OK] StartRequestForm updated with image intent logic');

  // 4. Verify Actions changes
  const actionContent = fs.readFileSync('src/app/[locale]/start-request/actions.ts', 'utf8');
  if (!actionContent.includes('image_search_intent')) throw new Error('start-request/actions.ts missing image_search_intent handling');
  console.log('[OK] start-request/actions.ts updated for persistence');

  console.log('\n--- BATCH 7C VERIFICATION COMPLETE ---');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err.message);
  process.exit(1);
});
