import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/notifications/sms'
import { createLogger } from '@/lib/utils/logger'
import { verifyCronAuth, unauthorizedCronResponse } from '@/lib/security/cron'

const log = createLogger('cron/process-notifications')

export async function GET(request: Request) {
  if (!verifyCronAuth(request).authorized) {
    return unauthorizedCronResponse()
  }

  const db = createAdminClient()
  let processed = 0
  let failed = 0

  // Fetch up to 50 unsent messages (status = 'draft' is the default pending state)
  const { data: messages, error } = await (db as any)
    .from('outbound_messages')
    .select('id, channel, recipient, rendered_subject, rendered_body, template_code')
    .in('status', ['draft', 'pending'])
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    log.error('[NOTIFY_CRON] Failed to fetch messages', error)
    return NextResponse.json({ error: 'DB error', processed: 0, failed: 0 }, { status: 500 })
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ processed: 0, failed: 0, message: 'No pending messages' })
  }

  for (const msg of messages) {
    try {
      if (msg.channel === 'email') {
        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) {
          log.warn('[NOTIFY_CRON] RESEND_API_KEY not set — skipping email', { id: msg.id })
          // Mark as failed so it doesn't loop forever
          await (db as any).from('outbound_messages')
            .update({ status: 'failed', error_message: 'RESEND_API_KEY not configured' })
            .eq('id', msg.id)
          failed++
          continue
        }

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FINDORA <notifications@findora.app>',
            to: msg.recipient,
            subject: msg.rendered_subject || 'إشعار من FINDORA',
            html: msg.rendered_body,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Resend error ${res.status}: ${errText}`)
        }

        const resData = await res.json()
        await (db as any).from('outbound_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider: 'resend',
            provider_message_id: resData.id || null,
          })
          .eq('id', msg.id)

      } else if (msg.channel === 'sms') {
        await sendSms(msg.recipient, msg.rendered_body)
        await (db as any).from('outbound_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString(), provider: 'sms' })
          .eq('id', msg.id)

      } else {
        // Unknown channel — mark as failed to prevent infinite loop
        log.warn('[NOTIFY_CRON] Unknown channel', { id: msg.id, channel: msg.channel })
        await (db as any).from('outbound_messages')
          .update({ status: 'failed', error_message: `Unknown channel: ${msg.channel}` })
          .eq('id', msg.id)
        failed++
        continue
      }

      processed++
      log.info('[NOTIFY_CRON] Sent message', { id: msg.id, channel: msg.channel })

    } catch (err: any) {
      failed++
      log.error('[NOTIFY_CRON] Failed to send message', { id: msg.id, error: err.message })
      await (db as any).from('outbound_messages')
        .update({ status: 'failed', error_message: String(err.message).slice(0, 500) })
        .eq('id', msg.id)
    }
  }

  return NextResponse.json({ processed, failed, total: messages.length })
}
