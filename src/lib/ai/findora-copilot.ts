// src/lib/ai/findora-copilot.ts
/**
 * AI Copilot runs on-demand per request only. It must not process all requests automatically.
 */

import { callAI, AIProviderConfig } from './provider';
import { COPILOT_SYSTEM_PROMPTS } from './prompts';
import {
  AICopilotResponse,
  IntakeAnalysis,
  PricingSuggestion,
  ResearchPlan,
  ReportAssistantOutput,
  CommunicationDraft,
  SafetyCheckResult,
  DashboardInsights,
  ResearchRetrievalOutput,
  ResearchSummarizationOutput,
  ResearchQuery,
  ResearchCandidate
} from './types';
import { getAIAgentConfigAdmin, logAICopilotRun, getAIFeatureStatus, logAIFeatureUsage } from '../dal/ai-control';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('ai/findora-copilot');


/**
 * Generic internal runner for copilot agents.
 * Handles config fetching, logging, and error mapping.
 */
async function runCopilotAgent<T>(params: {
  agentCode: string;
  systemPrompt: string;
  userPrompt: string;
  requestId?: string;
  staffId?: string;
  imageParts?: Array<{ mimeType: string; data: string }>;
}): Promise<{ data: T | null; error?: string; raw?: string; configUsed?: any }> {
  // 1. Check Global Feature Flag & Limits for Copilot Agents
  const status = await getAIFeatureStatus('flag_ai_copilot_agents')
  if (!status.enabled) {
    await logAIFeatureUsage({
      featureKey: 'flag_ai_copilot_agents',
      success: false,
      errorMessage: status.reason || 'Globally Disabled'
    })
    return { data: null, error: `AGENT_DISABLED: AI Copilot agents are disabled globally.` }
  }

  const agentConfig = await getAIAgentConfigAdmin(params.agentCode);

  if (!agentConfig.enabled) {
    return { data: null, error: `AGENT_DISABLED: ${params.agentCode} is disabled.` };
  }

  const configOverride: Partial<AIProviderConfig> = {
    provider: agentConfig.provider,
    model: agentConfig.model || undefined,
    temperature: Number(agentConfig.temperature),
    maxTokens: Math.max(agentConfig.max_tokens || 1500, 1500)
  };

  const startTime = Date.now();
  const response = await callAI<T>({
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    jsonMode: true,
    configOverride,
    imageParts: params.imageParts
  });

  // Log to database (Fire and forget, but handled within logAICopilotRun try/catch)
  const isRateLimited = response.error?.includes('AI_RATE_LIMITED');
  
  logAICopilotRun({
    requestId: params.requestId,
    staffId: params.staffId,
    agentCode: params.agentCode,
    provider: agentConfig.provider,
    model: agentConfig.model,
    inputSummary: { prompt_length: params.userPrompt.length },
    outputSummary: response.data ? { success: true } : { error: response.error },
    status: response.error ? (isRateLimited ? 'failed' : 'failed') : 'completed', // Explicitly failed if error
    errorMessage: response.error,
    tokenEstimate: 0, // Placeholder
    costEstimate: 0 // Placeholder
  });

  // Log to generic ai_usage_log
  await logAIFeatureUsage({
    featureKey: 'flag_ai_copilot_agents',
    success: !response.error,
    errorMessage: response.error || null,
    estimatedCost: 0.015,
    metadata: { agent_code: params.agentCode }
  })

  return { ...response, configUsed: agentConfig };
}

/**
 * A) analyzeRequestIntake
 */
export async function analyzeRequestIntake(params: {
  title: string;
  description: string;
  request_kind?: string;
  preferences?: any;
  language?: string;
  budget_min?: number;
  budget_max?: number;
  urgency?: string;
  reference_image_path?: string | null;
  request_id?: string;
  staff_id?: string;
  forceImageAnalysis?: boolean;
}): Promise<AICopilotResponse<IntakeAnalysis | null>> {
  let imageParts = undefined;

  if (params.reference_image_path) {
    try {
      const agentConfig = await getAIAgentConfigAdmin('intake_reviewer');
      if (agentConfig?.allow_create_research_items || params.forceImageAnalysis) {
        const { getReferenceImageBase64 } = await import('../dal/requests');
        const img = await getReferenceImageBase64(params.reference_image_path);
        imageParts = [img];
      } else {
        log.info('[AI_COPILOT] Image analysis is disabled for intake_reviewer in configuration. Skipping reference image.');
      }
    } catch (err) {
      log.warn('[AI_COPILOT] Failed to load reference image for intake analysis:', err);
    }
  }

  const result = await runCopilotAgent<IntakeAnalysis>({
    agentCode: 'intake_reviewer',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.intake_analysis,
    userPrompt: JSON.stringify({
      title: params.title,
      description: params.description,
      request_kind: params.request_kind,
      preferences: params.preferences,
      language: params.language,
      budget_min: params.budget_min,
      budget_max: params.budget_max,
      urgency: params.urgency
    }),
    requestId: params.request_id,
    staffId: params.staff_id,
    imageParts
  });

  const risks: string[] = [];
  if (result.data?.decision_support) {
    if (result.data.decision_support.risk_level === 'HIGH' || result.data.decision_support.risk_level === 'MEDIUM') {
      risks.push(`AI Sourcing Risk Level: ${result.data.decision_support.risk_level} - ${result.data.decision_support.decision_reason_en}`);
    }
  }
  if (result.data?.staff_view?.key_points) {
    risks.push(...result.data.staff_view.key_points);
  }

  return {
    summary: result.data?.ai_analysis?.summary_en || 'Intake analysis generated.',
    suggestions: result.data || null,
    risks,
    confidence: result.data?.ai_analysis?.confidence_score ?? 1.0,
    language: (params.language as 'en' | 'ar') || 'en',
    rawModelOutput: result.raw,
    error: result.error
  };
}

/**
 * B) suggestPricingReview
 */
export async function suggestPricingReview(params: {
  request_kind: string;
  description: string;
  preferences?: any;
  estimated_value?: number;
  effort_level?: string;
  risk_level?: string;
  value_level?: string;
  pricing_config: any;
  resolved_live_pricing?: {
    base_price: number;
    promo_price: number | null;
    effective_price: number;
    is_promo: boolean;
    promo_label_en?: string | null;
    promo_label_ar?: string | null;
    currency: string;
  };
  request_id?: string;
  staff_id?: string;
}): Promise<AICopilotResponse<PricingSuggestion | null>> {
  // Build a clean user prompt that includes the LIVE prices from DB
  const userPrompt = JSON.stringify({
    request_kind: params.request_kind,
    description: params.description,
    preferences: params.preferences,
    estimated_value: params.estimated_value,
    effort_level: params.effort_level,
    risk_level: params.risk_level,
    value_level: params.value_level,
    pricing_config: params.pricing_config,
    // Pass live pricing so AI respects current DB prices & promos
    resolved_live_pricing: params.resolved_live_pricing || null,
    PRICING_INSTRUCTION: params.resolved_live_pricing
      ? `IMPORTANT: Use the resolved_live_pricing data. The EFFECTIVE price is ${params.resolved_live_pricing.effective_price} EGP${
          params.resolved_live_pricing.is_promo
            ? ` (PROMO from base ${params.resolved_live_pricing.base_price} EGP — label: "${params.resolved_live_pricing.promo_label_en}")`
            : ' (base price)'
        }. Your suggested_final_price MUST be at or near the effective price. Only go higher if request complexity clearly justifies it.`
      : 'Use INTERNAL_PACKAGES base prices. Prefer the lowest matching package for clear/specific requests.'
  });

  const result = await runCopilotAgent<PricingSuggestion>({
    agentCode: 'pricing_advisor',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.pricing_suggestion,
    userPrompt,
    requestId: params.request_id,
    staffId: params.staff_id
  });

  // Derive confidence from risk_level (lower risk = higher confidence)
  const riskLevel = result.data?.risk_level || 'medium';
  const riskToConfidence: Record<string, number> = {
    low: 0.90,
    medium: 0.70,
    high: 0.50,
    very_high: 0.30
  };
  const derivedConfidence = riskToConfidence[riskLevel] ?? 0.60;

  return {
    summary: 'Pricing strategy suggestion based on package configuration.',
    suggestions: result.data || null,
    risks: result.data?.warnings || [],
    confidence: derivedConfidence,
    language: 'en',
    rawModelOutput: result.raw,
    error: result.error
  };
}

/**
 * C) generateResearchPlan
 */
export async function generateResearchPlan(params: {
  request_id: string;
  title: string;
  description: string;
  preferences?: any;
  staff_id?: string;
}): Promise<AICopilotResponse<ResearchPlan | null>> {
  const result = await runCopilotAgent<ResearchPlan>({
    agentCode: 'research_planner',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.research_planning,
    userPrompt: JSON.stringify(params),
    requestId: params.request_id,
    staffId: params.staff_id
  });

  return {
    summary: 'Strategic research plan for online and offline sourcing.',
    suggestions: result.data || null,
    risks: result.data?.red_flags || [],
    confidence: 0,
    language: result.data?.language || 'en',
    error: result.error
  };
}

/**
 * D) assistReportWriting
 */
export async function assistReportWriting(params: {
  request_info: any;
  snapshots: any[];
  is_unlocked: boolean;
  request_id?: string;
  staff_id?: string;
}): Promise<AICopilotResponse<ReportAssistantOutput | null>> {
  const result = await runCopilotAgent<ReportAssistantOutput>({
    agentCode: 'report_writer',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.report_writing,
    userPrompt: JSON.stringify(params),
    requestId: params.request_id,
    staffId: params.staff_id
  });

  return {
    summary: 'Draft report summaries and option notes.',
    suggestions: result.data || null,
    risks: result.data?.risk_warnings || [],
    confidence: 0,
    language: 'en',
    error: result.error
  };
}

/**
 * E) draftCustomerCommunication
 */
export async function draftCustomerCommunication(params: {
  template_type: string;
  preferred_language: string;
  request_code: string;
  request_title: string;
  current_stage: string;
  metadata?: any;
  request_id?: string;
  staff_id?: string;
}): Promise<AICopilotResponse<CommunicationDraft | null>> {
  const result = await runCopilotAgent<CommunicationDraft>({
    agentCode: 'communication_drafter',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.communication_drafting,
    userPrompt: JSON.stringify(params),
    requestId: params.request_id,
    staffId: params.staff_id
  });

  return {
    summary: `Draft message for ${params.template_type}`,
    suggestions: result.data || null,
    risks: [],
    confidence: 0,
    language: (params.preferred_language as 'en' | 'ar') || 'en',
    error: result.error
  };
}

/**
 * F) runTrustSafetyCheck
 */
export async function runTrustSafetyCheck(params: {
  content_to_check: string;
  context: 'report' | 'message';
  hidden_data_keys: string[];
  request_id?: string;
  staff_id?: string;
}): Promise<AICopilotResponse<SafetyCheckResult | null>> {
  const result = await runCopilotAgent<SafetyCheckResult>({
    agentCode: 'trust_safety_checker',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.safety_check,
    userPrompt: JSON.stringify(params),
    requestId: params.request_id,
    staffId: params.staff_id
  });

  return {
    summary: 'Trust & safety leak analysis.',
    suggestions: result.data || null,
    risks: result.data?.blocking_issues || [],
    confidence: 0,
    language: 'en',
    error: result.error
  };
}

/**
 * G) generateDashboardInsights
 */
export async function generateDashboardInsights(params: {
  funnel_metrics: any;
  staff_id?: string;
}): Promise<AICopilotResponse<DashboardInsights | null>> {
  const result = await runCopilotAgent<DashboardInsights>({
    agentCode: 'dashboard_insights',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.dashboard_insights,
    userPrompt: JSON.stringify(params),
    staffId: params.staff_id
  });

  return {
    summary: 'Funnel performance and bottleneck analysis.',
    suggestions: result.data || null,
    risks: [],
    confidence: 0,
    language: 'en',
    error: result.error
  };
}

/**
 * H) searchWebForResearch (Placeholder for Batch 7C)
 */
export async function searchWebForResearch(params: {
  query: string;
  max_results?: number;
}) {
  return {
    enabled: false,
    reason: "Search retrieval is not enabled in Batch 7B",
    candidates: []
  };
}

export async function runResearchRetrieval(params: {
  request_id: string;
  title: string;
  description: string;
  preferences?: any;
  reference_image_path?: string | null;
  staff_id?: string;
}): Promise<AICopilotResponse<ResearchRetrievalOutput | null>> {
  let imageParts = undefined;

  if (params.reference_image_path) {
    try {
      const { getReferenceImageBase64 } = await import('../dal/requests');
      const img = await getReferenceImageBase64(params.reference_image_path);
      imageParts = [img];
    } catch (err) {
      log.warn('[AI_COPILOT] Failed to load reference image for research retrieval:', err);
    }
  }

  const result = await runCopilotAgent<ResearchRetrievalOutput>({
    agentCode: 'research_retriever',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.research_retrieval,
    userPrompt: JSON.stringify({
      title: params.title,
      description: params.description,
      preferences: params.preferences
    }),
    requestId: params.request_id,
    staffId: params.staff_id,
    imageParts
  });

  return {
    summary: 'AI-driven product identification and search query optimization.',
    suggestions: result.data || null,
    risks: [],
    confidence: 0,
    language: 'en',
    error: result.error
  };
}

/**
 * Phase 3: Query Generation
 */
export async function generateResearchQueriesForRequest(params: {
  title: string;
  description: string;
  request_kind?: string;
  budget_min?: number;
  budget_max?: number;
  city?: string;
  preferences?: any;
  language?: string;
}) {
  const result = await runCopilotAgent<{
    queries: ResearchQuery[];
    notes: string;
    missing_info: string[];
  }>({
    agentCode: 'research_retriever',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.research_queries_generation,
    userPrompt: JSON.stringify(params),
  });

  return result;
}

/**
 * Phase 4: Web Retrieval
 */
export async function retrieveProductCandidates(params: {
  queries: ResearchQuery[];
  provider?: string;
}) {
  const { runSearchProvider } = await import('./search-providers');
  
  const allCandidates: any[] = [];
  const errors: string[] = [];

  // Parallel search with limit to avoid overloading
  const searchPromises = params.queries.slice(0, 8).map(q => 
    runSearchProvider(params.provider || 'google_custom_search', q.query, { maxResults: 5 })
  );

  const results = await Promise.all(searchPromises);

  for (const res of results) {
    if (res.error) {
      if (!errors.includes(res.error)) errors.push(res.error);
    }
    allCandidates.push(...res.candidates);
  }

  // Deduplicate by URL
  const uniqueCandidates = Array.from(new Map(allCandidates.map(item => [item.url, item])).values());

  return {
    candidates: uniqueCandidates,
    errors
  };
}

/**
 * Phase 5: AI Summarization & Ranking
 */
export async function summarizeAndRankResearchResults(params: {
  request: {
    title: string;
    description: string;
    preferences?: any;
  };
  results: any[];
}) {
  const result = await runCopilotAgent<ResearchSummarizationOutput>({
    agentCode: 'research_retriever',
    systemPrompt: COPILOT_SYSTEM_PROMPTS.research_summarization,
    userPrompt: JSON.stringify({
      request: params.request,
      search_results: params.results.slice(0, 20) // Limit input to Gemini
    }),
  });

  return result;
}
