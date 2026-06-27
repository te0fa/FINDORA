// src/lib/agents/research/run-online-research.ts
/**
 * AI Copilot runs on-demand for the current request only.
 * It must not batch-process all requests unless a future admin-approved batch job explicitly allows it.
 */
import { runGroundedResearch } from '@/lib/gemini/client'
import { getRequestWithPreferences, createResearchRun, createResearchItems } from '@/lib/dal/research'
import { completeJob, failJob } from '@/lib/dal/staff'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('ResearchAgent')

export async function executeOnlineResearch(jobId: string, requestId: string) {
  log.info('Starting online research', { jobId, requestId })

  try {
    // 1. Load request context
    const request = await getRequestWithPreferences(requestId)

    // 2. Build prompt
    const prompt = `
      Perform extensive online research for a sourcing request:
      Title: ${request.title}
      Description: ${(request as Record<string, unknown>).raw_description ?? (request as Record<string, unknown>).description ?? ''}
      Preferences: ${JSON.stringify(request.preferences)}
      
      Look for potential merchants, products, or service providers that match these requirements.
      Provide a summary of the findings and a list of specific sources with titles, URLs, and snippets.
      Use Google Search grounding for accuracy.
    `

    // 3. Call Gemini
    const result = await runGroundedResearch(prompt) as {
      summary?: string
      findings?: Array<{
        source_name?: string
        title?: string
        url?: string
        snippet?: string
        relevance_score?: number
      }>
    }

    // 4. Persistence
    const run = await createResearchRun({
      requestId,
      summary: result.summary ?? null,
      status: 'completed'
    })

    const runId = (run as Record<string, unknown>).id as string

    await createResearchItems(
      (result.findings ?? []).map((f) => ({
        research_run_id: runId,
        request_id: requestId,
        source_name: f.source_name ?? 'Online Search',
        product_title: f.title || 'Untitled Candidate',
        listing_url: f.url || null,
        currency_code: 'EGP',
        availability_status: 'in_stock',
        raw_payload: {
          quality_notes: f.snippet || null,
          relevance_score: f.relevance_score ?? 0,
          retrieved_at: new Date().toISOString()
        }
      }))
    )

    // 5. Complete Job
    await completeJob(jobId, { research_run_id: runId })

    log.info('Online research completed', { jobId, requestId, runId })
    return { success: true, runId }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Research agent failed', { jobId, requestId, message })
    await failJob(jobId, message)
    return { success: false, error: message }
  }
}

