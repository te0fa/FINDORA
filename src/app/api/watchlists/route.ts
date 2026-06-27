/**
 * GET    /api/watchlists           — Get current user's watchlist
 * POST   /api/watchlists           — Add product to watchlist
 * DELETE /api/watchlists           — Remove product from watchlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '@/lib/products/alert-engine'
import { withRateLimit, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:watchlists')

async function getCustomerId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// ── GET /api/watchlists ───────────────────────────────────────────────────────

async function listHandler(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = await getCustomerId(supabase, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer account not found' }, { status: 404 })

  const watchlist = await getWatchlist(customerId)
  return NextResponse.json({ watchlist, count: watchlist.length })
}

// ── POST /api/watchlists ──────────────────────────────────────────────────────

async function addHandler(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = await getCustomerId(supabase, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer account not found' }, { status: 404 })

  const { product_id } = await request.json()
  if (!product_id) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })

  const success = await addToWatchlist(customerId, product_id)
  log.info('Product added to watchlist', { customerId, product_id })
  return NextResponse.json({ success })
}

// ── DELETE /api/watchlists ────────────────────────────────────────────────────

async function removeHandler(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = await getCustomerId(supabase, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer account not found' }, { status: 404 })

  const { product_id } = await request.json()
  if (!product_id) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })

  await removeFromWatchlist(customerId, product_id)
  return NextResponse.json({ success: true })
}

export const GET    = withRateLimit(STANDARD_RATE_LIMIT, listHandler)
export const POST   = withRateLimit(STANDARD_RATE_LIMIT, addHandler)
export const DELETE = withRateLimit(STANDARD_RATE_LIMIT, removeHandler)
