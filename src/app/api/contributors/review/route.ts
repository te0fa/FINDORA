import { NextRequest, NextResponse } from 'next/server'
import { submitContributorReview } from '@/lib/contributors/reviews'

/**
 * POST /api/contributors/review
 * Registers customer rating/review for a contributor, updating their trust_score
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { contributorId, customerId, rating, comment } = body

    if (!contributorId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Contributor ID and valid rating (1-5) required' }, { status: 400 })
    }

    const result = await submitContributorReview({
      contributorId,
      customerId,
      rating,
      comment
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    // log.error('[API] Review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
