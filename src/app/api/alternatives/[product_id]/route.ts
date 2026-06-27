/**
 * GET /api/alternatives/[product_id]
 * Returns top 10 alternative products with:
 *  - Recommendation score breakdown
 *  - Similarity score
 *  - Full explanation (pros/cons/verdict/savings)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProductById } from '@/lib/dal/products'
import { findAlternatives } from '@/lib/products/recommendation-engine'
import { explainAlternatives } from '@/lib/products/explanation-engine'
import { withRateLimit, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:alternatives')

type RouteContext = { params: Promise<{ product_id: string }> }

async function handler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { product_id } = await context.params
  const sp = request.nextUrl.searchParams
  const limit = Math.min(Number(sp.get('limit') ?? 10), 20)
  const explain = sp.get('explain') !== '0'  // enabled by default
  const locale = (sp.get('locale') as 'ar' | 'en') ?? 'ar'

  // Fetch original product
  const original = await getProductById(product_id)
  if (!original) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Get alternatives with scores
  const alternatives = await findAlternatives(product_id, { limit })

  if (!alternatives.length) {
    return NextResponse.json({
      product_id,
      original: { id: original.id, title: locale === 'ar' ? original.title_ar : (original.title_en ?? original.title_ar) },
      alternatives: [],
      message: locale === 'ar' ? 'لا توجد بدائل متاحة حالياً' : 'No alternatives available at this time',
    })
  }

  // Generate explanations
  const explanations = explain
    ? explainAlternatives(original, alternatives.map(a => ({ product: a.product, total_score: a.total_score })))
    : []

  // Build enriched response
  const results = alternatives.map((alt, idx) => {
    const explanation = explanations[idx] ?? null

    return {
      rank: idx + 1,
      product: {
        id: alt.product.id,
        title: locale === 'ar' ? alt.product.title_ar : (alt.product.title_en ?? alt.product.title_ar),
        brand: alt.product.brand,
        category: alt.product.category,
        price: alt.product.current_price,
        currency: alt.product.currency_code,
        image_url: alt.product.image_url,
        specifications: alt.product.specifications,
      },
      scores: {
        total: alt.total_score,
        category: alt.category_score,
        price: alt.price_score,
        specs: alt.spec_score,
        popularity: alt.popularity_score,
      },
      savings: {
        amount: alt.savings_amount,
        percentage: alt.savings_pct,
      },
      reasons: alt.reasons.map(r => ({
        label: locale === 'ar' ? r.label_ar : r.label_en,
        type: r.type,
      })),
      ...(explain && explanation ? {
        explanation: {
          pros: explanation.pros.map(p => locale === 'ar' ? p.label_ar : p.label_en),
          cons: explanation.cons.map(c => locale === 'ar' ? c.label_ar : c.label_en),
          verdict: locale === 'ar' ? explanation.verdict_ar : explanation.verdict_en,
          confidence: explanation.confidence,
          similarity_score: explanation.similarity_score,
        },
      } : {}),
    }
  })

  log.info('Alternatives returned', { product_id, count: results.length })

  return NextResponse.json({
    product_id,
    original: {
      id: original.id,
      title: locale === 'ar' ? original.title_ar : (original.title_en ?? original.title_ar),
      price: original.current_price,
      currency: original.currency_code,
    },
    alternatives: results,
    meta: {
      total: results.length,
      explained: explain,
      locale,
    },
  })
}

export const GET = withRateLimit(STANDARD_RATE_LIMIT, handler)
