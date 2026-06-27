/**
 * src/lib/products/trend-engine.ts
 * Price Trend Analytics Engine
 *
 * Computes:
 *  - 7d / 30d / 90d trend direction + % change
 *  - Classification: stable / slow_decline / fast_decline / slow_increase / fast_increase
 *  - All-time: lowest / highest / average price
 *  - Trend score 0-100 (100 = best time to buy)
 */

import { createAdminClient } from '@/lib/dal/customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('TrendEngine')

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrendDirection =
  | 'stable'
  | 'slow_decline'
  | 'fast_decline'
  | 'slow_increase'
  | 'fast_increase'

export interface PriceTrend {
  product_id: string
  trend_7d: TrendDirection | null
  trend_30d: TrendDirection | null
  trend_90d: TrendDirection | null
  pct_change_7d: number | null
  pct_change_30d: number | null
  pct_change_90d: number | null
  lowest_price: number | null
  highest_price: number | null
  average_price: number | null
  trend_score: number    // 0-100
  computed_at: string
}

interface PricePoint {
  price: number
  captured_at: string
}

// ─── Classification Rules ─────────────────────────────────────────────────────
//   > +10%  → fast_increase
//   +2..10% → slow_increase
//   -2..+2% → stable
//   -10..-2% → slow_decline
//   < -10%  → fast_decline

export function classifyTrend(pctChange: number | null): TrendDirection | null {
  if (pctChange === null || pctChange === undefined) return null
  if (pctChange > 10) return 'fast_increase'
  if (pctChange > 2) return 'slow_increase'
  if (pctChange < -10) return 'fast_decline'
  if (pctChange < -2) return 'slow_decline'
  return 'stable'
}

/**
 * Trend Score 0-100:
 *  - 70% based on price position (0 = all-time high, 70 = all-time low)
 *  - 30% based on recent momentum (declining = buying opportunity)
 */
export function computeTrendScore(
  currentPrice: number,
  lowestPrice: number | null,
  highestPrice: number | null,
  pct30d: number | null
): number {
  if (!lowestPrice || !highestPrice || highestPrice === lowestPrice) return 50

  const range = highestPrice - lowestPrice
  const position = (currentPrice - lowestPrice) / range
  const priceScore = 70 * (1 - position)  // closer to low = higher score

  const momentumScore = (() => {
    if (pct30d === null) return 15
    if (pct30d < -10) return 30
    if (pct30d < -5) return 22
    if (pct30d < 0) return 17
    if (pct30d < 5) return 12
    return 5
  })()

  return Math.min(100, Math.max(0, Math.round(priceScore + momentumScore)))
}

// ─── Core Computation ─────────────────────────────────────────────────────────

export async function computeProductTrend(productId: string): Promise<PriceTrend | null> {
  const admin = await createAdminClient()

  // Fetch all history for this product (max 90 days needed)
  const { data: history, error } = await (admin as any)
    .from('price_history')
    .select('price, captured_at')
    .eq('product_id', productId)
    .gte('captured_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('captured_at', { ascending: true }) as { data: PricePoint[] | null; error: any }

  if (error || !history?.length) {
    log.warn('No price history for trend computation', { productId })
    return null
  }

  // Current price
  const currentPrice = history[history.length - 1].price
  const now = Date.now()

  const getOldestPriceInWindow = (days: number): number | null => {
    const cutoff = now - days * 24 * 60 * 60 * 1000
    const inWindow = history.filter(h => new Date(h.captured_at).getTime() >= cutoff)
    return inWindow.length > 0 ? inWindow[0].price : null
  }

  const computePctChange = (oldPrice: number | null): number | null => {
    if (oldPrice === null || oldPrice === 0) return null
    return parseFloat(((currentPrice - oldPrice) / oldPrice * 100).toFixed(4))
  }

  const price7d = getOldestPriceInWindow(7)
  const price30d = getOldestPriceInWindow(30)
  const price90d = getOldestPriceInWindow(90)

  const pct7d = computePctChange(price7d)
  const pct30d = computePctChange(price30d)
  const pct90d = computePctChange(price90d)

  // All-time stats from ALL history (not just 90d)
  const { data: allHistory } = await (admin as any)
    .from('price_history')
    .select('price')
    .eq('product_id', productId) as { data: { price: number }[] | null }

  const allPrices = (allHistory ?? []).map(h => h.price)
  const lowestPrice = allPrices.length ? Math.min(...allPrices) : null
  const highestPrice = allPrices.length ? Math.max(...allPrices) : null
  const averagePrice = allPrices.length
    ? parseFloat((allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(2))
    : null

  const trendScore = computeTrendScore(currentPrice, lowestPrice, highestPrice, pct30d)

  const trend: PriceTrend = {
    product_id: productId,
    trend_7d: classifyTrend(pct7d),
    trend_30d: classifyTrend(pct30d),
    trend_90d: classifyTrend(pct90d),
    pct_change_7d: pct7d,
    pct_change_30d: pct30d,
    pct_change_90d: pct90d,
    lowest_price: lowestPrice,
    highest_price: highestPrice,
    average_price: averagePrice,
    trend_score: trendScore,
    computed_at: new Date().toISOString(),
  }

  // Persist to price_trends table
  const { error: upsertError } = await (admin as any)
    .from('price_trends')
    .upsert({ ...trend }, { onConflict: 'product_id' })

  if (upsertError) {
    log.error('Failed to persist trend', { productId, error: upsertError.message })
  }

  log.info('Trend computed', {
    productId,
    score: trendScore,
    trend30d: trend.trend_30d,
    pct30d,
  })

  return trend
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getProductTrend(productId: string): Promise<PriceTrend | null> {
  const admin = await createAdminClient()

  const { data, error } = await (admin as any)
    .from('price_trends')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle()

  if (error) {
    log.error('getProductTrend failed', { productId, error: error.message })
    return null
  }

  // If stale (>6 hours old), recompute
  if (data) {
    const age = Date.now() - new Date(data.computed_at).getTime()
    if (age > 6 * 60 * 60 * 1000) {
      log.info('Trend stale, recomputing', { productId, ageHours: Math.round(age / 3600000) })
      return computeProductTrend(productId)
    }
    return data
  }

  // Not computed yet — compute now
  return computeProductTrend(productId)
}

export async function getAllTrends(options: {
  trend_30d?: TrendDirection
  min_score?: number
  limit?: number
  offset?: number
} = {}): Promise<PriceTrend[]> {
  const admin = await createAdminClient()
  const { trend_30d, min_score, limit = 20, offset = 0 } = options

  let query = (admin as any)
    .from('price_trends')
    .select('*')
    .order('trend_score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (trend_30d) query = query.eq('trend_30d', trend_30d)
  if (min_score !== undefined) query = query.gte('trend_score', min_score)

  const { data, error } = await query

  if (error) {
    log.error('getAllTrends failed', { error: error.message })
    return []
  }

  return data ?? []
}

// ─── Batch Recompute (called by pg_cron or API) ───────────────────────────────

export async function recomputeAllTrends(): Promise<{
  processed: number
  failed: number
  duration_ms: number
}> {
  const admin = await createAdminClient()
  const start = Date.now()

  const { data: products } = await (admin as any)
    .from('products')
    .select('id')
    .eq('is_active', true)

  let processed = 0
  let failed = 0

  for (const product of products ?? []) {
    try {
      await computeProductTrend(product.id)
      processed++
    } catch (err) {
      failed++
      log.error('Failed to compute trend for product', {
        productId: product.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const duration_ms = Date.now() - start
  log.info('Batch trend computation complete', { processed, failed, duration_ms })

  return { processed, failed, duration_ms }
}

// ─── Human-readable label helpers ─────────────────────────────────────────────

export function trendLabel(trend: TrendDirection | null, locale: 'ar' | 'en'): string {
  const labels: Record<TrendDirection, { ar: string; en: string }> = {
    stable: { ar: 'سعر مستقر', en: 'Stable Price' },
    slow_decline: { ar: 'انخفاض بطيء', en: 'Slowly Declining' },
    fast_decline: { ar: 'انخفاض سريع', en: 'Fast Declining' },
    slow_increase: { ar: 'ارتفاع بطيء', en: 'Slowly Rising' },
    fast_increase: { ar: 'ارتفاع سريع', en: 'Fast Rising' },
  }
  if (!trend) return locale === 'ar' ? 'لا توجد بيانات' : 'No data'
  return labels[trend]?.[locale] ?? trend
}

export function trendEmoji(trend: TrendDirection | null): string {
  const emojis: Record<TrendDirection, string> = {
    stable: '➡️',
    slow_decline: '📉',
    fast_decline: '🔻',
    slow_increase: '📈',
    fast_increase: '🔺',
  }
  return trend ? emojis[trend] : '❓'
}
