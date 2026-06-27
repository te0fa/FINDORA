// scratch/test_gemini_fallback.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import * as Copilot from '../src/lib/ai/findora-copilot'

async function runTest() {
  console.log('--- GEMINI FALLBACK SMOKE TEST ---')
  console.log(`AI_ENABLED: ${process.env.AI_ENABLED}`)
  console.log(`AI_PROVIDER: ${process.env.AI_PROVIDER}`)

  try {
    const res = await Copilot.analyzeRequestIntake({
      title: 'Looking for high-quality sustainable cotton fabrics',
      description: 'I need 500 meters of organic GOTS certified cotton, white color, for a fashion project in Cairo.',
      language: 'en'
    })

    if (res.error) {
      console.log(`❌ Error: ${res.error}`)
    } else {
      console.log('✅ Gemini Success!')
      console.log('Summary:', res.summary)
      console.log('Risks:', res.risks)
    }
  } catch (err: any) {
    console.log(`❌ Crash: ${err.message}`)
  }
}

runTest()
