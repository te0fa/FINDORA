/**
 * GET /api/products/[id]/history — Price history + change events
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPriceHistory, getPriceEvents } from '@/lib/products/price-engine'
import { withRateLimit, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

type RouteContext = { params: Promise<{ id: string }> }

async function handler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const sp = request.nextUrl.searchParams
  const days = Math.min(Number(sp.get('days') ?? 90), 365)
  const includeEvents = sp.get('events') === '1'

  const [history, events] = await Promise.all([
    getPriceHistory(id, days),
    includeEvents ? getPriceEvents(id, 50) : Promise.resolve([]),
  ])

  // Compute chart-ready data points
  const chartData = history.map(h => ({
    date: h.captured_at,
    price: h.price,
    currency: h.currency_code,
  }))

  return NextResponse.json({
    product_id: id,
    days_requested: days,
    data_points: chartData.length,
    history: chartData,
    events: includeEvents ? events : undefined,
    summary: history.length > 0 ? {
      first_price: history[0].price,
      last_price: history[history.length - 1].price,
      min_price: Math.min(...history.map(h => h.price)),
      max_price: Math.max(...history.map(h => h.price)),
      avg_price: parseFloat((history.reduce((s, h) => s + h.price, 0) / history.length).toFixed(2)),
    } : null,
  })
}

export const GET = withRateLimit(STANDARD_RATE_LIMIT, handler)
