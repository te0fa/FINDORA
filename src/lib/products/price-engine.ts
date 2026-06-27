/**
 * src/lib/products/price-engine.ts
 * Price History Engine — Core of the product intelligence platform.
 *
 * Responsibilities:
 *  - Record price snapshots (with deduplication)
 *  - Detect and persist price change events
 *  - Update product current_price atomically
 *  - Trigger alert checks on every price change
 */

import { createAdminClient } from '@/lib/dal/customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('PriceEngine')

// ─── Types ────────────────────────────────────────────────────────────────────

export type PriceDirection = 'up' | 'down' | 'no_change'

export interface PriceSnapshot {
  id: string
  product_id: string
  price: number
  currency_code: string
  source: string | null
  captured_at: string
}

export interface PriceEvent {
  id: string
  product_id: string
  old_price: number
  new_price: number
  absolute_change: number
  percentage_change: number
  direction: PriceDirection
  created_at: string
}

export interface PriceUpdateResult {
  product_id: string
  old_price: number | null
  new_price: number
  direction: PriceDirection
  absolute_change: number
  percentage_change: number
  snapshot: PriceSnapshot
  event: PriceEvent | null   // null if price didn't change
  alerts_triggered: number
}

// ─── Core Engine ──────────────────────────────────────────────────────────────

/**
 * Main entry point: update a product's price.
 * - Records snapshot
 * - Detects change
 * - Persists event if changed
 * - Triggers alert checks
 * - Updates current_price on product
 *
 * @param productId - UUID of the product
 * @param newPrice - New price value
 * @param currency - Currency code (default: 'EGP')
 * @param source - Where this price came from
 * @param capturedBy - Staff user ID (or null for system)
 */
export async function updateProductPrice(
  productId: string,
  newPrice: number,
  currency = 'EGP',
  source = 'staff_update',
  capturedBy: string | null = null
): Promise<PriceUpdateResult> {
  log.info('Updating product price', { productId, newPrice, source })

  const admin = await createAdminClient()

  // 1. Get current price
  const { data: product, error: productError } = await (admin as any)
    .from('products')
    .select('id, current_price, currency_code')
    .eq('id', productId)
    .single() as { data: { id: string; current_price: number | null; currency_code: string } | null; error: any }

  if (productError || !product) {
    throw new Error(`Product ${productId} not found: ${productError?.message}`)
  }

  const oldPrice = product.current_price

  // 2. Record snapshot (deduplicated)
  const snapshot = await recordPriceSnapshot(productId, newPrice, currency, source, capturedBy)

  // 3. Detect change
  const { direction, absoluteChange, percentageChange } = detectPriceChange(oldPrice, newPrice)

  // 4. If price actually changed, record event
  let event: PriceEvent | null = null
  if (direction !== 'no_change' || oldPrice === null) {
    event = await savePriceEvent(productId, oldPrice ?? newPrice, newPrice)
  }

  // 5. Update product's current_price
  await (admin as any)
    .from('products')
    .update({ current_price: newPrice, updated_at: new Date().toISOString() })
    .eq('id', productId)

  // 6. Trigger alert checks (non-blocking — runs in background)
  let alertsTriggered = 0
  if (direction === 'down' || direction === 'no_change' && oldPrice === null) {
    // Dynamically import to avoid circular deps
    const { checkAndTriggerAlerts } = await import('./alert-engine')
    alertsTriggered = await checkAndTriggerAlerts(productId, newPrice, oldPrice)
  }

  log.info('Price update complete', {
    productId,
    oldPrice,
    newPrice,
    direction,
    alertsTriggered,
  })

  return {
    product_id: productId,
    old_price: oldPrice,
    new_price: newPrice,
    direction,
    absolute_change: absoluteChange,
    percentage_change: percentageChange,
    snapshot,
    event,
    alerts_triggered: alertsTriggered,
  }
}

// ─── Snapshot Recording ───────────────────────────────────────────────────────

/**
 * Record a price snapshot.
 * Deduplication: same price within the same hour is silently skipped.
 */
export async function recordPriceSnapshot(
  productId: string,
  price: number,
  currencyCode = 'EGP',
  source: string | null = null,
  capturedBy: string | null = null
): Promise<PriceSnapshot> {
  const admin = await createAdminClient()

  const { data, error } = await (admin as any)
    .from('price_history')
    .upsert(
      {
        product_id: productId,
        price,
        currency_code: currencyCode,
        source,
        captured_by: capturedBy,
        captured_at: new Date().toISOString(),
      },
      {
        onConflict: 'product_id,price,date_trunc_hour',
        ignoreDuplicates: true,
      }
    )
    .select()
    .maybeSingle()

  // If duplicate, fetch the existing record
  if (!data) {
    const { data: existing } = await (admin as any)
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()

    return existing
  }

  if (error) {
    log.warn('Snapshot dedup triggered or insert error', { productId, price, error: error.message })
  }

  return data
}

// ─── Change Detection ─────────────────────────────────────────────────────────

export function detectPriceChange(
  oldPrice: number | null,
  newPrice: number
): {
  direction: PriceDirection
  absoluteChange: number
  percentageChange: number
} {
  if (oldPrice === null) {
    return { direction: 'no_change', absoluteChange: 0, percentageChange: 0 }
  }

  const absoluteChange = parseFloat((newPrice - oldPrice).toFixed(2))
  const percentageChange = oldPrice !== 0
    ? parseFloat(((absoluteChange / oldPrice) * 100).toFixed(4))
    : 0

  let direction: PriceDirection = 'no_change'
  if (absoluteChange > 0) direction = 'up'
  else if (absoluteChange < 0) direction = 'down'

  return { direction, absoluteChange, percentageChange }
}

// ─── Event Persistence ────────────────────────────────────────────────────────

export async function savePriceEvent(
  productId: string,
  oldPrice: number,
  newPrice: number
): Promise<PriceEvent> {
  const admin = await createAdminClient()

  const { direction, absoluteChange, percentageChange } = detectPriceChange(oldPrice, newPrice)

  const { data, error } = await (admin as any)
    .from('price_events')
    .insert({
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      absolute_change: absoluteChange,
      percentage_change: percentageChange,
      direction,
    })
    .select()
    .single()

  if (error) {
    log.error('savePriceEvent failed', { productId, oldPrice, newPrice, error: error.message })
    throw new Error(`Failed to save price event: ${error.message}`)
  }

  log.info('Price event saved', { productId, direction, absoluteChange, percentageChange })
  return data
}

// ─── Price History Queries ────────────────────────────────────────────────────

export async function getPriceHistory(
  productId: string,
  days = 90
): Promise<PriceSnapshot[]> {
  const admin = await createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await (admin as any)
    .from('price_history')
    .select('id, product_id, price, currency_code, source, captured_at')
    .eq('product_id', productId)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true })

  if (error) {
    log.error('getPriceHistory failed', { productId, error: error.message })
    return []
  }

  return data ?? []
}

export async function getLastPrice(productId: string): Promise<number | null> {
  const admin = await createAdminClient()

  const { data } = await (admin as any)
    .from('price_history')
    .select('price')
    .eq('product_id', productId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.price ?? null
}

export async function getPriceEvents(
  productId: string,
  limit = 20
): Promise<PriceEvent[]> {
  const admin = await createAdminClient()

  const { data, error } = await (admin as any)
    .from('price_events')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    log.error('getPriceEvents failed', { productId, error: error.message })
    return []
  }

  return data ?? []
}

// ─── Batch Import ─────────────────────────────────────────────────────────────

/**
 * Import historical prices from research_items in bulk.
 * Used when importing a research_item as a product.
 */
export async function seedPriceFromResearchItem(
  productId: string,
  price: number,
  capturedAt: string,
  source = 'research_item'
): Promise<void> {
  const admin = await createAdminClient()

  const { error } = await (admin as any)
    .from('price_history')
    .insert({
      product_id: productId,
      price,
      source,
      captured_at: capturedAt,
    })

  if (error && !error.message.includes('duplicate')) {
    log.warn('seedPriceFromResearchItem insert error', { productId, error: error.message })
  }
}
