import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import type { Database } from '@/types/database.types'

type ResearchRunInsert = Database['public']['Tables']['research_runs']['Insert']
type ResearchItemInsert = Database['public']['Tables']['research_items']['Insert']

export async function getRequestWithPreferences(requestId: string): Promise<Record<string, any>> {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestError) {
    throw new Error(requestError.message)
  }

  const { data: preferences, error: preferencesError } = await supabase
    .from('request_preferences')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle()

  if (preferencesError) {
    throw new Error(preferencesError.message)
  }

  return Object.assign({}, request ?? {}, { preferences })
}

export async function createResearchRun(params:
  | {
    requestId: string
    summary?: string | null
    status?: string
    jobId?: string | null
    searchScope?: string
    queryText?: string | null
    resultsCount?: number
    startedAt?: string | null
    finishedAt?: string | null
    runKind?: string
  }
  | {
    request_id: string
    summary?: string | null
    status?: string
    job_id?: string | null
    search_scope?: string
    query_text?: string | null
    results_count?: number
    started_at?: string | null
    finished_at?: string | null
    run_kind?: string
  }
) {
  const adminClient = await createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = ('requestId' in params
    ? {
      request_id: params.requestId,
      status: params.status ?? 'completed',
      job_id: params.jobId ?? null,
      search_scope: params.searchScope ?? 'all',
      query_text: params.queryText ?? null,
      started_at: params.startedAt ?? null,
      finished_at: params.finishedAt ?? null,
      run_kind: params.runKind ?? 'online_search',
    }
    : {
      request_id: params.request_id,
      status: params.status ?? 'completed',
      job_id: params.job_id ?? null,
      search_scope: params.search_scope ?? 'all',
      query_text: params.query_text ?? null,
      started_at: params.started_at ?? null,
      finished_at: params.finished_at ?? null,
      run_kind: params.run_kind ?? 'online_search',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

  const { data, error } = await (adminClient as any)
    .from('research_runs')
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function persistResearchItems(items: ResearchItemInsert[]) {
  const adminClient = await createAdminClient()

  if (!items.length) return []

  const { data, error } = await (adminClient as any)
    .from('research_items')
    .insert(items)
    .select()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function addManualResearchItem(params: {
  request_id: string
  source_name: string
  product_title: string
  listing_url?: string
  price_amount?: number
  currency_code?: string
  availability_status?: string
  product_specs_summary?: string
  notes?: string
  captured_by_staff_id?: string
}) {
  const adminClient = await createAdminClient()
  const { logOperationalEvent } = await import('./audit')

  // 1. Ensure there is a manual research run for this request
  const { data: existingRuns } = await (adminClient as any)
    .from('research_runs')
    .select('id')
    .eq('request_id', params.request_id)
    .eq('run_kind', 'online_search')
    .order('created_at', { ascending: false })
    .limit(1)

  let runId: string

  if (existingRuns && existingRuns.length > 0) {
    runId = existingRuns[0].id
  } else {
    // Create a new manual run
    const newRun = await createResearchRun({
      request_id: params.request_id,
      run_kind: 'online_search',
      status: 'completed',
      summary: 'Manual findings added by researcher',
    })
    runId = newRun.id
  }

  // 2. Add the research item
  const { data, error } = await (adminClient as any)
    .from('research_items')
    .insert({
      research_run_id: runId,
      request_id: params.request_id,
      source_name: params.source_name,
      product_title: params.product_title,
      listing_url: params.listing_url || null,
      price_amount: params.price_amount || null,
      currency_code: params.currency_code || 'EGP',
      availability_status: params.availability_status || 'in_stock',
      product_specs_summary: params.product_specs_summary || null,
      raw_payload: {
        manual_notes: params.notes || null,
        added_at: new Date().toISOString(),
      }
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // AUDIT LOG (Non-blocking)
  if (params.captured_by_staff_id) {
    await logOperationalEvent({
      requestId: params.request_id,
      staffId: params.captured_by_staff_id,
      eventName: 'ONLINE_FINDING_ADDED',
      metadata: { 
        research_item_id: data.id,
        run_id: runId
      }
    });
  }

  return data
}

/* compatibility export for existing agent code */
export async function createResearchItems(items: ResearchItemInsert[]) {
  return persistResearchItems(items)
}