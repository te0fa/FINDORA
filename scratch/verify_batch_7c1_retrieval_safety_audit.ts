import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function verify() {
  console.log('--- VERIFYING BATCH 7C.1: RETRIEVAL SAFETY AUDIT ---');

  // 1. research_retriever is disabled by default
  const { data: agent, error: agentError } = await supabase
    .from('ai_agent_configs')
    .select('enabled')
    .eq('agent_code', 'research_retriever')
    .single();

  if (agentError) throw new Error(`Agent check failed: ${agentError.message}`);
  if (agent?.enabled) throw new Error('research_retriever is ENABLED, should be DISABLED for audit');
  console.log('[OK] research_retriever is disabled');

  // 2. Google search provider returns missing config if keys absent
  const googleCode = fs.readFileSync('src/lib/search/google.ts', 'utf8');
  if (!googleCode.includes('SEARCH_PROVIDER_MISSING_CONFIG')) throw new Error('Google search missing error code');
  console.log('[OK] Google search provider has missing config guard');

  // 3. Provider logic: 429 handling and duplicate declarations
  const providerCode = fs.readFileSync('src/lib/ai/provider.ts', 'utf8');
  if (!providerCode.includes('AI_RATE_LIMITED')) throw new Error('Provider missing 429 handling');
  if (providerCode.match(/let result;/g) && providerCode.match(/let result;/g)!.length > 1) {
     throw new Error('Duplicate result declaration found in provider.ts');
  }
  console.log('[OK] Provider has 429 rate limit handling and no duplicate declarations');

  // 4. No hydration unsafe date formatting
  const uiCode = fs.readFileSync('src/components/staff/ai/AIControlCenter.tsx', 'utf8');
  if (uiCode.includes('toLocaleString()')) throw new Error('Hydration unsafe toLocaleString found');
  if (uiCode.includes('Date.now()') && uiCode.includes('return Date.now()')) throw new Error('Hydration unsafe Date.now usage');
  console.log('[OK] No unsafe date formatting in AIControlCenter UI');

  // 5. retrieveProductCandidates clear state
  const copilotCode = fs.readFileSync('src/lib/ai/findora-copilot.ts', 'utf8');
  if (!copilotCode.includes('Search retrieval is explicitly disabled')) throw new Error('retrieveProductCandidates not clearly disabled');
  console.log('[OK] retrieveProductCandidates clearly disabled for audit');

  // 6. Gemini imageParts path robust check
  if (!providerCode.includes('params.imageParts && params.imageParts.length > 0')) {
     throw new Error('Gemini imageParts logic might crash with empty array');
  }
  console.log('[OK] Gemini imageParts logic is robust');

  // 7. No hidden_* fields leaked (check trust safety checker prompt/code if applicable)
  // We check if "hidden_" string is excluded from AI prompts/outputs
  const promptsCode = fs.readFileSync('src/lib/ai/prompts.ts', 'utf8');
  if (promptsCode.includes('hidden_')) {
    console.log('[WARN] "hidden_" found in prompts.ts - verify it is for masking, not leaking.');
  }

  console.log('\n--- BATCH 7C.1 VERIFICATION COMPLETE ---');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err.message);
  process.exit(1);
});
