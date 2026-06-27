/**
 * GET    /api/watchlists/[product_id]/alerts  — Get alerts for product
 * POST   /api/watchlists/[product_id]/alerts  — Create alert
 * DELETE /api/watchlists/[product_id]/alerts  — Deactivate alert
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createAlert, getUserAlerts, deactivateAlert, getAlertHistory
} from '@/lib/products/alert-engine'
import type { AlertType, NotificationChannel } from '@/lib/products/alert-engine'
import { withRateLimit, STANDARD_RATE_LIMIT, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:alerts')

type RouteContext = { params: Promise<{ product_id: string }> }

const VALID_ALERT_TYPES: AlertType[] = ['any_drop', 'pct_5', 'pct_10', 'pct_20', 'custom_pct', 'target_price']
const VALID_CHANNELS: NotificationChannel[] = ['sms', 'email', 'push', 'whatsapp']

async function getCustomerId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// ── GET ───────────────────────────────────────────────────────────────────────

async function getHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { product_id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = await getCustomerId(supabase, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const alerts = await getUserAlerts(customerId, product_id)
  const history = await getAlertHistory(customerId, 20)

  return NextResponse.json({ alerts, history })
}

// ── POST ──────────────────────────────────────────────────────────────────────

async function createHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { product_id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = await getCustomerId(supabase, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const body = await request.json()
  const { alert_type, target_price, target_pct, channels } = body

  if (!alert_type || !VALID_ALERT_TYPES.includes(alert_type)) {
    return NextResponse.json({
      error: `Invalid alert_type. Valid: ${VALID_ALERT_TYPES.join(', ')}`
    }, { status: 400 })
  }

  if (alert_type === 'target_price' && !target_price) {
    return NextResponse.json({ error: 'target_price is required for target_price alert type' }, { status: 400 })
  }

  if (alert_type === 'custom_pct' && !target_pct) {
    return NextResponse.json({ error: 'target_pct is required for custom_pct alert type' }, { status: 400 })
  }

  const validatedChannels = Array.isArray(channels)
    ? channels.filter((c: string) => VALID_CHANNELS.includes(c as NotificationChannel)) as NotificationChannel[]
    : ['sms' as NotificationChannel]

  if (!validatedChannels.length) {
    return NextResponse.json({ error: 'At least one valid channel required' }, { status: 400 })
  }

  const alert = await createAlert({
    customer_id: customerId,
    product_id,
    alert_type,
    target_price: target_price ?? undefined,
    target_pct: target_pct ?? undefined,
    channels: validatedChannels,
  })

  log.info('Alert created', { alertId: alert.id, customerId, product_id, alert_type })
  return NextResponse.json({ alert }, { status: 201 })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = await getCustomerId(supabase, user.id)
  if (!customerId) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { alert_id } = await request.json()
  if (!alert_id) return NextResponse.json({ error: 'alert_id required' }, { status: 400 })

  await deactivateAlert(alert_id, customerId)
  return NextResponse.json({ success: true })
}

export const GET    = withRateLimit(STANDARD_RATE_LIMIT, getHandler)
export const POST   = withRateLimit(AUTH_RATE_LIMIT, createHandler)
export const DELETE = withRateLimit(AUTH_RATE_LIMIT, deleteHandler)
