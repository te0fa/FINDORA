import { callAI } from '../src/lib/ai/provider'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  console.log('Testing callAI locally...')
  const aiPrompt = `
    Title: Test iPhone
    Description: Need an iPhone 15 Pro
    Budget: 50000 EGP
    Location: Cairo
    Urgency: high
  `

  const systemPrompt = `
    You are the FINDORA AI Sourcing Assistant.
    Analyze the user's request and build a structured explanation of what was understood.
    Provide the output in JSON format with exactly two main keys: "en" and "ar".
    Each language object must contain three string properties:
    1. "understanding": What we understood
    2. "requirements": Key requirements
    3. "outcome": Expected outcome

    Respond ONLY with valid JSON.
  `

  const res = await callAI({
    systemPrompt,
    userPrompt: aiPrompt,
    jsonMode: true
  })

  console.log('Result:', JSON.stringify(res, null, 2))
}

run()
