import { retryFailedWorkflow } from '../src/lib/workflow/orchestrator'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Mock Next.js 'after' globally since we are running in a node environment
import * as nextServer from 'next/server'
(nextServer as any).after = (fn: () => Promise<void>) => {
  console.log('Mocked after() triggered, running background task...')
  fn().then(() => {
    console.log('Background task finished successfully!')
  }).catch((err) => {
    console.error('Background task failed:', err)
  })
}

async function run() {
  const requestId = 'cfc7509a-9c53-4cd4-a1bc-11a816b43e39'
  console.log(`Starting local retry for request ${requestId}...`)
  await retryFailedWorkflow(requestId)
}

run()
