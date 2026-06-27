import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/dal/customers'
import { addCustomerPoints } from '@/lib/dal/points'
import { getStaffMemberByAuthUserId } from '@/lib/dal/staff'
import { withRateLimit, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'

async function approveInsightHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify staff role
    const staff = await getStaffMemberByAuthUserId(user.id)
    if (!staff || !staff.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { insightId, status } = body // status is 'approved_as_offer' or 'rejected'

    if (!insightId || !status || !['approved_as_offer', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // 1. Fetch the insight first
    const { data: insight, error: fetchErr } = await adminClient
      .from('market_insights')
      .select('*, contributor:contributors(auth_user_id)')
      .eq('id', insightId)
      .single()

    if (fetchErr || !insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 })
    }

    // 2. Update status of the insight
    const { error: updateErr } = await adminClient
      .from('market_insights')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', insightId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // 3. If approved, find the customer profile for this contributor and reward them with 25 VIP points
    if (status === 'approved_as_offer') {
      const contribAuthUserId = (insight.contributor as any)?.auth_user_id
      if (contribAuthUserId) {
        const { data: customer } = await adminClient
          .from('customers')
          .select('id')
          .eq('auth_user_id', contribAuthUserId)
          .single()

        if (customer) {
          // Award 25 VIP points
          await addCustomerPoints(customer.id, 25, 'friend_referred', insightId)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit(AUTH_RATE_LIMIT, approveInsightHandler)
