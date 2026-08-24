import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitContributorReview } from '@/lib/contributors/reviews'

/**
 * POST /api/contributors/review
 * Registers a customer rating/review for a contributor, updating their trust_score.
 *
 * SECURITY NOTE:
 * - Requires an authenticated Supabase session.
 * - The `customerId` is derived from the authenticated user and **cannot** be spoofed via the request body.
 */
export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate the caller
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required to submit a review' },
        { status: 401 }
      )
    }

    // 2️⃣ Resolve the internal customer record linked to this auth user
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminDb = createAdminClient() as any
    const { data: customer } = await adminDb
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!customer) {
      return NextResponse.json(
        { error: 'No customer profile found for this account' },
        { status: 403 }
      )
    }

    // 3️⃣ Validate the request payload (customerId from body is ignored)
    const body = await req.json()
    const { contributorId, rating, comment } = body
    if (!contributorId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Contributor ID and valid rating (1-5) required' },
        { status: 400 }
      )
    }

    // 4️⃣ Submit the review – we force the resolved customer.id
    const result = await submitContributorReview({
      contributorId,
      customerId: customer.id, // always derived from auth session
      rating,
      comment,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    // Optional: log the error server‑side if you have a logger
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
