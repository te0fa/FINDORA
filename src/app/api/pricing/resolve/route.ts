// src/app/api/pricing/resolve/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { resolvePricing } from '@/lib/pricing/resolver'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { service_type } = body

    if (!service_type) {
      return NextResponse.json({ error: 'service_type is required' }, { status: 400 })
    }

    const resolved = await resolvePricing(service_type)
    return NextResponse.json(resolved)
  } catch (err: any) {
    // log.error('[API pricing/resolve Error]:', err.message)
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
