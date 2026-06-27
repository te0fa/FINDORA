/** GET /api/trends/[product_id] — Trend for a specific product */

import { NextRequest, NextResponse } from 'next/server'
import { getProductTrend, trendLabel, trendEmoji } from '@/lib/products/trend-engine'
import { withRateLimit, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

type RouteContext = { params: Promise<{ product_id: string }> }

async function handler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { product_id } = await context.params
  const locale = (request.nextUrl.searchParams.get('locale') as 'ar' | 'en') ?? 'ar'

  const trend = await getProductTrend(product_id)
  if (!trend) {
    return NextResponse.json(
      { error: 'No trend data available for this product' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    product_id,
    trend_score: trend.trend_score,
    trend_score_label: trend.trend_score >= 70
      ? (locale === 'ar' ? 'فرصة ممتازة للشراء' : 'Excellent buying opportunity')
      : trend.trend_score >= 50
        ? (locale === 'ar' ? 'سعر جيد' : 'Good price')
        : (locale === 'ar' ? 'سعر مرتفع نسبياً' : 'Relatively high price'),
    trends: {
      '7d': {
        direction: trend.trend_7d,
        pct_change: trend.pct_change_7d,
        label: trendLabel(trend.trend_7d, locale),
        emoji: trendEmoji(trend.trend_7d),
      },
      '30d': {
        direction: trend.trend_30d,
        pct_change: trend.pct_change_30d,
        label: trendLabel(trend.trend_30d, locale),
        emoji: trendEmoji(trend.trend_30d),
      },
      '90d': {
        direction: trend.trend_90d,
        pct_change: trend.pct_change_90d,
        label: trendLabel(trend.trend_90d, locale),
        emoji: trendEmoji(trend.trend_90d),
      },
    },
    price_stats: {
      lowest_price: trend.lowest_price,
      highest_price: trend.highest_price,
      average_price: trend.average_price,
    },
    computed_at: trend.computed_at,
  })
}

export const GET = withRateLimit(STANDARD_RATE_LIMIT, handler)
