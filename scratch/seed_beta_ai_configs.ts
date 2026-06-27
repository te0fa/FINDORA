// scratch/seed_beta_ai_configs.ts
import * as dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
console.log('Loading env from:', envPath)
dotenv.config({ path: envPath })

async function seed() {
  console.log('--- SEEDING BETA AI AGENT CONFIGS ---')
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  console.log('URL defined:', !!url)
  console.log('Key defined:', !!key)

  if (!url || !key) {
    throw new Error('Supabase URL or Secret Key missing. Check .env.local')
  }

  const db = createClient(url, key)

  const agents = [
    { 
      agent_code: 'intake_reviewer', 
      enabled: true, 
      provider: 'google', 
      model: 'gemini-2.0-flash', 
      temperature: 0.1, 
      max_tokens: 2000 
    },
    { 
      agent_code: 'pricing_advisor', 
      enabled: true, 
      provider: 'google', 
      model: 'gemini-2.0-flash', 
      temperature: 0.2, 
      max_tokens: 1500 
    },
    { 
      agent_code: 'trust_safety_checker', 
      enabled: true, 
      provider: 'google', 
      model: 'gemini-2.0-flash', 
      temperature: 0.0, 
      max_tokens: 1000 
    },
    { 
      agent_code: 'research_planner', 
      enabled: false, 
      provider: 'google', 
      model: 'gemini-2.0-flash', 
      temperature: 0.3, 
      max_tokens: 2000 
    },
    { 
      agent_code: 'research_retriever', 
      enabled: false, 
      provider: 'google', 
      model: 'gemini-2.0-flash', 
      temperature: 0.1, 
      max_tokens: 4000 
    }
  ]

  for (const agent of agents) {
    console.log(`Setting ${agent.agent_code} to enabled:${agent.enabled}...`)
    const { error } = await db
      .from('ai_agent_configs')
      .update({
        enabled: agent.enabled,
        provider: agent.provider,
        model: agent.model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        prompt_version: 'v1-beta'
      })
      .eq('agent_code', agent.agent_code)

    if (error) {
      console.error(`Failed to update ${agent.agent_code}:`, error.message)
    }
  }

  console.log('--- DONE ---')
}

seed().catch(console.error)
