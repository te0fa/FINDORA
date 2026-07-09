import { NextRequest, NextResponse } from 'next/server'
import { addToWaitlist } from '@/lib/dal/points'
import { getCustomerByAuthId } from '@/lib/dal/customers'
import { createClient } from '@/lib/supabase/server'
import { createSourcingRequest } from '@/lib/dal/requests'
import { withRateLimit, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

async function addToWaitlistHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { customerId, productName, category, budget, description } = body

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

    // 1. Add to waitlist table
    const success = await addToWaitlist(resolvedCustomerId, productName, category)
    if (!success) {
      return NextResponse.json({ error: 'Failed to record waitlist entry' }, { status: 500 })
    }

    // 2. If description/details are provided, automatically create a real sourcing request in the platform
    if (description) {
      try {
        await createSourcingRequest({
          customerId: resolvedCustomerId,
          title: productName,
          rawDescription: description,
          status: 'submitted',
          channel: 'web',
          requestKind: category || 'general',
          preferences: {
            budget_max: budget ? Number(budget) : undefined,
            preferred_governorate: 'Cairo'
          }
        })
      } catch (reqErr: any) {
        console.error('[Waitlist API] Sourcing request dual-write failed:', reqErr.message)
        // We continue since the waitlist entry was already created successfully
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit(AUTH_RATE_LIMIT, addToWaitlistHandler)
