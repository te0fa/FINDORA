/**
 * POST /api/requests/history-lookup
 *
 * Looks up previous requests for an anonymous customer by phone number.
 * This is a SIMPLE DATABASE LOOKUP — not an auth endpoint. No sessions,
 * no tokens, no persistent auth state are created from this phone number entry.
 *
 * Security layers:
 *   1. Feature flag gate (server-side re-check)
 *   2. Rate limiting per IP (guardLookupRate)
 *   3. Phone normalization before query (consistent with stored format)
 *   4. Returns only summary fields — no internal/admin columns exposed
 *
 * The phone number is used ONLY for this lookup. It does NOT get saved into
 * any new request. The Intake step's own submission remains the source of
 * truth for "this request belongs to this phone" (unchanged from Phase 1).
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled, getFeatureConfig } from '@/lib/feature-flags/feature-service'
import { guardLookupRate, normalizePhoneForLookup } from '@/lib/intelligence/lookup-guard'

export async function POST(request: Request) {
  // ── 1. Feature flag gate ─────────────────────────────────────────────────
  const enabled = await isFeatureEnabled('request_history_lookup')
  if (!enabled) {
    return NextResponse.json({ error: 'FEATURE_DISABLED' }, { status: 403 })
  }

  // ── 2. Extract IP ────────────────────────────────────────────────────────
  // Standard Next.js pattern: prefer x-forwarded-for (Vercel/proxies),
  // fall back to x-real-ip, then a constant for local dev.
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') ?? '127.0.0.1')

  // ── 3. Rate limit ────────────────────────────────────────────────────────
  const rateCheck = guardLookupRate(ip)
  if (!rateCheck.valid) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', messageAr: rateCheck.reasonAr },
      { status: 429 }
    )
  }

  // ── 4. Parse and validate body ───────────────────────────────────────────
  let body: { phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const normalizedPhone = normalizePhoneForLookup(body.phone ?? '')
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: 'INVALID_PHONE', messageAr: 'رقم الهاتف غير صحيح' },
      { status: 400 }
    )
  }

  // ── 5. Read config from DB (set in migration, adjustable from dashboard) ─
  const config = await getFeatureConfig('request_history_lookup')
  const maxResults   = typeof config.max_results   === 'number' ? config.max_results   : 3
  const lookbackDays = typeof config.lookback_days === 'number' ? config.lookback_days : 365

  // ── 6. Query customer_requests ───────────────────────────────────────────
  // Uses admin client (service role) to bypass RLS — this is a guest endpoint,
  // same pattern as /api/customers/requests/create/route.ts.
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('customer_requests')
    .select('id, product_name, category, status, created_at')
    .eq('customer_phone', normalizedPhone)
    .gte('created_at', new Date(Date.now() - lookbackDays * 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(maxResults)

  if (error) {
    console.error('[history-lookup] DB error:', error.message)
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ found: false })
  }

  // ── 7. Return safe summary fields only ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests = (data as any[]).map((row) => ({
    id:          row.id          as string,
    productName: row.product_name as string,
    category:    row.category    as string,
    status:      row.status      as string,
    createdAt:   row.created_at  as string,
  }))

  return NextResponse.json({ found: true, requests })
}
