/**
 * src/lib/notifications/sms.ts
 * SMS notification dispatcher — integrates with existing SMS service
 */

import { createLogger } from '@/lib/utils/logger'
const log = createLogger('Notifications:SMS')

export async function sendSms(phone: string, message: string): Promise<void> {
  // TODO: Wire to SMS provider (Vonage / Twilio / local provider)
  // Current: log for development, provider-specific in production
  if (process.env.SMS_PROVIDER_API_KEY) {
    const provider = process.env.SMS_PROVIDER ?? 'vonage'
    log.info('Sending SMS', { phone: phone.slice(0, 4) + '****', provider })
    // Add provider-specific SDK call here
    // e.g., await vonage.sms.send({ to: phone, from: 'Findora', text: message })
    throw new Error(`SMS provider '${provider}' not yet configured`)
  }
  log.info('[DEV] SMS would be sent', { phone: phone.slice(0, 4) + '****', preview: message.slice(0, 50) })
}
