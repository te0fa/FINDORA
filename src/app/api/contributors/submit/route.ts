import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getContributorByAuthUserId } from '@/lib/dal/contributors'
import { submitPriceReport } from '@/lib/contributors/supply'

/**
 * POST /api/contributors/submit
 * Handles contributor product/price submissions
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contributor = await getContributorByAuthUserId(user.id)
  if (!contributor) {
    return NextResponse.json({ error: 'Contributor profile not found' }, { status: 404 })
  }

  if (contributor.status !== 'active' && contributor.status !== 'approved') {
    return NextResponse.json({ error: 'Your account is under review or suspended.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { productId, vendorId, price, details } = body

    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
    }

    const result = await submitPriceReport({
      contributorId: contributor.id,
      productId,
      vendorId,
      price,
      details
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      submissionId: result.submissionId, 
      rewardSuccess: result.rewardSuccess 
    })

  } catch (error: any) {
    // log.error('[API] Submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
