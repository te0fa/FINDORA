import { NextRequest, NextResponse } from 'next/server'
import { getRegistrationAvailability } from '@/lib/contributors/scarcity'

/**
 * GET /api/contributors/scarcity
 * Returns real-time spot limits and countdown timer
 */
export async function GET(req: NextRequest) {
  try {
    const availability = await getRegistrationAvailability()
    return NextResponse.json(availability)
  } catch (error: any) {
    // log.error('[API] Scarcity query error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
