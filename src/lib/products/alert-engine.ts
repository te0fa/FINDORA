/**
 * src/lib/products/alert-engine.ts
 * Price Alert System
 *
 * Supports:
 *  - any_drop    → any price decrease
 *  - pct_5/10/20 → specific % drop thresholds
 *  - custom_pct  → user-defined %
 *  - target_price → absolute target value
 *
 * Notification channels: SMS + Email + Push + WhatsApp
 * Retry logic: up to 3 retries per failed channel
 */

import { createAdminClient } from '@/lib/dal/customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('AlertEngine')

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType = 'any_drop' | 'pct_5' | 'pct_10' | 'pct_20' | 'custom_pct' | 'target_price'
export type NotificationChannel = 'sms' | 'email' | 'push' | 'whatsapp'
export type AlertStatus = 'pending' | 'sent' | 'failed'

export interface PriceAlert {
  id: string
  customer_id: string
  product_id: string
  alert_type: AlertType
  target_price: number | null
  target_pct: number | null
  channels: NotificationChannel[]
  is_active: boolean
  triggered_count: number
  last_triggered: string | null
  created_at: string
}

export interface AlertEvent {
  id: string
  alert_id: string
  product_id: string
  customer_id: string
  trigger_price: number
  old_price: number
  savings_amount: number | null
  savings_pct: number | null
  channel: NotificationChannel
  status: AlertStatus
  error_message: string | null
  sent_at: string | null
  retry_count: number
  created_at: string
}

interface CustomerContact {
  id: string
  auth_user_id: string
  name_ar: string | null
  name_en: string | null
  phone: string | null
  email: string | null
  push_subscription: unknown
  whatsapp_number: string | null
}

// ─── Alert Evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluate whether a price alert should fire given current and old price.
 */
export function shouldTriggerAlert(
  alert: Pick<PriceAlert, 'alert_type' | 'target_price' | 'target_pct'>,
  newPrice: number,
  oldPrice: number | null
): boolean {
  if (oldPrice === null || newPrice >= (oldPrice ?? newPrice)) {
    // Only trigger on actual price drops (or first price for target_price)
    if (alert.alert_type !== 'target_price') return false
  }

  switch (alert.alert_type) {
    case 'any_drop':
      return oldPrice !== null && newPrice < oldPrice

    case 'pct_5':
      if (oldPrice === null) return false
      return ((oldPrice - newPrice) / oldPrice) * 100 >= 5

    case 'pct_10':
      if (oldPrice === null) return false
      return ((oldPrice - newPrice) / oldPrice) * 100 >= 10

    case 'pct_20':
      if (oldPrice === null) return false
      return ((oldPrice - newPrice) / oldPrice) * 100 >= 20

    case 'custom_pct':
      if (oldPrice === null || !alert.target_pct) return false
      return ((oldPrice - newPrice) / oldPrice) * 100 >= alert.target_pct

    case 'target_price':
      if (!alert.target_price) return false
      return newPrice <= alert.target_price

    default:
      return false
  }
}

// ─── Main Alert Check ─────────────────────────────────────────────────────────

/**
 * Called by price-engine after every price update.
 * Returns the number of alerts triggered.
 */
export async function checkAndTriggerAlerts(
  productId: string,
  newPrice: number,
  oldPrice: number | null
): Promise<number> {
  const admin = await createAdminClient()

  // Fetch all active alerts for this product
  const { data: alerts, error } = await (admin as any)
    .from('price_alerts')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true) as { data: PriceAlert[] | null; error: any }

  if (error || !alerts?.length) return 0

  let triggered = 0

  for (const alert of alerts) {
    if (!shouldTriggerAlert(alert, newPrice, oldPrice)) continue

    // Prevent duplicate trigger within 24h
    if (alert.last_triggered) {
      const hoursSince = (Date.now() - new Date(alert.last_triggered).getTime()) / 3600000
      if (hoursSince < 24) {
        log.info('Alert throttled (triggered within 24h)', { alertId: alert.id })
        continue
      }
    }

    const savingsAmount = oldPrice !== null ? parseFloat((oldPrice - newPrice).toFixed(2)) : null
    const savingsPct = oldPrice && oldPrice !== 0
      ? parseFloat(((oldPrice - newPrice) / oldPrice * 100).toFixed(4))
      : null

    // Create alert events for each channel
    for (const channel of alert.channels) {
      await (admin as any)
        .from('alert_events')
        .insert({
          alert_id: alert.id,
          product_id: productId,
          customer_id: alert.customer_id,
          trigger_price: newPrice,
          old_price: oldPrice ?? newPrice,
          savings_amount: savingsAmount,
          savings_pct: savingsPct,
          channel,
          status: 'pending',
        })
    }

    // Update alert's triggered_count + last_triggered
    await (admin as any)
      .from('price_alerts')
      .update({
        triggered_count: alert.triggered_count + 1,
        last_triggered: new Date().toISOString(),
      })
      .eq('id', alert.id)

    triggered++
    log.info('Alert triggered', {
      alertId: alert.id,
      customerId: alert.customer_id,
      productId,
      newPrice,
      channels: alert.channels,
    })
  }

  // Process pending alert events in background (non-blocking)
  if (triggered > 0) {
    processPendingAlertEvents().catch(err => {
      log.error('Background alert processing failed', { error: err instanceof Error ? err.message : String(err) })
    })
  }

  return triggered
}

// ─── Notification Dispatch ────────────────────────────────────────────────────

/**
 * Process all pending alert events — send notifications via appropriate channels.
 * Max 3 retries per event.
 */
export async function processPendingAlertEvents(): Promise<void> {
  const admin = await createAdminClient()

  const { data: events, error } = await (admin as any)
    .from('alert_events')
    .select(`
      *,
      price_alerts(alert_type, target_price),
      products(title_ar, title_en, category, image_url),
      customers(id, auth_user_id, phone, whatsapp_number)
    `)
    .eq('status', 'pending')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(50) as { data: any[] | null; error: any }

  if (error || !events?.length) return

  log.info('Processing pending alert events', { count: events.length })

  for (const event of events) {
    try {
      await dispatchAlertNotification(event, admin)

      await (admin as any)
        .from('alert_events')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', event.id)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      log.error('Alert dispatch failed', { eventId: event.id, channel: event.channel, error: errorMsg })

      await (admin as any)
        .from('alert_events')
        .update({
          retry_count: event.retry_count + 1,
          status: event.retry_count >= 2 ? 'failed' : 'pending',
          error_message: errorMsg,
        })
        .eq('id', event.id)
    }
  }
}

async function dispatchAlertNotification(event: any, admin: any): Promise<void> {
  const product = event.products
  const customer = event.customers
  const savingsAmount = event.savings_amount
  const savingsPct = event.savings_pct

  const productName = product?.title_ar ?? product?.title_en ?? 'منتج'
  const messageAr = buildAlertMessageAr(productName, event.trigger_price, savingsAmount, savingsPct)
  const messageEn = buildAlertMessageEn(productName, event.trigger_price, savingsAmount, savingsPct)

  switch (event.channel as NotificationChannel) {
    case 'sms':
      await sendSmsAlert(customer?.phone, messageAr)
      break

    case 'whatsapp':
      await sendWhatsAppAlert(customer?.whatsapp_number ?? customer?.phone, messageAr)
      break

    case 'email':
      await sendEmailAlert(event.customer_id, productName, event.trigger_price, savingsAmount, savingsPct, product?.image_url)
      break

    case 'push':
      await sendPushAlert(event.customer_id, productName, event.trigger_price, savingsPct)
      break
  }
}

// ─── Channel Implementations ──────────────────────────────────────────────────

async function sendSmsAlert(phone: string | null, message: string): Promise<void> {
  if (!phone) throw new Error('No phone number for SMS alert')

  // Integrate with existing SMS service in communications.ts
  const { sendSms } = await import('@/lib/notifications/sms')
  await sendSms(phone, message)
}

async function sendWhatsAppAlert(phone: string | null, message: string): Promise<void> {
  if (!phone) throw new Error('No phone number for WhatsApp alert')

  const { sendWhatsApp } = await import('@/lib/notifications/whatsapp')
  await sendWhatsApp(phone, message)
}

async function sendEmailAlert(
  customerId: string,
  productName: string,
  triggerPrice: number,
  savingsAmount: number | null,
  savingsPct: number | null,
  imageUrl: string | null
): Promise<void> {
  const { sendPriceAlertEmail } = await import('@/lib/notifications/email')
  await sendPriceAlertEmail({ customerId, productName, triggerPrice, savingsAmount, savingsPct, imageUrl })
}

async function sendPushAlert(
  customerId: string,
  productName: string,
  triggerPrice: number,
  savingsPct: number | null
): Promise<void> {
  const { sendPushToUser } = await import('@/lib/notifications/push')
  const title = `🔥 انخفاض سعر: ${productName}`
  const body = savingsPct
    ? `السعر الجديد: ${triggerPrice.toLocaleString('ar-EG')} ج.م (وفّر ${savingsPct.toFixed(1)}%)`
    : `السعر الجديد: ${triggerPrice.toLocaleString('ar-EG')} ج.م`
  await sendPushToUser(customerId, title, body)
}

// ─── Message Templates ────────────────────────────────────────────────────────

function buildAlertMessageAr(
  productName: string,
  newPrice: number,
  savingsAmount: number | null,
  savingsPct: number | null
): string {
  const price = newPrice.toLocaleString('ar-EG')
  let msg = `🔔 تنبيه سعر Findora\n\n${productName}\nالسعر الجديد: ${price} ج.م`
  if (savingsAmount && savingsPct) {
    msg += `\nوفّرت: ${savingsAmount.toLocaleString('ar-EG')} ج.م (${savingsPct.toFixed(1)}%)`
  }
  msg += `\n\nرابط المنتج: https://findora.com`
  return msg
}

function buildAlertMessageEn(
  productName: string,
  newPrice: number,
  savingsAmount: number | null,
  savingsPct: number | null
): string {
  let msg = `🔔 Findora Price Alert\n\n${productName}\nNew Price: EGP ${newPrice.toLocaleString()}`
  if (savingsAmount && savingsPct) {
    msg += `\nYou save: EGP ${savingsAmount.toLocaleString()} (${savingsPct.toFixed(1)}%)`
  }
  msg += `\n\nfindora.com`
  return msg
}

// ─── CRUD Operations ──────────────────────────────────────────────────────────

export async function createAlert(input: {
  customer_id: string
  product_id: string
  alert_type: AlertType
  target_price?: number
  target_pct?: number
  channels?: NotificationChannel[]
}): Promise<PriceAlert> {
  const admin = await createAdminClient()

  const { data, error } = await (admin as any)
    .from('price_alerts')
    .upsert(
      {
        customer_id: input.customer_id,
        product_id: input.product_id,
        alert_type: input.alert_type,
        target_price: input.target_price ?? null,
        target_pct: input.target_pct ?? null,
        channels: input.channels ?? ['sms'],
        is_active: true,
      },
      { onConflict: 'customer_id,product_id,alert_type' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to create alert: ${error.message}`)
  log.info('Alert created', { alertId: data.id, type: input.alert_type })
  return data
}

export async function getUserAlerts(customerId: string, productId?: string): Promise<PriceAlert[]> {
  const admin = await createAdminClient()
  let query = (admin as any)
    .from('price_alerts')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (productId) query = query.eq('product_id', productId)

  const { data, error } = await query
  if (error) { log.error('getUserAlerts failed', { error: error.message }); return [] }
  return data ?? []
}

export async function deactivateAlert(alertId: string, customerId: string): Promise<boolean> {
  const admin = await createAdminClient()
  const { error } = await (admin as any)
    .from('price_alerts')
    .update({ is_active: false })
    .eq('id', alertId)
    .eq('customer_id', customerId)

  return !error
}

export async function getAlertHistory(customerId: string, limit = 20): Promise<AlertEvent[]> {
  const admin = await createAdminClient()
  const { data, error } = await (admin as any)
    .from('alert_events')
    .select('*, products(title_ar, title_en)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { log.error('getAlertHistory failed', { error: error.message }); return [] }
  return data ?? []
}

// ─── Watchlist Operations ─────────────────────────────────────────────────────

export async function addToWatchlist(customerId: string, productId: string): Promise<boolean> {
  const admin = await createAdminClient()
  const { error } = await (admin as any)
    .from('user_watchlists')
    .upsert({ customer_id: customerId, product_id: productId }, { onConflict: 'customer_id,product_id' })

  return !error
}

export async function removeFromWatchlist(customerId: string, productId: string): Promise<boolean> {
  const admin = await createAdminClient()
  const { error } = await (admin as any)
    .from('user_watchlists')
    .delete()
    .eq('customer_id', customerId)
    .eq('product_id', productId)

  return !error
}

export async function getWatchlist(customerId: string): Promise<any[]> {
  const admin = await createAdminClient()
  const { data, error } = await (admin as any)
    .from('user_watchlists')
    .select(`
      id, created_at,
      products(
        id, title_ar, title_en, brand, category, current_price, currency_code,
        image_url, is_active,
        price_trends(trend_7d, trend_30d, trend_score, lowest_price)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) { log.error('getWatchlist failed', { error: error.message }); return [] }
  return data ?? []
}

export async function isInWatchlist(customerId: string, productId: string): Promise<boolean> {
  const admin = await createAdminClient()
  const { data } = await (admin as any)
    .from('user_watchlists')
    .select('id')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
    .maybeSingle()

  return !!data
}
