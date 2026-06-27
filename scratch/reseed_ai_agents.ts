import { createAdminClient } from '../src/lib/dal/customers';

async function reseedAgents() {
  const db = await createAdminClient();
  const modelFallback = process.env.AI_MODEL || 'gemini-2.5-flash';

  const requiredAgents = [
    'intake_reviewer',
    'pricing_advisor',
    'research_planner',
    'research_retriever',
    'report_writer',
    'communication_drafter',
    'trust_safety_checker',
    'dashboard_insights'
  ];

  console.log('--- AI AGENT CONFIG RESEED ---');

  // 1. Get existing agents
  const { data: existingAgents } = await db.from('ai_agent_configs').select('*');
  const existingCodes = (existingAgents || []).map(a => a.agent_code);

  console.log('Existing agent codes:', existingCodes);

  // 2. Upsert required agents (Disabled by default)
  for (const code of requiredAgents) {
    const { error } = await db.from('ai_agent_configs').upsert({
      agent_code: code,
      enabled: false,
      provider: 'gemini',
      model: modelFallback,
      temperature: 0.2,
      safety_level: 'strict'
    }, { onConflict: 'agent_code' });

    if (error) {
      console.error(`Error upserting agent ${code}:`, error.message);
    } else {
      console.log(`Upserted agent: ${code} (Disabled)`);
    }
  }

  // 3. Disable legacy/mismatched agents
  const legacyCodes = existingCodes.filter(c => !requiredAgents.includes(c));
  if (legacyCodes.length > 0) {
    console.log('Disabling legacy/mismatched agents:', legacyCodes);
    for (const code of legacyCodes) {
      const { error } = await db.from('ai_agent_configs').update({ enabled: false }).eq('agent_code', code);
      if (error) console.error(`Error disabling legacy agent ${code}:`, error.message);
    }
  }

  console.log('--- RESEED COMPLETE ---');
}

reseedAgents().catch(console.error);
