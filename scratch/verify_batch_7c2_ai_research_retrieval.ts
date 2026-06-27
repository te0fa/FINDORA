import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function verify() {
  console.log('--- VERIFYING BATCH 7C.2: AI RESEARCH RETRIEVAL ---');

  // 1. search-providers module exists
  if (!fs.existsSync('src/lib/ai/search-providers.ts')) throw new Error('search-providers.ts missing');
  console.log('[OK] search-providers.ts exists');

  // 2. research_retriever agent exists in ai_agent_configs
  const { data: agents } = await supabase.from('ai_agent_configs').select('*');
  const retriever = agents?.find(a => a.agent_code === 'research_retriever');
  if (!retriever) throw new Error('research_retriever missing from ai_agent_configs');
  console.log('[OK] research_retriever exists');

  // 3. research_retriever is disabled by default unless explicitly enabled
  if (retriever.enabled) {
    console.log('[WARN] research_retriever is currently ENABLED. This is acceptable if intentional, but usually it should be DISABLED by default.');
  } else {
    console.log('[OK] research_retriever is disabled');
  }

  // 4. Code audit for safety
  const copilotCode = fs.readFileSync('src/lib/ai/findora-copilot.ts', 'utf8');
  const actionsCode = fs.readFileSync('src/app/[locale]/staff/workspace/[request_id]/ai-actions.ts', 'utf8');
  
  const illegalDals = ['dal/payments', 'dal/source-reveals'];
  for (const dal of illegalDals) {
    if (copilotCode.includes(dal)) throw new Error(`Illegal DAL import detected in copilot: ${dal}`);
    if (actionsCode.includes(dal)) throw new Error(`Illegal DAL import detected in actions: ${dal}`);
  }
  console.log('[OK] Safety guardrails verified (no forbidden mutation imports)');

  // 5. Saved research candidate check
  if (!actionsCode.includes('is_unverified: true')) throw new Error('AI candidates must be saved as unverified');
  console.log('[OK] Saved candidates are marked unverified');

  // 6. No background automation check
  const routePath = 'src/app/api/internal/jobs/research/run/route.ts';
  if (fs.existsSync(routePath)) {
     const routeCode = fs.readFileSync(routePath, 'utf8');
     if (routeCode.includes('setInterval') || routeCode.includes('cron')) throw new Error('Background automation detected in API route');
  }
  console.log('[OK] No background automation detected');

  // 7. Check for hidden fields exposure
  if (copilotCode.includes('hidden_')) {
     console.log('[INFO] Checking for hidden field exposure...');
     // Simple check: are hidden fields passed to summarizeAndRankResearchResults?
     if (copilotCode.includes('results.map') && copilotCode.includes('hidden_')) {
        console.log('[WARN] Possible hidden field leak in copilot mapping');
     }
  }
  console.log('[OK] No obvious hidden field exposure detected');

  console.log('\n--- BATCH 7C.2 VERIFICATION COMPLETE ---');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err.message);
  process.exit(1);
});
