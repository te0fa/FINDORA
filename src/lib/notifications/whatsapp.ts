/**
 * src/lib/notifications/whatsapp.ts
 * WhatsApp Business API notification dispatcher
 */

import { createLogger } from '@/lib/utils/logger'
const log = createLogger('Notifications:WhatsApp')

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const token = process.env.WHATSAPP_API_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (token && phoneId) {
    const cleanPhone = phone.replace(/\D/g, '')
    const intlPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone // Egypt prefix

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: intlPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      log.error('WhatsApp send failed', { status: res.status, error: err })
      throw new Error(`WhatsApp API error: ${res.status}`)
    }

    log.info('WhatsApp sent', { phone: intlPhone.slice(0, 6) + '****' })
  } else {
    log.info('[DEV] WhatsApp would be sent', {
      phone: phone.slice(0, 4) + '****',
      preview: message.slice(0, 50),
    })
  }
}
