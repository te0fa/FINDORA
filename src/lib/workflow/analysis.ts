// src/lib/workflow/analysis.ts
import { createAdminClient } from '@/lib/dal/customers';
import { callAI } from '@/lib/ai/provider';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('workflow/analysis')

export interface StructuredAnalysis {
  summary: string;
  budget_range: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  category: string;
  recommended_flow: 'online_only' | 'offline_only' | 'online_and_offline';
}

export interface BilingualAnalysis {
  en: StructuredAnalysis;
  ar: StructuredAnalysis;
  meta: Record<string, any>;
}

export async function loadAiAnalysis(requestId: string): Promise<BilingualAnalysis | null> {
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from('requests')
    .select('interpreted_summary, intake_summary, intake_internal_reasoning')
    .eq('id', requestId)
    .single();

  if (error || !data) return null;

  // 1. Fallback to interpreted_summary only.
  // NOTE: intake_summary is a PLAIN TEXT string (e.g. English AI summary sentence).
  // interpreted_summary may be either:
  //   (a) the full IntakeAnalysis JSON (written by handleAnalyzeIntakeAI)
  //   (b) a legacy structured analysis JSON with "en" and "ar" keys
  if (data.interpreted_summary) {
    try {
      const parsed = JSON.parse(data.interpreted_summary);
      // Case (b): legacy structured bilingual format
      if (parsed?.en?.summary && parsed?.ar?.summary) {
        return {
          en: parsed.en,
          ar: parsed.ar,
          meta: data.intake_internal_reasoning ? (() => { try { return JSON.parse(data.intake_internal_reasoning); } catch { return {}; } })() : {}
        };
      }
      // Case (a): Intake AI JSON — build a minimal sourcing-analysis view from it
      if (parsed?.ai_analysis) {
        const ai = parsed.ai_analysis;
        const prod = ai.product || {};
        const decisionSupport = parsed.decision_support || {};
        const summaryEn = ai.summary_en || data.intake_summary || '';
        const summaryAr = ai.summary_ar || data.intake_summary || summaryEn;
        return {
          en: {
            summary: summaryEn,
            budget_range: 'N/A',
            priority: (decisionSupport.risk_level === 'HIGH' ? 'HIGH' : decisionSupport.risk_level === 'URGENT' ? 'URGENT' : 'NORMAL') as 'NORMAL' | 'HIGH' | 'URGENT',
            category: prod.category || 'general',
            recommended_flow: 'online_and_offline' as const,
          },
          ar: {
            summary: summaryAr,
            budget_range: 'N/A',
            priority: (decisionSupport.risk_level === 'HIGH' ? 'HIGH' : decisionSupport.risk_level === 'URGENT' ? 'URGENT' : 'NORMAL') as 'NORMAL' | 'HIGH' | 'URGENT',
            category: prod.category || 'general',
            recommended_flow: 'online_and_offline' as const,
          },
          meta: { source: 'intake_ai', analyzed_at: new Date().toISOString() }
        };
      }
    } catch {
      // Not valid JSON — treat as raw text summary
      return {
        en: { summary: data.interpreted_summary, budget_range: 'N/A', priority: 'NORMAL', category: 'general', recommended_flow: 'online_only' },
        ar: { summary: data.intake_summary || data.interpreted_summary, budget_range: 'N/A', priority: 'NORMAL', category: 'general', recommended_flow: 'online_only' },
        meta: {}
      };
    }
  }

  // 2. Last resort — just use intake_summary as plain text
  if (data.intake_summary) {
    return {
      en: { summary: data.intake_summary, budget_range: 'N/A', priority: 'NORMAL', category: 'general', recommended_flow: 'online_only' },
      ar: { summary: data.intake_summary, budget_range: 'N/A', priority: 'NORMAL', category: 'general', recommended_flow: 'online_only' },
      meta: {}
    };
  }

  return null;
}

export async function saveAiAnalysis(requestId: string, analysis: BilingualAnalysis): Promise<boolean> {
  const adminClient = await createAdminClient();

  let mergedEn = { ...analysis.en };
  let mergedAr = { ...analysis.ar };
  
  try {
    const { data: currentReq } = await adminClient
      .from('requests')
      .select('interpreted_summary, intake_summary')
      .eq('id', requestId)
      .single();
      
    if (currentReq?.interpreted_summary) {
      try {
        const parsed = JSON.parse(currentReq.interpreted_summary);
        if (parsed && typeof parsed === 'object') {
          mergedEn = { ...parsed, ...analysis.en };
        }
      } catch {
        // interpreted_summary is not valid JSON, proceed with pure overwrite
      }
    }
    // intake_summary is intentionally NOT parsed here — it's a plain text field
  } catch (e) {
    // Existing data is not valid JSON or query failed, proceed with pure overwrite
  }

  const { error } = await adminClient
    .from('requests')
    .update({
      interpreted_summary: JSON.stringify(mergedEn),
      intake_summary: JSON.stringify(mergedAr),
      intake_internal_reasoning: JSON.stringify(analysis.meta || {})
    })
    .eq('id', requestId);

  if (!error) {
    log.info('[AI_ANALYSIS_SAVED]', requestId);
    return true;
  }
  
  log.error('[AI_ANALYSIS_SAVE_FAILED]', error);
  return false;
}

export async function triggerAIAnalysis(requestId: string, force = false): Promise<BilingualAnalysis | null> {
  // Check duplicate prevention
  if (!force) {
    const existing = await loadAiAnalysis(requestId);
    if (existing) {
      log.info(`[AI_ANALYSIS] Using existing analysis for ${requestId} to avoid extra costs.`);
      return existing;
    }
  }

  const adminClient = await createAdminClient();
  const { data: request } = await adminClient
    .from('requests')
    .select('title, raw_description, intake_summary, interpreted_summary, intake_ai_decision')
    .eq('id', requestId)
    .single();

  if (!request) return null;

  const { data: preferences } = await adminClient
    .from('request_preferences')
    .select('*')
    .eq('request_id', requestId)
    .single();

  try {
    const systemPrompt = `
      You are the FINDORA Sourcing Analyst.
      Analyze the sourcing request and return a structured analysis in JSON format.
      The output must contain exactly two main keys: "en" and "ar".
      Each language object must contain exactly:
      - "summary": string (detailed analysis of the request, incorporating any detected product context or brand attributes if available in the intake notes)
      - "budget_range": string (estimated price bracket)
      - "priority": "NORMAL" | "HIGH" | "URGENT"
      - "category": string (e.g. electronics, apparel, furniture)
      - "recommended_flow": "online_only" | "offline_only" | "online_and_offline"

      Respond ONLY with valid JSON.
    `;

    const userPrompt = `
      Title: ${request.title}
      Description: ${request.raw_description}
      Customer Preferences (Including True Budget): ${JSON.stringify(preferences || {})}
      Intake AI Decision: ${request.intake_ai_decision || 'None'}
      Intake Summary/Notes: ${request.intake_summary || 'None'}
      Interpreted Summary: ${request.interpreted_summary || 'None'}
    `;

    const aiRes = await callAI<any>({
      systemPrompt,
      userPrompt,
      jsonMode: true
    });

    if (aiRes.error || !aiRes.data) {
      throw new Error(aiRes.error || 'AI returned empty output');
    }

    const analysis: BilingualAnalysis = {
      en: aiRes.data.en,
      ar: aiRes.data.ar,
      meta: { analyzed_at: new Date().toISOString() }
    };

    await saveAiAnalysis(requestId, analysis);

    // AUTOMATIC PRICING & CLASSIFICATION ENGINE
    try {
      let suggestedKind: 'everyday_purchase' | 'high_value_deals' | 'projects_supplies' = 'everyday_purchase';
      const category = String(analysis.en.category || '').toLowerCase();
      const budget = String(analysis.en.budget_range || '').toLowerCase();

      if (
        category.includes('material') || 
        category.includes('finish') || 
        category.includes('construction') || 
        category.includes('project') || 
        category.includes('furniture') || 
        category.includes('supply') || 
        category.includes('supplies') || 
        category.includes('office') || 
        category.includes('bulk')
      ) {
        suggestedKind = 'projects_supplies';
      } else if (
        category.includes('car') || 
        category.includes('vehicle') || 
        category.includes('real estate') || 
        category.includes('luxury') || 
        category.includes('laptop') || 
        category.includes('phone') || 
        category.includes('watch') ||
        budget.includes('5000') || 
        budget.includes('10000') || 
        budget.includes('500') || 
        budget.includes('1000') ||
        budget.includes('high')
      ) {
        suggestedKind = 'high_value_deals';
      } else {
        suggestedKind = 'everyday_purchase';
      }

      const { resolvePricing } = await import('@/lib/pricing/resolver');
      const resolved = await resolvePricing(suggestedKind, adminClient);
      const finalPrice = resolved.price || 299;

      await adminClient
        .from('requests')
        .update({
          request_kind: suggestedKind,
          service_fee_amount: finalPrice,
          pricing_model: 'fixed_fee',
          payment_policy: 'pay_after_preview',
          pricing_notes: `Auto-classified Sourcing Plan: ${suggestedKind}. Resolved auto-pricing service fee: ${finalPrice} EGP.`
        })
        .eq('id', requestId);

      log.info(`[AUTO_PRICING] Successfully classified ${requestId} as ${suggestedKind} with service fee ${finalPrice} EGP`);
    } catch (pricingErr: any) {
      log.warn('[AUTO_PRICING_FAILED] Failed to auto-classify/price request:', pricingErr.message);
    }

    return analysis;

  } catch (err: any) {
    log.error("[AI_ANALYSIS_FAIL] Sourcing analysis failed:", err.message);
    return null;
  }
}
