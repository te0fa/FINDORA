// src/app/[locale]/staff/workspace/[request_id]/ai-actions.ts
/**
 * AI Copilot runs on-demand for the current request only. 
 * It must not batch-process all requests unless a future admin-approved batch job explicitly allows it.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import * as Copilot from '@/lib/ai/findora-copilot'
import { logPlatformEvent } from '@/lib/dal/intelligence'
import { INTERNAL_PACKAGES } from '@/lib/pricing/findoraPricing'

async function getAuthorizedStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Staff only')

  const permissions = getStaffUiPermissions(staff)
  return { staff, permissions }
}

export async function handleAnalyzeIntakeAI(params: {
  request_id: string;
  title: string;
  description: string;
  request_kind?: string;
  preferences?: any;
  language?: string;
  budget_min?: number;
  budget_max?: number;
  urgency?: string;
  reference_image_path?: string | null;
  forceImageAnalysis?: boolean;
}) {
  const { staff } = await getAuthorizedStaff()

  const { getAIFeatureStatus, logAIFeatureUsage } = await import('@/lib/dal/ai-control')
  const status = await getAIFeatureStatus('flag_ai_intake_review')
  if (!status.enabled) {
    await logAIFeatureUsage({
      featureKey: 'flag_ai_intake_review',
      success: false,
      errorMessage: status.reason || 'Disabled'
    })
    return {
      summary: 'Intake pre-screening is disabled.',
      suggestions: null,
      risks: [],
      confidence: 0,
      language: (params.language as 'en' | 'ar') || 'en',
      error: `FEATURE_DISABLED: ${status.reason || 'AI Intake Review is disabled.'}`
    }
  }

  const result = await Copilot.analyzeRequestIntake(params)

  await logAIFeatureUsage({
    featureKey: 'flag_ai_intake_review',
    success: !result.error,
    errorMessage: result.error || null,
    estimatedCost: 0.50,
    metadata: { request_id: params.request_id }
  })

  const { logTimelineEvent } = await import('@/lib/dal/timeline')
  await logTimelineEvent({
    requestId: params.request_id,
    transitionName: 'AI_INTAKE_RUN',
    notes: `AI Intake Review completed: ${result.summary}`,
    changedByStaffId: staff.id
  })

  await logPlatformEvent({
    eventType: 'research_started',
    actorType: 'staff',
    actorId: staff.id,
    requestId: params.request_id,
    metadata: { ai_copilot: 'intake_analysis', error: result.error }
  })

  // ORCHESTRATION LAYER: DB Updates & Workflow Routing
  if (result.suggestions) {
    try {
      const { createAdminClient } = await import('@/lib/dal/customers')
      const adminClient = await createAdminClient()

      const decision = result.suggestions.decision_support.suggested_decision;
      const dbDecision = decision === 'NEEDS_CLARIFICATION' ? 'needs_clarification' : decision === 'REJECT' ? 'reject' : 'approve';

      // Update request intake fields in DB (ONLY for UI/reporting consistency)
      // IMPORTANT: We save the FULL intake analysis as JSON into interpreted_summary
      // so the AI Intelligence Panel can extract brand, name, category, key_attributes
      const fullIntakeJson = JSON.stringify(result.suggestions)
      await adminClient
        .from('requests')
        .update({
          intake_ai_decision: dbDecision,
          // intake_summary holds the plain-text English summary (for quick display)
          intake_summary: result.suggestions.ai_analysis.summary_en,
          intake_ai_confidence: result.suggestions.ai_analysis.confidence_score,
          // interpreted_summary holds the FULL Intake JSON (for product detail extraction)
          interpreted_summary: fullIntakeJson
        })
        .eq('id', params.request_id)

      // Workflow routing: 1. Send to Online Research Pipeline if APPROVED
      if (decision === 'APPROVE') {
        const { runResearchRetrievalAction } = await import('@/lib/actions/research-ai')
        // Non-blocking trigger to allow intake review action to complete quickly
        runResearchRetrievalAction(params.request_id, staff.id).catch(err => {
          console.error('[ORCHESTRATION] Failed to automatically trigger online research:', err)
        })
      }

      // Workflow routing: 2. Send to Field Agent (Prefill Offline Quote Draft) if APPROVED and has brand/name
      if (decision === 'APPROVE') {
        const { saveMerchantQuote } = await import('@/lib/dal/staff')
        const prod = result.suggestions.ai_analysis.product
        const title = `${prod.brand} ${prod.name}`.trim() || params.title

        saveMerchantQuote({
          request_id: params.request_id,
          merchant_name: 'AI Pre-fill: Local Market Sourcing',
          product_title: title,
          price_amount: 0,
          availability_status: 'unknown',
          captured_by_staff_id: staff.id,
          notes: `AI Pre-fill Sourcing Intel:\n- Key Attributes: ${prod.key_attributes.join(', ')}\n- Suggested Decision Reason: ${result.suggestions.decision_support.decision_reason_en}`,
          category: prod.category
        }).catch(err => {
          console.error('[ORCHESTRATION] Failed to prefill merchant quote for field agent:', err)
        })
      }

      // Workflow routing: 3. Auto-trigger pricing if APPROVED
      if (decision === 'APPROVE') {
        try {
          const { updateRequestPricing } = await import('@/lib/dal/staff')
          
          // Trigger the pricing AI
          const pricingResult = await handleSuggestPricingAI({
            request_id: params.request_id,
            request_kind: params.request_kind || 'general',
            description: params.description,
            preferences: params.preferences,
            estimated_value: params.budget_max || params.budget_min,
            effort_level: 'medium', // Default fallback
            risk_level: result.suggestions.decision_support.risk_level.toLowerCase(),
            value_level: 'medium', // Default fallback
          })
          
          if (pricingResult.suggestions) {
            // Save the pricing to DB
            await updateRequestPricing({
              requestId: params.request_id,
              requestKind: params.request_kind || 'general',
              pricingModel: pricingResult.suggestions.suggested_pricing_model,
              paymentPolicy: pricingResult.suggestions.suggested_payment_policy,
              serviceFeeAmount: pricingResult.suggestions.suggested_final_price,
              pricingNotes: `AI Pricing Suggestion:\n- Package: ${pricingResult.suggestions.suggested_package_code}\n- Justification: ${pricingResult.suggestions.pricing_justification_en}`,
              staffId: staff.id
            })
          }
        } catch (pricingError) {
          console.error('[ORCHESTRATION] Failed to auto-trigger pricing:', pricingError)
        }
      }

    } catch (orchError) {
      console.error('[ORCHESTRATION] Failed during database updates or routing:', orchError)
    }
  }

  return result
}

export async function handleSuggestPricingAI(params: {
  request_id: string;
  request_kind: string;
  description: string;
  preferences?: any;
  estimated_value?: number;
  effort_level?: string;
  risk_level?: string;
  value_level?: string;
}) {
  const { staff } = await getAuthorizedStaff()
  const { resolvePricing } = await import('@/lib/pricing/resolver')

  let resolvedLive: any = undefined
  try {
    const resolved = await resolvePricing(params.request_kind)
    resolvedLive = {
      base_price: resolved.original_price ?? resolved.price,
      promo_price: resolved.is_promo ? resolved.price : null,
      effective_price: resolved.price,
      is_promo: resolved.is_promo,
      promo_label_en: resolved.promo_label_en,
      promo_label_ar: resolved.promo_label_ar,
      currency: resolved.currency
    }
  } catch (err) {
    console.error('Failed to resolve live pricing for AI strategist:', err)
  }

  const result = await Copilot.suggestPricingReview({
    ...params,
    resolved_live_pricing: resolvedLive,
    pricing_config: INTERNAL_PACKAGES
  })

  const { logTimelineEvent } = await import('@/lib/dal/timeline')
  await logTimelineEvent({
    requestId: params.request_id,
    transitionName: 'AI_PRICING_RUN',
    notes: `AI Sourcing & Pricing Suggestion: Suggested ${result.suggestions?.suggested_final_price || 0} EGP (${result.suggestions?.suggested_package_code || 'N/A'})`,
    changedByStaffId: staff.id
  })

  await logPlatformEvent({
    eventType: 'research_started',
    actorType: 'staff',
    actorId: staff.id,
    requestId: params.request_id,
    metadata: { ai_copilot: 'pricing_suggestion', error: result.error }
  })

  return result
}

export async function handleGenerateResearchPlanAI(params: {
  request_id: string;
  title: string;
  description: string;
  preferences?: any;
}) {
  const { staff } = await getAuthorizedStaff()

  const result = await Copilot.generateResearchPlan(params)

  await logPlatformEvent({
    eventType: 'research_started',
    actorType: 'staff',
    actorId: staff.id,
    metadata: { ai_copilot: 'research_planning', error: result.error }
  })

  return result
}

export async function handleAssistReportWritingAI(params: {
  request_info: any;
  snapshots: any[];
  is_unlocked: boolean;
}) {
  const { staff } = await getAuthorizedStaff()

  const result = await Copilot.assistReportWriting(params)

  await logPlatformEvent({
    eventType: 'report_preparing',
    actorType: 'staff',
    actorId: staff.id,
    metadata: { ai_copilot: 'report_writing', error: result.error }
  })

  return result
}

export async function handleDraftCommunicationAI(params: {
  template_type: string;
  preferred_language: string;
  request_code: string;
  request_title: string;
  current_stage: string;
  metadata?: any;
}) {
  const { staff } = await getAuthorizedStaff()

  const result = await Copilot.draftCustomerCommunication(params)

  await logPlatformEvent({
    eventType: 'clarification_needed',
    actorType: 'staff',
    actorId: staff.id,
    metadata: { ai_copilot: 'communication_drafting', error: result.error }
  })

  return result
}

export async function handleTrustSafetyCheckAI(params: {
  content_to_check: string;
  context: 'report' | 'message';
  hidden_data_keys: string[];
}) {
  const { staff } = await getAuthorizedStaff()

  const result = await Copilot.runTrustSafetyCheck(params)

  await logPlatformEvent({
    eventType: 'report_preparing',
    actorType: 'staff',
    actorId: staff.id,
    metadata: { ai_copilot: 'safety_check', error: result.error }
  })

  return result
}

export async function handleCreateAIDraftAction(params: {
  requestId: string;
  customerId: string;
  subject: string;
  body: string;
  language: string;
}) {
  const { staff } = await getAuthorizedStaff()
  const { createAdminClient } = await import('@/lib/dal/customers')

  const adminClient = await createAdminClient()
  
  // Resolve recipient
  const { data: customer } = await adminClient
    .from('customers')
    .select('email, full_name')
    .eq('id', params.customerId)
    .single()

  if (!customer?.email) throw new Error('Customer has no email')

  const { data, error } = await adminClient
    .from('outbound_messages')
    .insert({
      customer_id: params.customerId,
      request_id: params.requestId,
      channel: 'email',
      recipient: customer.email,
      rendered_subject: params.subject,
      rendered_body: params.body,
      status: 'draft',
      metadata: { ai_generated: true, generated_by_staff_id: staff.id }
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await logPlatformEvent({
    eventType: 'clarification_needed',
    actorType: 'staff',
    actorId: staff.id,
    metadata: { ai_copilot: 'draft_created', message_id: data.id }
  })

  return data
}

export async function handleGenerateResearchQueries(params: { request_id: string }) {
  const { staff } = await getAuthorizedStaff()
  const { getRequestWithPreferences } = await import('@/lib/dal/research')
  const { logAICopilotRun } = await import('@/lib/dal/ai-control')

  try {
    const request = await getRequestWithPreferences(params.request_id)

    const queryResult = await Copilot.generateResearchQueriesForRequest({
      title: request.title,
      description: request.raw_description,
      request_kind: request.request_kind,
      budget_min: request.preferences?.budget_min,
      budget_max: request.preferences?.budget_max,
      preferences: request.preferences,
      language: request.language
    })

    if (queryResult.error) {
      await logAICopilotRun({
        agentCode: 'research_retriever',
        requestId: params.request_id,
        staffId: staff.id,
        status: 'failed',
        errorMessage: queryResult.error,
        provider: 'none',
        inputSummary: { step: 'query_generation' }
      })
      return { error: queryResult.error }
    }

    return { data: queryResult.data }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function handleExecuteResearchQueries(params: {
  request_id: string;
  queries: any[];
  provider?: string;
}) {
  const { staff } = await getAuthorizedStaff()
  const { getRequestWithPreferences } = await import('@/lib/dal/research')
  const { logAICopilotRun } = await import('@/lib/dal/ai-control')

  try {
    const request = await getRequestWithPreferences(params.request_id)

    const retrievalResult = await Copilot.retrieveProductCandidates({
      queries: params.queries,
      provider: params.provider
    })

    if (retrievalResult.errors.length > 0 && retrievalResult.candidates.length === 0) {
      return { error: retrievalResult.errors.join('; ') }
    }

    const summaryResult = await Copilot.summarizeAndRankResearchResults({
      request: {
        title: request.title,
        description: request.raw_description,
        preferences: request.preferences
      },
      results: retrievalResult.candidates
    })

    await logAICopilotRun({
      agentCode: 'research_retriever',
      requestId: params.request_id,
      staffId: staff.id,
      status: summaryResult.error ? 'failed' : 'completed',
      errorMessage: summaryResult.error || (retrievalResult.errors.length ? retrievalResult.errors.join('; ') : undefined),
      provider: params.provider || 'google',
      outputSummary: {
         queries_count: params.queries.length,
         candidates_count: retrievalResult.candidates.length,
         provider: params.provider
      }
    })

    return summaryResult
  } catch (err: any) {
    return { error: `Research execution failed: ${err.message}` }
  }
}

export async function handleRunResearchRetrieval(params: {
  request_id: string;
  provider?: string;
}) {
  // Maintained for backward compatibility if needed, though we will migrate to split approach
  const queriesRes = await handleGenerateResearchQueries({ request_id: params.request_id })
  if (queriesRes.error || !queriesRes.data) return { error: queriesRes.error }
  
  return await handleExecuteResearchQueries({
    request_id: params.request_id,
    queries: queriesRes.data.queries,
    provider: params.provider
  })
}

export async function handleSaveResearchCandidate(params: {
  request_id: string;
  candidate: any;
}) {
  const { staff } = await getAuthorizedStaff()
  const { persistResearchItems, createResearchRun } = await import('@/lib/dal/research')

  // Ensure a run exists
  const run = await createResearchRun({
    request_id: params.request_id,
    run_kind: 'online_search',
    status: 'completed',
    summary: `AI candidate saved by staff: ${params.candidate.title}`,
  })

  const item = await persistResearchItems([{
    research_run_id: run.id,
    request_id: params.request_id,
    source_name: params.candidate.provider || 'ai_retrieval',
    product_title: params.candidate.title || 'Untitled Candidate',
    listing_url: params.candidate.url || null,
    currency_code: 'EGP',
    availability_status: 'in_stock',
    raw_payload: {
      quality_notes: params.candidate.why_relevant || null,
      ai_confidence: params.candidate.source_confidence,
      ai_relevance: params.candidate.estimated_relevance,
      ai_risks: params.candidate.risks,
      is_unverified: true,
      retrieved_at: new Date().toISOString()
    }
  }])

  return { success: true, item: item[0] }
}

export async function handleGetAiAnalysis(requestId: string) {
  await getAuthorizedStaff()
  const { loadAiAnalysis } = await import('@/lib/workflow/analysis')
  try {
    const analysis = await loadAiAnalysis(requestId)
    return { success: true, data: analysis }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function handleTriggerAiAnalysis(requestId: string, force = false) {
  const { staff } = await getAuthorizedStaff()
  const { triggerAIAnalysis } = await import('@/lib/workflow/analysis')
  try {
    const analysis = await triggerAIAnalysis(requestId, force)
    await logPlatformEvent({
      eventType: 'research_started',
      actorType: 'staff',
      actorId: staff.id,
      metadata: { ai_copilot: 'sourcing_analysis_trigger', force, success: !!analysis }
    })
    return { success: true, data: analysis }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Fetches full request intelligence for the AI Intelligence Panel.
 * Includes intake AI analysis, preferences/budget, and the sourcing analysis.
 */
/**
 * Saves manually entered product details by staff without running the AI.
 * Stores a structured JSON in interpreted_summary that is compatible with
 * what handleAnalyzeIntakeAI produces, so the AI Intelligence Panel can
 * display the data normally.
 */
export async function handleSaveManualIntakeDetails(params: {
  request_id: string;
  brand: string;
  name: string;
  category: string;
  key_attributes: string[];
  notes: string;
  budget_min?: number;
  budget_max?: number;
}) {
  const { staff } = await getAuthorizedStaff()
  const { createAdminClient } = await import('@/lib/dal/customers')
  const adminClient = await createAdminClient()

  // Build a minimal IntakeAnalysis-shaped JSON so the intelligence panel can parse it
  const manualIntakeJson = JSON.stringify({
    ai_analysis: {
      product: {
        brand: params.brand,
        name: params.name,
        category: params.category,
        key_attributes: params.key_attributes,
      },
      summary_en: `Manual entry by staff: ${params.brand ? params.brand + ' ' : ''}${params.name || params.category || 'Product'}${params.notes ? ' — ' + params.notes : ''}`,
      summary_ar: `إدخال يدوي بواسطة الموظف: ${params.brand ? params.brand + ' ' : ''}${params.name || params.category || 'منتج'}${params.notes ? ' — ' + params.notes : ''}`,
      confidence_score: 1.0,
    },
    decision_support: {
      suggested_decision: 'APPROVE',
      decision_reason_en: 'Details entered manually by staff.',
      decision_reason_ar: 'تم إدخال التفاصيل يدوياً بواسطة الموظف.',
      risk_level: 'LOW',
    },
    _source: 'manual_staff_entry',
    _entered_by: staff.id,
    _entered_at: new Date().toISOString(),
  })

  const summaryText = `${params.brand ? params.brand + ' ' : ''}${params.name || params.category || 'Product'}${params.notes ? ': ' + params.notes : ''}`

  const { error } = await adminClient
    .from('requests')
    .update({
      interpreted_summary: manualIntakeJson,
      intake_summary: summaryText,
      intake_ai_decision: 'approve',
      intake_ai_confidence: 1.0,
    })
    .eq('id', params.request_id)

  if (error) {
    console.error('[MANUAL_INTAKE] Failed to save manual intake details:', error)
    return { success: false, error: error.message }
  }

  const { logTimelineEvent } = await import('@/lib/dal/timeline')
  await logTimelineEvent({
    requestId: params.request_id,
    transitionName: 'AI_INTAKE_RUN',
    notes: `Manual intake details saved by staff: ${summaryText}`,
    changedByStaffId: staff.id
  })

  return { success: true }
}

export async function handleGetRequestIntelligence(requestId: string) {
  await getAuthorizedStaff()
  try {
    const { createAdminClient } = await import('@/lib/dal/customers')
    const adminClient = await createAdminClient()

    const [requestRes, preferencesRes, analysisRes] = await Promise.all([
      adminClient
        .from('requests')
        .select('id, title, raw_description, intake_summary, interpreted_summary, intake_ai_decision, intake_ai_confidence, request_kind')
        .eq('id', requestId)
        .single(),
      adminClient
        .from('request_preferences')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle(),
      (async () => {
        const { loadAiAnalysis } = await import('@/lib/workflow/analysis')
        return loadAiAnalysis(requestId)
      })()
    ])

    const request = requestRes.data
    const preferences = preferencesRes.data

    // Parse interpreted_summary — after our fix, this contains the FULL IntakeAnalysis JSON.
    // Shape: { ai_analysis: { product: { brand, name, category, key_attributes }, summary_en, summary_ar, confidence_score }, decision_support: {...} }
    let intakeProductData: any = null
    let intakeSummaryText: string | null = request?.intake_summary || null

    if (request?.interpreted_summary) {
      try {
        const parsed = JSON.parse(request.interpreted_summary)
        // Validate it's an Intake AI result (has ai_analysis.product structure)
        if (parsed?.ai_analysis?.product) {
          intakeProductData = parsed
        }
        // If it looks like old sourcing analysis format, ignore it
      } catch {
        // Not valid JSON, ignore
      }
    }

    return {
      success: true,
      data: {
        request,
        preferences,
        // intakeProductData: full IntakeAnalysis JSON if available (has .ai_analysis.product)
        intakeDetails: intakeProductData,
        // interpretedDetails: same as intakeProductData for backward compatibility
        interpretedDetails: intakeProductData,
        sourcingAnalysis: analysisRes
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

