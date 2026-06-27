import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { buildVendorAutomationPayload } from '@/lib/dal/vendors'

/**
 * OUTBOUND WEBHOOK — Future Automation Ready
 * Triggered internally (by staff or automated system) to push a customer
 * request notification to a vendor's WhatsApp automation channel.
 *
 * In Phase 1: logs the payload to vendor_automation_logs with status "queued".
 * In Phase 2: will call the external WhatsApp API gateway and update status.
 *
 * Body: {
 *   vendor_id:    string,
 *   request_id:   string,
 *   request_code: string,
 *   title:        string,
 *   budget?:      number,
 *   governorate?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth guard ───────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const staff = await getStaffMemberByAuthUserId(user.id)
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perms = getStaffUiPermissions(staff)
    if (!perms.canManageVendors) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Parse body ───────────────────────────────────────────────
    const body = await req.json()
    const { vendor_id, request_id, request_code, title, budget, governorate } = body

    if (!vendor_id || !request_id || !request_code || !title) {
      return NextResponse.json(
        { error: 'vendor_id, request_id, request_code, and title are required' },
        { status: 400 }
      )
    }

    // ── Build and queue outbound payload ─────────────────────────
    const payload = await buildVendorAutomationPayload(vendor_id, {
      request_id,
      request_code,
      title,
      budget,
      governorate
    })

    // ── PHASE 2 HOOK: Call external WhatsApp gateway here ────────
    // e.g.: await fetch(process.env.WHATSAPP_GATEWAY_URL, { method: 'POST', body: JSON.stringify(payload) })

    return NextResponse.json({
      queued:    true,
      vendor_id,
      payload,
      note:      'Automation queued. WhatsApp delivery will be activated in Phase 2.',
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    // log.error('[VENDOR WEBHOOK OUTBOUND]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
