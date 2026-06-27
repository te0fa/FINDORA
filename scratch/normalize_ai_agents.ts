// scratch/normalize_ai_agents.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function normalize() {
  console.log('--- NORMALIZING AI AGENT CONFIGS ---')

  const updates = [
    { agent_code: 'intake_reviewer', enabled: true, provider: 'gemini' },
    { agent_code: 'pricing_advisor', enabled: true, provider: 'gemini' },
    { agent_code: 'trust_safety_checker', enabled: true, provider: 'gemini' },
    { agent_code: 'research_planner', enabled: false, provider: 'gemini' },
    { agent_code: 'research_retriever', enabled: false, provider: 'gemini' },
    { agent_code: 'report_writer', enabled: false, provider: 'gemini' },
    { agent_code: 'communication_drafter', enabled: false, provider: 'gemini' },
    { agent_code: 'dashboard_insights', enabled: false, provider: 'gemini' },
    { agent_code: 'hacker_agent', enabled: false, provider: 'gemini' }
  ]

  for (const update of updates) {
    const { error } = await supabase
      .from('ai_agent_configs')
      .update({ 
        enabled: update.enabled, 
        provider: update.provider,
        updated_at: new Date().toISOString()
      })
      .eq('agent_code', update.agent_code)
    
    if (error) {
      console.error(`[FAIL] Failed to update ${update.agent_code}: ${error.message}`)
    } else {
      console.log(`[OK] Updated ${update.agent_code}`)
    }
  }

  console.log('--- NORMALIZATION COMPLETE ---')
}

normalize().catch(err => {
  console.error('Normalization failed:', err)
  process.exit(1)
})
