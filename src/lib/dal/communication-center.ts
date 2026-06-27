import { createAdminClient } from './customers';

export type MessageAdminFilter = {
  status?: string;
  channel?: string;
  templateCode?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

/**
 * BATCH 4E: Communications Control Center DAL
 */

export async function getOutboundMessagesAdmin(filter: MessageAdminFilter = {}) {
  const adminClient = await createAdminClient();

  // We use separate queries to avoid PostgREST join issues if they arise, 
  // though for outbound_messages it's usually safe. 
  // However, the requirement is to prefer separate queries if needed.
  // We'll do a single join for basic info but fetch counts separately.

  let query = adminClient
    .from('outbound_messages')
    .select(`
      *,
      customers (full_name),
      requests (request_code)
    `, { count: 'exact' });

  if (filter.status && filter.status !== 'ALL') {
    query = query.eq('status', filter.status);
  }
  if (filter.channel && filter.channel !== 'ALL') {
    query = query.eq('channel', filter.channel);
  }
  if (filter.templateCode) {
    query = query.eq('template_code', filter.templateCode);
  }
  if (filter.search) {
    // Search recipient, rendered_subject, rendered_body
    query = query.or(`recipient.ilike.%${filter.search}%,rendered_subject.ilike.%${filter.search}%,rendered_body.ilike.%${filter.search}%`);
  }
  if (filter.dateFrom) {
    query = query.gte('created_at', filter.dateFrom);
  }
  if (filter.dateTo) {
    query = query.lte('created_at', filter.dateTo);
  }

  const limit = filter.limit || 50;
  const offset = filter.offset || 0;

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return {
    messages: (data || []).map((m: any) => ({
      ...m,
      customer_name: m.customers?.full_name || 'Guest',
      request_code: m.requests?.request_code || 'N/A'
    })),
    totalCount: count || 0
  };
}

export async function getOutboundMessageDetailAdmin(messageId: string) {
  const adminClient = await createAdminClient();

  const { data: message, error } = await adminClient
    .from('outbound_messages')
    .select(`
      *,
      customers (*),
      requests (id, request_code, title)
    `)
    .eq('id', messageId)
    .single();

  if (error) throw new Error(error.message);

  // Fetch communication preferences separately
  let preferences = null;
  if (message.customer_id) {
    const { data: prefData } = await adminClient
      .from('communication_preferences')
      .select('*')
      .eq('customer_id', message.customer_id)
      .maybeSingle();
    preferences = prefData;
  }

  return {
    ...message,
    customer_name: message.customers?.full_name || 'Guest',
    request_code: message.requests?.request_code || 'N/A',
    communication_preferences: preferences
  };
}

export async function updateOutboundMessageDraftAdmin(params: {
  messageId: string;
  recipient?: string;
  rendered_subject?: string;
  rendered_body?: string;
  scheduled_at?: string | null;
}) {
  const adminClient = await createAdminClient();

  // Safety check: Only draft or failed
  const { data: current } = await adminClient
    .from('outbound_messages')
    .select('status')
    .eq('id', params.messageId)
    .single();

  if (!current) throw new Error('Message not found');
  if (current.status !== 'draft' && current.status !== 'failed') {
    throw new Error(`Cannot edit message in ${current.status} status.`);
  }

  const { data, error } = await adminClient
    .from('outbound_messages')
    .update({
      recipient: params.recipient,
      rendered_subject: params.rendered_subject,
      rendered_body: params.rendered_body,
      scheduled_at: params.scheduled_at,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function markOutboundMessageQueuedAdmin(messageId: string, actorUserId: string) {
  const adminClient = await createAdminClient();

  const { data: current } = await adminClient
    .from('outbound_messages')
    .select('status')
    .eq('id', messageId)
    .single();

  if (!current) throw new Error('Message not found');
  if (current.status !== 'draft' && current.status !== 'failed') {
    throw new Error(`Cannot queue message from ${current.status} status.`);
  }

  const { data, error } = await adminClient
    .from('outbound_messages')
    .update({
      status: 'queued',
      updated_at: new Date().toISOString(),
      metadata: {
        queued_by: actorUserId,
        queued_at: new Date().toISOString()
      }
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function markOutboundMessageSentManualAdmin(messageId: string, actorUserId: string, providerNote?: string) {
  const adminClient = await createAdminClient();

  const { data: current } = await adminClient
    .from('outbound_messages')
    .select('status')
    .eq('id', messageId)
    .single();

  if (!current) throw new Error('Message not found');
  if (current.status === 'sent') {
    throw new Error('Message is already marked as sent.');
  }

  const { data, error } = await adminClient
    .from('outbound_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider: 'manual',
      provider_message_id: `manual-${Date.now()}`,
      error_message: providerNote || 'Manually marked as sent by staff.',
      updated_at: new Date().toISOString(),
      metadata: {
        sent_manually_by: actorUserId,
        sent_manually_at: new Date().toISOString()
      }
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function skipOutboundMessageAdmin(messageId: string, actorUserId: string, reason: string) {
  const adminClient = await createAdminClient();

  const { data: current } = await adminClient
    .from('outbound_messages')
    .select('status')
    .eq('id', messageId)
    .single();

  if (!current) throw new Error('Message not found');
  if (current.status === 'sent') {
    throw new Error('Cannot skip a message that has already been sent.');
  }

  const { data, error } = await adminClient
    .from('outbound_messages')
    .update({
      status: 'skipped',
      error_message: reason,
      updated_at: new Date().toISOString(),
      metadata: {
        skipped_by: actorUserId,
        skipped_at: new Date().toISOString(),
        skip_reason: reason
      }
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function failOutboundMessageAdmin(messageId: string, actorUserId: string, reason: string) {
  const adminClient = await createAdminClient();

  const { data: current } = await adminClient
    .from('outbound_messages')
    .select('status')
    .eq('id', messageId)
    .single();

  if (!current) throw new Error('Message not found');
  if (current.status === 'sent') {
    throw new Error('Cannot fail a message that has already been sent.');
  }

  const { data, error } = await adminClient
    .from('outbound_messages')
    .update({
      status: 'failed',
      error_message: reason,
      updated_at: new Date().toISOString(),
      metadata: {
        failed_manually_by: actorUserId,
        failed_manually_at: new Date().toISOString(),
        fail_reason: reason
      }
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMessageSummaryCountsAdmin() {
  const adminClient = await createAdminClient();
  
  const statuses = ['draft', 'queued', 'sent', 'failed', 'skipped'];
  const results = await Promise.all(
    statuses.map(s => adminClient.from('outbound_messages').select('*', { count: 'exact', head: true }).eq('status', s))
  );

  const summary: Record<string, number> = {};
  statuses.forEach((s, i) => {
    summary[s] = results[i].count || 0;
  });

  return summary;
}
