import { NextRequest, NextResponse } from 'next/server'
import { parseNaturalLanguageRequest } from '@/lib/intelligence/ai-buying-agent'
import { withRateLimit, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { getAIFeatureStatus, logAIFeatureUsage } from '@/lib/dal/ai-control'

// ─── POST — Parse Natural Language Sourcing Query ───────────────────────────

async function parseRequestHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { query } = body

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'query parameter is required' }, { status: 400 })
    }

    // 1. Check Feature Flag & Rate Caps
    const status = await getAIFeatureStatus('flag_ai_parse_request')
    if (!status.enabled) {
      await logAIFeatureUsage({
        featureKey: 'flag_ai_parse_request',
        success: false,
        errorMessage: status.reason || 'Disabled'
      })
      return NextResponse.json({ 
        success: false, 
        error: status.reason || 'AI Sourcing assistant is temporarily offline. Please fill the fields manually.' 
      }, { status: 403 })
    }

    // 2. Parse using AI
    try {
      const parsed = await parseNaturalLanguageRequest(query)
      await logAIFeatureUsage({
        featureKey: 'flag_ai_parse_request',
        success: true,
        estimatedCost: 0.01
      })
      return NextResponse.json({ success: true, parsed })
    } catch (parseErr: any) {
      await logAIFeatureUsage({
        featureKey: 'flag_ai_parse_request',
        success: false,
        errorMessage: parseErr.message || String(parseErr)
      })
      throw parseErr
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI parsing error' }, { status: 500 })
  }
}

export const POST = withRateLimit(STANDARD_RATE_LIMIT, parseRequestHandler)
