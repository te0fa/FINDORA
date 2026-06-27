/**
 * AI Copilot runs on-demand for the current request only. It must not batch-process all requests unless a future admin-approved batch job explicitly allows it.
 */
import { NextResponse } from 'next/server'
import { executeOnlineResearch } from '@/lib/agents/research/run-online-research'

export async function POST(request: Request) {
  const { jobId, requestId, secret } = await request.json()

  // Simple security check for Phase 1 internal endpoint
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!jobId || !requestId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // Trigger research (this might take time, so ideally it should be handled by a worker)
  // But for Phase 1 as per "controlled execution", we can wait or start it in background.
  // We'll wait here for now since it's a controlled staff trigger.
  const result = await executeOnlineResearch(jobId, requestId)

  return NextResponse.json(result)
}
