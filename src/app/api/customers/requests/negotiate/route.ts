import { NextRequest, NextResponse } from 'next/server'
import { startSmartNegotiationAction } from '@/app/[locale]/(customer)/requests/[id]/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId } = body
    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }
    const res = await startSmartNegotiationAction(requestId)
    if (res.success) {
      return NextResponse.json({ success: true, notifiedCount: res.notifiedCount })
    } else {
      return NextResponse.json({ error: res.error || 'Failed to start negotiation' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
