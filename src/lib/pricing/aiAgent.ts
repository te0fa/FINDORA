// src/lib/pricing/aiAgent.ts

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ResolvedPricing } from './resolver'
import { createLogger } from '@/lib/utils/logger'
import { getAIFeatureStatus, logAIFeatureUsage } from '@/lib/dal/ai-control'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/dal/customers'

const log = createLogger('pricing/aiAgent')

export interface PricingSuggestionContext {
  service_type: string
  category?: string
  urgency: 'low' | 'medium' | 'high'
  complexity: 'simple' | 'medium' | 'complex'
  budget?: number
  exact_match: boolean
}

export interface PricingSuggestion {
  recommended_price: number
  confidence: number
  reasoning: string
  suggested_model: 'FIXED_FEE' | 'VARIABLE_FEE' | 'HYBRID' | 'CUSTOM_QUOTE'
}

/**
 * AI pricing layer for decision support only. Never directly overrides the DB.
 */
export async function generatePricingSuggestion(
  context: PricingSuggestionContext,
  basePricing: ResolvedPricing
): Promise<PricingSuggestion> {
  const { urgency, complexity, exact_match, budget } = context

  // 1. Enforce strict rule-based deterministic pricing adjustments first
  let adjustedPrice = basePricing.price

  if (urgency === 'high') {
    adjustedPrice *= 1.25 // +25%
  } else if (urgency === 'low') {
    adjustedPrice *= 0.90 // -10%
  }

  if (complexity === 'complex') {
    adjustedPrice *= 1.30 // +30%
  } else if (complexity === 'simple') {
    adjustedPrice *= 0.90 // -10%
  }

  if (exact_match) {
    adjustedPrice *= 1.15 // +15%
  }

  // Round price to nearest integer
  adjustedPrice = Math.round(adjustedPrice)

  // 1.5 Check Feature Flag and Rate Caps BEFORE calling AI
  // TODO: upgrade to Redis/Upstash when user base grows beyond ~5K active sessions
  const status = await getAIFeatureStatus('flag_ai_pricing_suggestions')
  if (!status.enabled) {
    log.info(`[AI_PRICING] AI suggestions are disabled: ${status.reason || 'Flag off'}. Using fallback.`)
    await logAIFeatureUsage({
      featureKey: 'flag_ai_pricing_suggestions',
      success: false,
      errorMessage: status.reason || 'Disabled'
    })
    return {
      recommended_price: adjustedPrice,
      confidence: 0.70,
      reasoning: `[تنبيه: محرك الذكاء الاصطناعي غير نشط] تم تطبيق التسعير الحسابي التلقائي. السعر الأساسي: ${basePricing.price} EGP، السعر المعدل بعد دراسة مستوى الاستعجال والتعقيد هو ${adjustedPrice} EGP.`,
      suggested_model: 'FIXED_FEE'
    }
  }

  // Calculate hash of all inputs affecting the prompt to prevent false cache hits
  const cacheInput = {
    urgency,
    complexity,
    exact_match,
    budget: budget ?? null,
    service_type: basePricing.service_type,
    category: context.category ?? 'general',
    base_price: basePricing.price,
    base_currency: basePricing.currency,
    base_original_price: basePricing.original_price,
    base_is_promo: basePricing.is_promo
  }

  const cacheKey = crypto
    .createHash('sha256')
    .update(JSON.stringify(cacheInput))
    .digest('hex')

  const db = (await createAdminClient()) as any
  const nowStr = new Date().toISOString()

  // TODO: upgrade to Redis/Upstash when user base grows beyond ~5K active sessions
  try {
    const { data: cacheData, error: cacheError } = await db
      .from('ai_response_cache')
      .select('response_value')
      .eq('cache_key', cacheKey)
      .gt('expires_at', nowStr)
      .maybeSingle()

    if (!cacheError && cacheData) {
      log.info(`[AI_PRICING] Cache hit for key: ${cacheKey}`)
      return cacheData.response_value as any as PricingSuggestion
    }
  } catch (cacheErr: any) {
    log.warn('[AI_PRICING] Failed to read AI cache:', cacheErr.message)
  }

  // 2. Invoke Gemini for rich reasoning and model recommendation (Decision Support Only)
  try {
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Gemini API key is not configured')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    const prompt = `
You are the FINDORA AI Sourcing Pricing Advisor. Your role is strictly DECISION SUPPORT ONLY. You never modify the database or override the base pricing.

Base Pricing Rules:
- Service Key/Type: ${basePricing.service_type}
- Base Price: ${basePricing.price} ${basePricing.currency}
- Original Price: ${basePricing.original_price || 'N/A'}
- Promo Status: ${basePricing.is_promo ? 'Active Promo' : 'Regular'}

Client Sourcing Request Context:
- Category: ${context.category || 'general'}
- Urgency: ${urgency} (Math adjustment applied)
- Complexity: ${complexity} (Math adjustment applied)
- exact_match requested: ${exact_match ? 'Yes' : 'No'} (Math adjustment applied)
- Customer Budget: ${budget ? `${budget} EGP` : 'Not specified'}

Standard Deterministic Adjusted Price: ${adjustedPrice} EGP

Analyze the request and provide:
1. "recommended_price": Ensure you start with the standard adjusted price of ${adjustedPrice} EGP, but you may recommend minor context-aware tweaks if budget is very sensitive or premium items are requested.
2. "confidence": A confidence score between 0.0 and 1.0 based on how well the inputs map to catalog templates.
3. "reasoning": A professional reasoning explanation (in Arabic for our staff members to review) explaining the base price, the adjustments applied, and why this suggested model fits the customer's request.
4. "suggested_model": One of: "FIXED_FEE" (standard fixed sourcing fee), "VARIABLE_FEE" (e.g. commission-based for strategic items), "HYBRID" (fixed base + percentage), "CUSTOM_QUOTE" (needs custom staff evaluation).

Output strict JSON only, conforming to this schema:
{
  "recommended_price": number,
  "confidence": number,
  "reasoning": "string",
  "suggested_model": "FIXED_FEE" | "VARIABLE_FEE" | "HYBRID" | "CUSTOM_QUOTE"
}
`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    })

    const response = await result.response
    const text = response.text()
    const parsed = JSON.parse(text)

    await logAIFeatureUsage({
      featureKey: 'flag_ai_pricing_suggestions',
      success: true,
      estimatedCost: 0.01
    })

    const suggestionResult: PricingSuggestion = {
      recommended_price: Number(parsed.recommended_price || adjustedPrice),
      confidence: Number(parsed.confidence || 0.85),
      reasoning: parsed.reasoning || `تم تعديل السعر بناءً على معايير البحث العاجل ومستوى التعقيد. السعر المقترح هو ${adjustedPrice} EGP.`,
      suggested_model: parsed.suggested_model || 'FIXED_FEE'
    }

    // Save cache entry (expires in 24 hours)
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await db.from('ai_response_cache').insert({
        cache_key: cacheKey,
        feature_key: 'flag_ai_pricing_suggestions',
        response_value: suggestionResult as any,
        expires_at: expiresAt
      })

      // Clean up expired cache items concurrently to keep the table size small
      await db.from('ai_response_cache').delete().lt('expires_at', nowStr)
    } catch (saveCacheErr: any) {
      log.warn('[AI_PRICING] Failed to save AI response to cache:', saveCacheErr.message)
    }

    return suggestionResult
  } catch (err: any) {
    log.error('[AIPricingAgent Error] Failed to generate AI suggestion:', err.message)
    await logAIFeatureUsage({
      featureKey: 'flag_ai_pricing_suggestions',
      success: false,
      errorMessage: err.message || String(err)
    })
    // Safe deterministic fallback suggestions if Gemini is down or fails
    return {
      recommended_price: adjustedPrice,
      confidence: 0.70,
      reasoning: `[تنبيه: محرك الذكاء الاصطناعي غير متصل] تم تطبيق التسعير الحسابي التلقائي. السعر الأساسي: ${basePricing.price} EGP، السعر المعدل بعد دراسة مستوى الاستعجال والتعقيد هو ${adjustedPrice} EGP.`,
      suggested_model: 'FIXED_FEE'
    }
  }
}
