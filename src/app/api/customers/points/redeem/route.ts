import { NextRequest, NextResponse } from 'next/server'
import { addCustomerPoints, getCustomerPointsBalance } from '@/lib/dal/points'
import { withRateLimit, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

async function redeemPointsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { customerId, rewardId, pointsCost } = body

    if (!customerId || !rewardId || !pointsCost) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const currentBalance = await getCustomerPointsBalance(customerId)
    if (currentBalance < pointsCost) {
      return NextResponse.json({ error: 'Insufficient points balance' }, { status: 400 })
    }

    // Deduct points by passing negative pointsCost
    const success = await addCustomerPoints(customerId, -pointsCost, 'vip_redeemed')
    if (!success) {
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true, newBalance: currentBalance - pointsCost })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit(AUTH_RATE_LIMIT, redeemPointsHandler)
