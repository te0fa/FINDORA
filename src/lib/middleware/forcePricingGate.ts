// src/lib/middleware/forcePricingGate.ts

import { resolvePricing } from '@/lib/pricing/resolver'
import { generatePricingSuggestion } from '@/lib/pricing/aiAgent'

export interface PricingGateResult {
  decision: string
  pricing: {
    base_price: number
    promo_price: number | null
    final_price: number
    currency: string
    model: string
  }
  ai_insight: any
  routing: {
    requires_pricing_review: boolean
    requires_staff_confirmation: boolean
    can_auto_apply: boolean
  }
}

/**
 * Pricing Gate Middleware.
 * Intercepts request approvals, executes pricing logic, and forces manual staff validation.
 */
export async function forcePricingGate(request: any, aiResult?: any): Promise<PricingGateResult> {
  const serviceType = request.request_kind || 'everyday_purchase'
  
  // 1. Always call resolvePricing(serviceType)
  const resolvedPricing = await resolvePricing(serviceType)

  // 2. Always call generatePricingSuggestion()
  const context = {
    service_type: serviceType,
    category: request.category || 'general',
    urgency: request.urgency_level || 'medium',
    complexity: request.complexity_level || 'medium',
    budget: request.budget_max ? Number(request.budget_max) : undefined,
    exact_match: request.exact_match_requested === true
  }
  const aiSuggestion = await generatePricingSuggestion(context, resolvedPricing)

  // 3. Merge results into a single object
  const base_price = resolvedPricing.original_price || resolvedPricing.price
  const promo_price = resolvedPricing.is_promo ? resolvedPricing.price : null
  const final_price = resolvedPricing.price

  // 4. Return structure forcing staff confirmation
  return {
    decision: 'APPROVE',
    pricing: {
      base_price,
      promo_price,
      final_price,
      currency: resolvedPricing.currency || 'EGP',
      model: aiSuggestion.suggested_model || 'FIXED_FEE'
    },
    ai_insight: {
      recommended_price: aiSuggestion.recommended_price,
      confidence: aiSuggestion.confidence,
      reasoning: aiSuggestion.reasoning,
      suggested_model: aiSuggestion.suggested_model
    },
    routing: {
      requires_pricing_review: true,
      requires_staff_confirmation: true,
      can_auto_apply: false // Forced to false
    }
  }
}
