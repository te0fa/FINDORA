import { NextRequest, NextResponse } from 'next/server'
import { logVendorInboundEvent } from '@/lib/dal/vendors'

/**
 * INBOUND WEBHOOK — Future Automation Ready
 * Receives events from external WhatsApp / CRM automation systems.
 * Secured with VENDOR_WEBHOOK_SECRET header token.
 *
 * Expected payload shape:
 * {
 *   vendor_id?: string,       // optional — matches to known vendor
 *   type: string,             // e.g. "quote_response", "availability_confirm"
 *   whatsapp_from?: string,
 *   data: Record<string, unknown>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Secret validation ────────────────────────────────────────
    const secret = req.headers.get('x-vendor-webhook-secret')
    const expectedSecret = process.env.VENDOR_WEBHOOK_SECRET

    if (!expectedSecret) {
      // log.error('[VENDOR WEBHOOK] VENDOR_WEBHOOK_SECRET env var not set')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse body ───────────────────────────────────────────────
    const body = await req.json()
    const { vendor_id, type, ...rest } = body

    if (!type) {
      return NextResponse.json({ error: 'type is required in payload' }, { status: 400 })
    }

    // ── Log inbound event ────────────────────────────────────────
    await logVendorInboundEvent(vendor_id || null, { type, ...rest })

    return NextResponse.json({ received: true, timestamp: new Date().toISOString() })
  } catch (err: any) {
    // log.error('[VENDOR WEBHOOK INBOUND]', err.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
