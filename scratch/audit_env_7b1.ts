// scratch/audit_env_7b1.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

function audit() {
  console.log('--- ENVIRONMENT AUDIT (SECRET-SAFE) ---')
  const vars = [
    'AI_ENABLED',
    'AI_PROVIDER',
    'AI_MODEL',
    'AI_API_KEY',
    'GEMINI_API_KEY',
    'TAVILY_API_KEY',
    'BRAVE_SEARCH_API_KEY'
  ]

  vars.forEach(v => {
    const val = process.env[v]
    console.log(`${v}: ${val ? '✅ PRESENT' : '❌ MISSING'}`)
  })
}

audit()
