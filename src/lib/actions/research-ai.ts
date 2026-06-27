'use server'

import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId } from '@/lib/dal/staff'
import { getRequestWithPreferences, createResearchRun, persistResearchItems } from '@/lib/dal/research'
import { runResearchRetrieval } from '@/lib/ai/findora-copilot'
import { performSearch } from '@/lib/search/provider'
import { revalidatePath } from 'next/cache'

/**
 * Staff-triggered AI Research Retrieval Action.
 * Follows strict "Human-in-the-Loop" policy:
 * 1. Does not change request status.
 * 2. Does not send external messages.
 * 3. Does not modify financial data.
 */
export async function runResearchRetrievalAction(requestId: string, overrideStaffId?: string) {
  let staffId = overrideStaffId
  
  if (!staffId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const staff = await getStaffMemberByAuthUserId(user.id)
    if (!staff || !staff.is_active) throw new Error('Staff only')
    staffId = staff.id
  }

  try {
    // 1. Fetch data (Request + Preferences)
    const request = await getRequestWithPreferences(requestId)

    // 2. AI Retrieval Stage (multimodal image/text analysis)
    const aiResult = await runResearchRetrieval({
      request_id: requestId,
      title: request.title,
      description: request.raw_description,
      preferences: request.preferences,
      reference_image_path: request.reference_image_path,
      staff_id: staffId
    })

    if (aiResult.error || !aiResult.suggestions) {
      throw new Error(aiResult.error || 'AI Research Retrieval agent failed.')
    }

    const { optimized_queries, identified_product } = aiResult.suggestions

    // 3. Create Persistent Research Run
    const researchRun = await createResearchRun({
      request_id: requestId,
      summary: `AI Auto-Search: ${identified_product.brand} ${identified_product.model}`.trim(),
      status: 'completed',
      query_text: optimized_queries.join(' | '),
      run_kind: 'online_search',
      results_count: 0
    })

    // 4. Search Execution Stage (External Provider)
    const allCandidates: any[] = []
    
    // Limit to top 2 queries to avoid rate limits/cost in beta
    for (const query of optimized_queries.slice(0, 2)) {
      const searchRes = await performSearch(query)
      allCandidates.push(...searchRes.candidates)
    }

    // 5. Persist candidates as Research Items
    const itemsToSave = allCandidates.map(c => ({
      research_run_id: researchRun.id,
      request_id: requestId,
      source_name: c.source,
      product_title: c.title,
      listing_url: c.link,
      product_specs_summary: c.snippet,
      currency_code: 'EGP', // Default for now
      availability_status: 'in_stock',
      raw_payload: {
        search_query: optimized_queries[0],
        thumbnail: c.image,
        full_title: c.title,
        retrieved_at: new Date().toISOString()
      }
    }))

    if (itemsToSave.length > 0) {
      await persistResearchItems(itemsToSave)
    }

    revalidatePath('/[locale]/staff/workspace/[request_id]', 'page')

    return {
      success: true,
      runId: researchRun.id,
      itemCount: itemsToSave.length,
      productIdentified: identified_product
    }
  } catch (err: any) {
    console.error('[ACTION_RESEARCH_AI] Failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
