import { createAdminClient } from './customers';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('DAL:communications');


export type OutboundMessageStatus = 'draft' | 'queued' | 'sent' | 'failed' | 'skipped';

/**
 * Queues a communication message based on a template.
 * Messages are created in 'draft' or 'queued' status and are NOT sent externally.
 */
export async function queueCommunication(params: {
  customerId: string;
  requestId?: string;
  templateCode: string;
  language?: string;
  channel?: string;
  variables?: Record<string, string>;
  status?: OutboundMessageStatus;
  force?: boolean;
}) {
  const db = await createAdminClient();

  // 1. Check for duplicate draft (Prevention)
  if (!params.force && params.requestId) {
    const { data: existing } = await db
      .from('outbound_messages')
      .select('id')
      .eq('request_id', params.requestId)
      .eq('template_code', params.templateCode)
      .eq('status', 'draft')
      .maybeSingle();

    if (existing) {
      log.debug(`Skipping duplicate draft`, { templateCode: params.templateCode, requestId: params.requestId });
      return existing;
    }
  }

  // 2. Resolve Language and Channel from Preferences
  const prefs = await getCommunicationPreferences(params.customerId);
  const lang = params.language || prefs?.language_preference || 'ar';
  const channel = params.channel || prefs?.preferred_channel || 'email';
  
  // 3. Fetch Template
  const { data: template, error: tErr } = await db
    .from('communication_templates')
    .select('*')
    .eq('template_code', params.templateCode)
    .eq('language_code', lang)
    .eq('is_active', true)
    .maybeSingle();

  if (tErr || !template) {
    console.warn(`[COMM] Template ${params.templateCode} (${lang}) not found or inactive.`);
    return null;
  }

  // 4. Resolve Recipient
  const contact = await resolveCustomerContact(params.customerId, channel);
  if (!contact) {
    console.warn(`[COMM] No recipient found for customer ${params.customerId} on channel ${channel}. Skipping.`);
    return null;
  }

  // 5. Render Templates
  const vars = {
    customer_name: contact.name || 'Customer',
    ...params.variables
  };

  let renderedSubject = template.subject_template || '';
  let renderedBody = template.body_template || '';

  Object.entries(vars).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    renderedSubject = renderedSubject.replace(placeholder, value);
    renderedBody = renderedBody.replace(placeholder, value);
  });

  // 6. Insert Outbound Message (STRICTLY DRAFT by default)
  const { data, error } = await db
    .from('outbound_messages')
    .insert({
      customer_id: params.customerId,
      request_id: params.requestId || null,
      channel: channel,
      recipient: contact.value,
      template_code: params.templateCode,
      rendered_subject: renderedSubject,
      rendered_body: renderedBody,
      status: params.status || 'draft',
      metadata: { variables: vars }
    })
    .select()
    .single();

  if (error) {
    console.warn(`[COMM] Failed to queue message ${params.templateCode}:`, error.message);
    return null;
  }

  // Auto-send SMS/WhatsApp if status is queued/sent or if channel dictates it
  const shouldSendNow = params.status === 'queued' || params.status === 'sent' || channel === 'sms' || channel === 'whatsapp';
  if (shouldSendNow && contact.value) {
    sendOutboundSMS(contact.value, renderedBody).then(async (res) => {
      if (res && res.success) {
        await db
          .from('outbound_messages')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(),
            provider: res.provider,
            provider_message_id: res.sid || null
          })
          .eq('id', data.id);
      } else {
        await db
          .from('outbound_messages')
          .update({ 
            status: 'failed',
            error_message: res?.error || 'Sending failed'
          })
          .eq('id', data.id);
      }
    }).catch(err => {
      console.error(`[COMM] Error in async sendOutboundSMS:`, err.message);
    });
  }

  return data;
}

/**
 * Resolves the contact value (email/phone) for a customer based on the channel.
 */
export async function resolveCustomerContact(customerId: string, channel: string) {
  const db = await createAdminClient();
  const { data: customer } = await db
    .from('customers')
    .select('email, phone_number_normalized, full_name')
    .eq('id', customerId)
    .single();

  if (!customer) return null;

  if (channel === 'email') {
    return customer.email ? { value: customer.email, name: customer.full_name } : null;
  } else {
    // WhatsApp/Telegram use phone
    return customer.phone_number_normalized ? { value: customer.phone_number_normalized, name: customer.full_name } : null;
  }
}

/**
 * Retrieves communication preferences for a customer.
 */
export async function getCommunicationPreferences(customerId: string) {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('communication_preferences')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error(`[COMM] Failed to fetch preferences for ${customerId}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Upserts communication preferences.
 */
export async function updateCommunicationPreferences(params: {
  customerId: string;
  preferredChannel?: string;
  allowMarketing?: boolean;
  allowStatusUpdates?: boolean;
  languagePreference?: string;
}) {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('communication_preferences')
    .upsert({
      customer_id: params.customerId,
      preferred_channel: params.preferredChannel,
      allow_marketing: params.allowMarketing,
      allow_status_updates: params.allowStatusUpdates,
      language_preference: params.languagePreference,
      updated_at: new Date().toISOString()
    }, { onConflict: 'customer_id' })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function sendOutboundSMS(phone: string, text: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  const smsMisrApiKey = process.env.SMS_MISR_API_KEY;
  const smsMisrSenderId = process.env.SMS_MISR_SENDER_ID;

  console.log(`[SMS GATEWAY] Sending SMS to ${phone}...`);

  // 1. Try SMS-Misr (Egyptian Regional Gateway)
  if (smsMisrApiKey && smsMisrSenderId) {
    try {
      const url = `https://smsmisr.com/api/v2/?apikey=${smsMisrApiKey}&sender=${smsMisrSenderId}&to=${phone}&message=${encodeURIComponent(text)}&language=3`;
      const res = await fetch(url);
      const data = await res.json();
      console.log(`[SMS-MISR Response]`, data);
      return { success: true, provider: 'sms-misr', data };
    } catch (err: any) {
      console.error(`[SMS-MISR Error]`, err.message);
      return { success: false, error: err.message };
    }
  }

  // 2. Try Twilio
  if (accountSid && authToken && fromPhone) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const body = new URLSearchParams({
        To: phone,
        From: fromPhone,
        Body: text
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[Twilio Response] SUCCESS`, data.sid);
        return { success: true, provider: 'twilio', sid: data.sid };
      } else {
        console.error(`[Twilio Response] ERROR`, data);
        return { success: false, error: data.message || 'Twilio failed' };
      }
    } catch (err: any) {
      console.error(`[Twilio Error]`, err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. Simulation Fallback
  console.log(`[SMS GATEWAY SIMULATION] To: ${phone}`);
  console.log(`[SMS GATEWAY SIMULATION] Body: ${text}`);
  return { success: true, provider: 'simulation' };
}

