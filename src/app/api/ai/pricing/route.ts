// src/app/api/ai/pricing/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { resolvePricing } from '@/lib/pricing/resolver'
import { generatePricingSuggestion } from '@/lib/pricing/aiAgent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      service_type, 
      category, 
      urgency, 
      complexity, 
      budget, 
      exact_match 
    } = body

    if (!service_type) {
      return NextResponse.json({ error: 'service_type is required' }, { status: 400 })
    }

    // 1. Resolve base pricing from deterministic engine (source of truth)
    const basePricing = await resolvePricing(service_type)

    // 2. Generate AI pricing suggestion (decision support only)
    const aiSuggestion = await generatePricingSuggestion({
      service_type,
      category: category || 'general',
      urgency: urgency || 'medium',
      complexity: complexity || 'medium',
      budget: budget ? Number(budget) : undefined,
      exact_match: exact_match === true
    }, basePricing)

    return NextResponse.json({
      base_pricing: basePricing,
      ai_suggestion: aiSuggestion
    })
  } catch (err: any) {
    // log.error('[API ai/pricing Error]:', err.message)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
