import { NextRequest, NextResponse } from 'next/server'
import { addToWaitlist } from '@/lib/dal/points'
import { getCustomerByAuthId } from '@/lib/dal/customers'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

async function addToWaitlistHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { customerId, productName, category } = body

    let resolvedCustomerId = customerId
    if (!resolvedCustomerId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const customer = await getCustomerByAuthId(user.id)
        if (customer) {
          resolvedCustomerId = customer.id
        }
      }
    }

    if (!resolvedCustomerId || !productName) {
      return NextResponse.json({ error: 'Unauthorized or missing parameters' }, { status: 400 })
    }

    const success = await addToWaitlist(resolvedCustomerId, productName, category)
    if (!success) {
      return NextResponse.json({ error: 'Failed to record waitlist entry' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit(AUTH_RATE_LIMIT, addToWaitlistHandler)
