import { NextRequest, NextResponse } from 'next/server'
import { submitReview } from '@/lib/dal/vendors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      token,
      platform_rating,
      platform_comment,
      vendor_rating,
      vendor_availability,
      vendor_price_accuracy,
      vendor_communication,
    } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    if (
      typeof platform_rating !== 'number' || platform_rating < 1 || platform_rating > 5 ||
      typeof vendor_rating !== 'number' || vendor_rating < 1 || vendor_rating > 5 ||
      typeof vendor_availability !== 'number' || vendor_availability < 1 || vendor_availability > 5 ||
      typeof vendor_price_accuracy !== 'number' || vendor_price_accuracy < 1 || vendor_price_accuracy > 5 ||
      typeof vendor_communication !== 'number' || vendor_communication < 1 || vendor_communication > 5
    ) {
      return NextResponse.json({ error: 'Invalid rating parameters' }, { status: 400 })
    }

    const { vendorId } = await submitReview(token, {
      platform_rating,
      platform_comment: platform_comment || undefined,
      vendor_rating,
      vendor_availability,
      vendor_price_accuracy,
      vendor_communication,
    })

    return NextResponse.json({ success: true, vendorId })
  } catch (err: any) {
    // log.error('Review submit API error:', err.message)
    return NextResponse.json({ error: err.message || 'Failed to submit review' }, { status: 500 })
  }
}
