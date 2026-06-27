/**
 * GET /api/trends                 — All trends (sortable by score)
 * GET /api/trends/recompute       — Trigger batch recompute (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllTrends, recomputeAllTrends } from '@/lib/products/trend-engine'
import { withRateLimit, STANDARD_RATE_LIMIT, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:trends')

async function listHandler(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams
  const trends = await getAllTrends({
    trend_30d: (sp.get('trend_30d') as any) ?? undefined,
    min_score: sp.has('min_score') ? Number(sp.get('min_score')) : undefined,
    limit: Math.min(Number(sp.get('limit') ?? 20), 100),
    offset: Number(sp.get('offset') ?? 0),
  })

  return NextResponse.json({ trends, count: trends.length })
}

async function recomputeHandler(request: NextRequest): Promise<NextResponse> {
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

  log.info('Manual trend recompute triggered', { staffId: user.id })
  const result = await recomputeAllTrends()
  return NextResponse.json(result)
}

export const GET  = withRateLimit(STANDARD_RATE_LIMIT, listHandler)
export const POST = withRateLimit(AUTH_RATE_LIMIT, recomputeHandler)
