/**
 * GET /api/requests/[id]/reuse?phone=<normalizedPhone>
 *
 * Fetches the full data of a specific previous request for pre-filling the
 * Review Screen. The phone query param is used for a security check —
 * it must match the phone stored on this request record. This prevents
 * cross-customer data access via guessed request IDs.
 *
 * Security:
 *   1. Feature flag gate
 *   2. Phone match: verified against customers.phone_number_normalized via customer_id
 *      (prevents anyone from fetching someone else's request by guessing an ID)
 *   3. Uses admin client (service role) — same as create route
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/feature-flags/feature-service'
import { canonicalizeEgyptianMobile } from '@/lib/phone'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Feature flag gate ─────────────────────────────────────────────────
  const enabled = await isFeatureEnabled('request_history_lookup')
  if (!enabled) {
    return NextResponse.json({ error: 'FEATURE_DISABLED' }, { status: 403 })
  }

  // ── 2. Extract and validate params ───────────────────────────────────────
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
  }

  const url = new URL(request.url)
  const rawPhone = url.searchParams.get('phone') ?? ''
  const canonicalPhone = canonicalizeEgyptianMobile(rawPhone)

  if (!canonicalPhone) {
    return NextResponse.json(
      { error: 'INVALID_PHONE', messageAr: 'رقم الهاتف غير صحيح أو مفقود' },
      { status: 400 }
    )
  }

  // ── 3. Fetch request from DB ─────────────────────────────────────────────
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from('customer_requests')
    .select('id, customer_id, product_name, category, target_location, max_price, additional_notes, status, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[reuse] DB error:', error.message)
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // ── 4. Security check: phone must match customer ─────────────────────────
  if (!row.customer_id) {
    console.warn(`[reuse] Missing customer_id on request ${id}`)
    return NextResponse.json({ error: 'PHONE_MISMATCH' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customer, error: custError } = await (admin as any)
    .from('customers')
    .select('phone_number_normalized')
    .eq('id', row.customer_id)
    .maybeSingle()

  if (custError || !customer || !customer.phone_number_normalized) {
    console.warn(`[reuse] Customer phone not found for request ${id}`)
    return NextResponse.json({ error: 'PHONE_MISMATCH' }, { status: 403 })
  }

  const storedCanonicalPhone = customer.phone_number_normalized
  if (storedCanonicalPhone !== canonicalPhone) {
    // Log without exposing the actual phone values
    console.warn(`[reuse] Phone mismatch for request ${id} — access denied`)
    return NextResponse.json({ error: 'PHONE_MISMATCH' }, { status: 403 })
  }

  // ── 5. Return pre-fill data ──────────────────────────────────────────────
  // Mapped to the fields the Review Screen and wizard form state need.
  // source_type defaults to 'manual' for reused requests — the customer
  // originally filled this in themselves. The wizard carries it through
  // unchanged to the Intake step submission.
  return NextResponse.json({
    id:             row.id            as string,
    productName:    row.product_name  as string,
    category:       row.category      as string,
    targetLocation: row.target_location as string | null,
    maxPrice:       row.max_price     as number  | null,
    notes:          row.additional_notes as string | null,
    status:         row.status        as string,
    createdAt:      row.created_at    as string,
    sourceType:     'manual' as const,   // reused requests carry source as manual
  })
}
