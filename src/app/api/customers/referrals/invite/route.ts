import { NextRequest, NextResponse } from 'next/server'
import { addReferralLog } from '@/lib/dal/points'
import { withRateLimit, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

async function inviteFriendHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { referrerId, referrerType, referredEmail } = body

    if (!referrerId || !referrerType || !referredEmail) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const success = await addReferralLog(referrerId, referrerType, referredEmail)
    if (!success) {
      return NextResponse.json({ error: 'Failed to record referral log' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit(AUTH_RATE_LIMIT, inviteFriendHandler)
