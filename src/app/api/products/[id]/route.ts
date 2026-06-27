/**
 * GET    /api/products/[id]  — Get product with trend
 * PATCH  /api/products/[id]  — Update product (staff only)
 * DELETE /api/products/[id]  — Archive product (staff only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProductById, updateProduct, archiveProduct } from '@/lib/dal/products'
import { getProductTrend } from '@/lib/products/trend-engine'
import { withRateLimit, STANDARD_RATE_LIMIT, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:products/[id]')

type RouteContext = { params: Promise<{ id: string }> }

// ── GET /api/products/[id] ────────────────────────────────────────────────────

async function getHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const includeTrend = request.nextUrl.searchParams.get('trend') === '1'

  const product = await getProductById(id, includeTrend)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Fetch trend separately if requested and not joined
  let trend = null
  if (includeTrend && !product.trend) {
    trend = await getProductTrend(id)
  }

  return NextResponse.json({ product, trend: trend ?? product.trend ?? null })
}

// ── PATCH /api/products/[id] ──────────────────────────────────────────────────

async function updateHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
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

  if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const product = await updateProduct(id, body)
  if (!product) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  log.info('Product updated', { productId: id, staffId: user.id })
  return NextResponse.json({ product })
}

// ── DELETE /api/products/[id] ─────────────────────────────────────────────────

async function deleteHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
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

  if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await archiveProduct(id)
  log.info('Product archived', { productId: id, staffId: user.id })
  return NextResponse.json({ success: true })
}

export const GET    = withRateLimit(STANDARD_RATE_LIMIT, getHandler)
export const PATCH  = withRateLimit(AUTH_RATE_LIMIT,   updateHandler)
export const DELETE = withRateLimit(AUTH_RATE_LIMIT,   deleteHandler)
