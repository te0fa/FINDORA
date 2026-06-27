/**
 * POST /api/products/[id]/price  — Update product price (staff only)
 * GET  /api/products/[id]/price  — Get latest price snapshot
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProductPrice, getLastPrice } from '@/lib/products/price-engine'
import { computeProductTrend } from '@/lib/products/trend-engine'
import { withRateLimit, AUTH_RATE_LIMIT, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:products/[id]/price')

type RouteContext = { params: Promise<{ id: string }> }

// ── POST — Update Price ───────────────────────────────────────────────────────

async function updatePriceHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staff } = await (supabase as any)
    .from('staff_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!staff) return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })

  const { price, currency, source } = await request.json()

  if (typeof price !== 'number' || price <= 0) {
    return NextResponse.json({ error: 'Invalid price — must be a positive number' }, { status: 400 })
  }

  const result = await updateProductPrice(
    id,
    price,
    currency ?? 'EGP',
    source ?? 'staff_update',
    user.id
  )

  // Recompute trend in background after price update
  computeProductTrend(id).catch(err => {
    log.error('Trend recompute failed after price update', {
      productId: id,
      error: err instanceof Error ? err.message : String(err),
    })
  })

  return NextResponse.json({
    success: true,
    old_price: result.old_price,
    new_price: result.new_price,
    direction: result.direction,
    absolute_change: result.absolute_change,
    percentage_change: result.percentage_change,
    alerts_triggered: result.alerts_triggered,
  })
}

// ── GET — Latest Price ────────────────────────────────────────────────────────

async function getPriceHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const price = await getLastPrice(id)
  return NextResponse.json({ product_id: id, current_price: price, currency: 'EGP' })
}

export const POST = withRateLimit(AUTH_RATE_LIMIT,    updatePriceHandler)
export const GET  = withRateLimit(STANDARD_RATE_LIMIT,  getPriceHandler)
