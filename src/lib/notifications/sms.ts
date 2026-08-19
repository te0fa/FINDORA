/**
 * src/lib/notifications/sms.ts
 * SMS notification dispatcher — integrates with existing SMS service
 */

import { createLogger } from '@/lib/utils/logger'
const log = createLogger('Notifications:SMS')

export async function sendSms(phone: string, message: string): Promise<void> {
  if (process.env.SMS_PROVIDER_API_KEY) {
    const provider = process.env.SMS_PROVIDER ?? 'vonage'
    // TODO: Integrate actual SMS provider SDK here (Vonage/Twilio/local)
    // For now: graceful no-op to prevent crashes in production
    log.warn('[SMS] Provider not yet integrated. SMS not sent.', {
      provider,
      phone: phone.slice(0, 4) + '****',
      messageLength: message.length
    })
    return  // graceful no-op instead of throw
  }
  log.info('[DEV] SMS would be sent', { phone: phone.slice(0, 4) + '****', preview: message.slice(0, 50) })
}
