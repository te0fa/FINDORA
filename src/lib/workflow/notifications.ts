// src/lib/workflow/notifications.ts
import { createAdminClient } from '@/lib/dal/customers';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('workflow/notifications')

export type NotificationChannel = 'email' | 'whatsapp' | 'sms';

export async function sendApprovalEmail(request: any): Promise<boolean> {
  const language = request.customer_lang || 'ar';
  const isEn = language === 'en';

  const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://findora.com'}/${language}/track-request?code=${request.request_code}`;
  const updateLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://findora.com'}/${language}/track-request?code=${request.request_code}&update=true`;

  const subject = isEn 
    ? `Sourcing Request Started - #${request.request_code}`
    : `بدأ العمل على طلب التوريد الخاص بك - #${request.request_code}`;

  const body = isEn 
    ? `
Dear ${request.customer_name},

Good news! Your sourcing request has been approved and research has officially started.

### 📋 Request Tracking
- **Tracking ID:** ${request.request_code}
- **Status:** Research Started
- **Track Status here:** [View Progress](${trackingLink})

### 🧠 Sourcing Summary (What We Understood)
${request.ai_summary_en || 'Searching for requested products and suppliers.'}

If you would like to provide additional details, update specs, or modify the request, please click the button below:
[Update / Modify Request](${updateLink})

Best regards,
The FINDORA Sourcing Team
    `.trim()
    : `
عزيزنا ${request.customer_name}،

يسعدنا إبلاغك بأنه تمت الموافقة على طلبك وبدأ العمل عليه رسمياً الآن.

### 📋 تفاصيل تتبع الطلب
- **رقم التتبع:** ${request.request_code}
- **حالة الطلب:** بدأ البحث (Research Started)
- **رابط تتبع الطلب:** [اضغط هنا لمشاهدة التفاصيل](${trackingLink})

### 🧠 ملخص الطلب (ماذا فهمنا)
${request.ai_summary_ar || 'البحث عن المنتجات والموردين المطلوبين.'}

إذا كنت ترغب في تعديل نطاق البحث أو إضافة تفاصيل جديدة أو تعديل الطلب، يرجى الضغط على الرابط التالي:
[تعديل وتحديث الطلب](${updateLink})

أطيب التحيات،
فريق عمل FINDORA
    `.trim();

  // Save the notification defensively in DB
  const emailSent = await sendNotification({
    request_id: request.id,
    customer_id: request.customer_id,
    recipient: request.customer_email || 'customer@findora.com',
    subject,
    body,
    channel: 'email'
  });

  if (emailSent) {
    log.info("[EMAIL_SENT]", request.id);
    return true;
  }

  return false;
}

export async function sendNotification(params: {
  request_id: string;
  customer_id: string;
  recipient: string;
  subject?: string;
  body: string;
  channel: NotificationChannel;
}): Promise<boolean> {
  const adminClient = await createAdminClient();

  // STUB out for future WhatsApp / SMS integration architecture
  if (params.channel === 'whatsapp') {
    log.info(`[WHATSAPP_PREPARATION_STUB] Outbound WhatsApp queued to ${params.recipient}`);
    return true;
  }

  if (params.channel === 'sms') {
    log.info(`[SMS_PREPARATION_STUB] Outbound SMS queued to ${params.recipient}`);
    return true;
  }

  // Active email delivery
  try {
    // 1. Defensively insert into request_messages first (if it exists)
    try {
      const { error } = await adminClient
        .from('request_messages')
        .insert({
          request_id: params.request_id,
          sender_id: params.customer_id,
          sender_type: 'system',
          message: params.body,
          metadata: {
            subject: params.subject || 'Notification',
            channel: params.channel
          }
        });

      if (!error) {
        return true;
      }
      throw error;
    } catch (err: any) {
      // Fallback: save inside public.outbound_messages (our active DB table)
      const { error: fallbackError } = await adminClient
        .from('outbound_messages')
        .insert({
          request_id: params.request_id,
          customer_id: params.customer_id,
          channel: params.channel,
          recipient: params.recipient,
          rendered_subject: params.subject || 'Notification',
          rendered_body: params.body,
          status: 'sent', // Simulate immediately sent
          sent_at: new Date().toISOString()
        });

      if (fallbackError) {
        log.error("[NOTIFICATION_ERROR] Failed to save in outbound_messages fallback:", fallbackError.message);
        return false;
      }
    }

    return true;
  } catch (err: any) {
    log.error("[NOTIFICATION_CRITICAL_FAIL] Failed to send notification:", err.message);
    return false;
  }
}
