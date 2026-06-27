// src/lib/ai/types.ts

export type AICopilotType = 
  | 'intake_analysis'
  | 'pricing_suggestion'
  | 'research_planning'
  | 'report_writing'
  | 'communication_drafting'
  | 'safety_check'
  | 'dashboard_insights'
  | 'research_retrieval';

export interface AICopilotResponse<T> {
  summary: string;
  suggestions: T;
  risks: string[];
  confidence: number;
  language: 'en' | 'ar';
  rawModelOutput?: string;
  error?: string;
}

export interface IntakeAnalysis {
  ai_analysis: {
    summary_en: string;
    summary_ar: string;
    confidence_score: number;
    product: {
      category: string;
      brand: string;
      name: string;
      key_attributes: string[];
    };
  };
  decision_support: {
    suggested_decision: "APPROVE" | "REJECT" | "NEEDS_CLARIFICATION";
    decision_reason_en: string;
    decision_reason_ar: string;
    risk_level: "LOW" | "MEDIUM" | "HIGH";
  };
  staff_view: {
    headline: string;
    key_points: string[];
    recommended_actions: string[];
  };
  customer_message: {
    status: "PENDING_REVIEW";
    message_ar: string;
    message_en: string;
  };
}

export interface PricingSuggestion {
  suggested_package_code: string;
  suggested_pricing_model: string;
  suggested_payment_policy: string;
  suggested_price_min: number;
  suggested_price_max: number;
  suggested_final_price: number;
  pricing_justification_en: string;
  pricing_justification_ar: string;
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  effort_level: 'low' | 'medium' | 'high' | 'very_high';
  value_level: 'small' | 'medium' | 'large' | 'major' | 'strategic';
  warnings: string[];
}

export interface ResearchPlan {
  research_strategy: string;
  online_sources_to_check: string[];
  offline_sources_to_check: string[];
  supplier_questions: string[];
  comparison_criteria: string[];
  red_flags: string[];
  expected_report_structure: string;
  language: 'en' | 'ar';
}

export interface ReportAssistantOutput {
  executive_summary_en: string;
  executive_summary_ar: string;
  recommendation_summary_en: string;
  recommendation_summary_ar: string;
  why_not_cheapest_en: string;
  why_not_cheapest_ar: string;
  option_notes: Record<string, string>;
  customer_safe_copy: string;
  staff_internal_notes: string;
  risk_warnings: string[];
}

export interface CommunicationDraft {
  subject: string;
  body: string;
  language: 'en' | 'ar';
  tone: string;
  warnings: string[];
}

export interface SafetyCheckResult {
  is_safe_to_release: boolean;
  blocking_issues: string[];
  warnings: string[];
  hidden_data_leak_detected: boolean;
  missing_disclaimers: boolean;
  payment_policy_consistency: boolean;
  recommended_fixes: string[];
}

export interface DashboardInsights {
  key_insights: string[];
  bottlenecks: string[];
  revenue_notes: string;
  conversion_notes: string;
  recommended_staff_actions: string[];
}

export interface ResearchQuery {
  query: string;
  language: string;
  purpose: string;
  priority: number;
}

export interface ResearchCandidate {
  title: string;
  url: string;
  provider: string;
  estimated_relevance: number;
  source_confidence: number;
  why_relevant: string;
  risks: string[];
  recommended_staff_action: 'verify_price' | 'contact_supplier' | 'compare_alternative' | 'discard' | string;
  image?: string;
  price_hint?: string;
}

export interface ResearchRetrievalOutput {
  identified_product: {
    brand: string;
    model: string;
    specs: string;
    category: string;
  };
  optimized_queries: string[];
  search_intent_analysis: string;
  candidate_criteria: {
    required: string[];
    preferred: string[];
    avoid: string[];
  };
}

export interface ResearchSummarizationOutput {
  summary: string;
  top_candidates: ResearchCandidate[];
  warnings: string[];
}
