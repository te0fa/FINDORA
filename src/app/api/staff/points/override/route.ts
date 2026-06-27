import { NextRequest, NextResponse } from 'next/server'
import { addPartnerPoints, getPartnerPointsBalance } from '@/lib/dal/points'
import { withRateLimit, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

async function overridePointsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { partnerId, points, actionType } = body

    if (!partnerId || points === undefined || !actionType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const success = await addPartnerPoints(partnerId, Number(points), actionType)
    if (!success) {
      return NextResponse.json({ error: 'Failed to adjust points' }, { status: 500 })
    }

    const newBalance = await getPartnerPointsBalance(partnerId)
    return NextResponse.json({ success: true, newBalance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit(AUTH_RATE_LIMIT, overridePointsHandler)
