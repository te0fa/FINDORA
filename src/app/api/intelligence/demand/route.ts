import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDemandHeatMap } from '@/lib/dal/bidding'
import { withRateLimit, STANDARD_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

// ─── GET — Fetch Demand Heatmap ──────────────────────────────────────────────

async function getDemandHandler(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify staff role
  const { data: staff } = await (supabase as any)
    .from('staff_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Retrieve aggregated demand data from DAL
  const demandData = await getDemandHeatMap()

  return NextResponse.json({
    success: true,
    ...demandData
  })
}

export const GET = withRateLimit(STANDARD_RATE_LIMIT, getDemandHandler)
