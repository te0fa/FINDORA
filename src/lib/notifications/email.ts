/**
 * src/lib/notifications/email.ts
 * Email notification dispatcher using Resend (recommended) or SMTP fallback
 */

import { createLogger } from '@/lib/utils/logger'
const log = createLogger('Notifications:Email')

interface PriceAlertEmailPayload {
  customerId: string
  productName: string
  triggerPrice: number
  savingsAmount: number | null
  savingsPct: number | null
  imageUrl: string | null
}

export async function sendPriceAlertEmail(payload: PriceAlertEmailPayload): Promise<void> {
  const { customerId, productName, triggerPrice, savingsAmount, savingsPct, imageUrl } = payload
  const apiKey = process.env.RESEND_API_KEY

  // Fetch customer email from DB
  const { createAdminClient } = await import('@/lib/dal/customers')
  const admin = await createAdminClient()
  const { data: customer } = await (admin as any)
    .from('customers')
    .select('email:auth_user_id')
    .eq('id', customerId)
    .maybeSingle()

  // Get email from auth.users via admin
  if (!apiKey) {
    log.info('[DEV] Price alert email would be sent', {
      customerId,
      productName,
      triggerPrice,
    })
    return
  }

  const subject = `🔔 انخفض سعر ${productName} على Findora`
  const html = buildPriceAlertHtml(productName, triggerPrice, savingsAmount, savingsPct, imageUrl)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Findora Alerts <alerts@findora.com>',
      to: customer?.email ?? 'unknown@findora.com',
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend API error: ${res.status} — ${err}`)
  }

  log.info('Price alert email sent', { customerId, productName })
}

function buildPriceAlertHtml(
  productName: string,
  price: number,
  savingsAmount: number | null,
  savingsPct: number | null,
  imageUrl: string | null
): string {
  const priceFormatted = price.toLocaleString('ar-EG')
  const savingsLine = savingsAmount && savingsPct
    ? `<p style="color:#16a34a;font-weight:bold">💰 وفّرت: ${savingsAmount.toLocaleString('ar-EG')} ج.م (${savingsPct.toFixed(0)}%)</p>`
    : ''

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"><title>تنبيه سعر Findora</title></head>
    <body style="font-family:Arial,sans-serif;background:#f9fafb;padding:24px;direction:rtl">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <div style="text-align:center;margin-bottom:24px">
          <img src="https://findora.com/logo.png" alt="Findora" height="40" />
        </div>
        ${imageUrl ? `<img src="${imageUrl}" alt="${productName}" style="width:100%;border-radius:8px;margin-bottom:16px;max-height:200px;object-fit:cover" />` : ''}
        <h2 style="color:#1e293b;margin:0 0 8px">🔔 تنبيه انخفاض سعر</h2>
        <h3 style="color:#0f172a;margin:0 0 16px;font-size:1.1rem">${productName}</h3>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:16px">
          <p style="margin:0;font-size:1.5rem;font-weight:bold;color:#15803d">السعر الجديد: ${priceFormatted} ج.م</p>
          ${savingsLine}
        </div>
        <a href="https://findora.com/products" 
           style="display:block;background:#2563eb;color:#fff;text-align:center;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:16px">
          عرض المنتج الآن
        </a>
        <p style="color:#64748b;font-size:0.8rem;text-align:center">
          يمكنك إلغاء الاشتراك من <a href="https://findora.com/alerts">إعدادات التنبيهات</a>
        </p>
      </div>
    </body>
    </html>
  `
}

export async function sendPushToUser(customerId: string, title: string, body: string): Promise<void> {
  // Re-export the push sender from existing push module
  const { default: webpush } = await import('web-push')
  const { createAdminClient } = await import('@/lib/dal/customers')
  const admin = await createAdminClient()

  const { data: customer } = await (admin as any)
    .from('customers')
    .select('auth_user_id')
    .eq('id', customerId)
    .maybeSingle()

  if (!customer) return

  // Get push subscription from user metadata
  const { createAdminClient: supabaseAdmin } = await import('@/lib/supabase/admin')
  const adminSupa = supabaseAdmin()
  const { data: { user } } = await adminSupa.auth.admin.getUserById(customer.auth_user_id)
  const subscription = user?.user_metadata?.push_subscription

  if (!subscription) {
    log.info('No push subscription for user', { customerId })
    return
  }

  const payload = JSON.stringify({ title, body, data: { url: '/watchlist' } })

  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails('mailto:support@findora.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    await webpush.sendNotification(subscription, payload)
    log.info('Push sent', { customerId })
  } else {
    log.info('[DEV] Push would be sent', { customerId, title })
  }
}
