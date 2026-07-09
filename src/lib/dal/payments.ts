import { createAdminClient } from './customers';
import { logPlatformEvent, logCustomerIntelEvent } from './intelligence';
import { queueCommunication } from './communications';
import { resolveStaffIdForAudit } from './audit';
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:payments');


export type PaymentIntentStatus = 'draft' | 'pending_customer' | 'submitted' | 'confirmed' | 'rejected' | 'cancelled';
export type PaymentIntentType = 'request_fee' | 'report_unlock' | 'procurement_fee' | 'custom';

export interface PaymentIntent {
  id: string;
  request_id: string;
  customer_id: string;
  intent_type: PaymentIntentType;
  amount: number;
  currency_code: string;
  status: PaymentIntentStatus;
  provider: string;
  provider_reference: string | null;
  payment_instructions: string | null;
  expires_at: string | null;
  created_by_staff_id: string | null;
  confirmed_by_staff_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export interface PaymentAuditEvent {
  id: string;
  payment_intent_id: string | null;
  request_id: string | null;
  event_type: string;
  actor_type: 'staff' | 'customer' | 'system';
  actor_staff_id: string | null;
  notes: string | null;
  metadata: any;
  created_at: string;
}

/**
 * Creates a new payment intent and logs initial audit event.
 * Also queues 'payment_required' communication as draft.
 */
export async function createPaymentIntentAdmin(params: {
  requestId: string;
  customerId: string;
  intentType: PaymentIntentType;
  amount: number;
  currencyCode?: string;
  paymentInstructions?: string;
  actorStaffId: string;
  metadata?: any;
}) {
  const db = await createAdminClient();

  // Resolve actorStaffId (could be auth_user_id or staff_member_id)
  let resolvedId = await resolveStaffIdForAudit(params.actorStaffId);
  if (!resolvedId) {
    // Check if it's already a staff_member_id
    const { data: exists } = await db.from('staff_members').select('id').eq('id', params.actorStaffId).maybeSingle();
    if (exists) resolvedId = exists.id;
  }

  if (!resolvedId) {
    throw new Error('BLOCK: Staff actor not found.');
  }
  
  const { data: intent, error } = await db
    .from('payment_intents')
    .insert({
      request_id: params.requestId,
      customer_id: params.customerId,
      intent_type: params.intentType,
      amount: params.amount,
      currency_code: params.currencyCode || 'EGP',
      payment_instructions: params.paymentInstructions || null,
      created_by_staff_id: resolvedId,
      status: 'pending_customer',
      metadata: params.metadata || {}
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 1. Log Audit
  await logPaymentAuditEventAdmin({
    paymentIntentId: intent.id,
    requestId: params.requestId,
    eventType: 'INTENT_CREATED',
    actorType: 'staff',
    actorStaffId: resolvedId,
    notes: `Initial intent created for ${params.amount} ${params.currencyCode || 'EGP'}`
  });

  // 2. Queue Communication (DRAFT)
  try {
    const { data: req } = await db.from('requests').select('request_code, title').eq('id', params.requestId).single();
    await queueCommunication({
      customerId: params.customerId,
      requestId: params.requestId,
      templateCode: 'payment_required',
      variables: {
        request_code: req?.request_code || 'N/A',
        amount: params.amount.toString(),
        currency: params.currencyCode || 'EGP'
      },
      status: 'draft'
    });
  } catch (err) {
    log.warn('[PAYMENTS] Comm queue failed:', err);
  }

  return intent as PaymentIntent;
}

/**
 * Fetches a single payment intent with details.
 */
export async function getPaymentIntentAdmin(id: string) {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('payment_intents')
    .select('*, customer:customers(full_name), request:requests(request_code, title), audit_events:payment_audit_events(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Lists payment intents with filters.
 */
export async function listPaymentIntentsAdmin(filters: {
  status?: PaymentIntentStatus | 'ALL';
  customerId?: string;
  requestId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await createAdminClient();
  let query = db.from('payment_intents').select('*, customer:customers(full_name), request:requests(request_code, title)', { count: 'exact' });

  if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.requestId) query = query.eq('request_id', filters.requestId);

  query = query.order('created_at', { ascending: false });
  query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { items: data, total: count || 0 };
}

/**
 * Staff confirms a payment manually.
 */
export async function confirmPaymentIntentAdmin(params: {
  id: string;
  actorStaffId: string;
  notes?: string;
  externalReference?: string;
}) {
  const db = await createAdminClient();

  // Resolve actorStaffId
  let resolvedId = await resolveStaffIdForAudit(params.actorStaffId);
  if (!resolvedId) {
    const { data: exists } = await db.from('staff_members').select('id').eq('id', params.actorStaffId).maybeSingle();
    if (exists) resolvedId = exists.id;
  }
  
  // 1. Fetch current intent
  const { data: intent, error: fetchErr } = await db.from('payment_intents').select('*').eq('id', params.id).single();
  if (fetchErr || !intent) throw new Error('Payment intent not found');

  if (intent.status === 'confirmed') return intent;

  // 2. Update Status
  const { data: updated, error: updateErr } = await db
    .from('payment_intents')
    .update({
      status: 'confirmed',
      confirmed_by_staff_id: resolvedId,
      confirmed_at: new Date().toISOString(),
      provider_reference: params.externalReference || intent.provider_reference,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single();

  if (updateErr) throw new Error(updateErr.message);


  // 3. Log Audit
  await logPaymentAuditEventAdmin({
    paymentIntentId: params.id,
    requestId: intent.request_id,
    eventType: 'PAYMENT_CONFIRMED',
    actorType: 'staff',
    actorStaffId: resolvedId,
    notes: params.notes || 'Payment confirmed manually by staff'
  });

  // 4. Log Intelligence Events
  await Promise.all([
    logPlatformEvent({
      eventType: 'payment_recorded',
      actorType: 'staff',
      actorId: resolvedId || 'system',
      requestId: intent.request_id,
      customerId: intent.customer_id,
      metadata: { amount: intent.amount, intent_id: intent.id }
    }),
    logCustomerIntelEvent({
      customerId: intent.customer_id,
      eventType: 'payment_made',
      requestId: intent.request_id,
      metadata: { amount: intent.amount, intent_id: intent.id }
    })
  ]);

  // 5. Queue Communication (DRAFT)
  try {
    const { data: req } = await db.from('requests').select('request_code').eq('id', intent.request_id).single();
    await queueCommunication({
      customerId: intent.customer_id,
      requestId: intent.request_id,
      templateCode: 'payment_received',
      variables: {
        request_code: req?.request_code || 'N/A',
        amount: intent.amount.toString()
      },
      status: 'draft'
    });
  } catch (err) {
    log.warn('[PAYMENTS] Comm queue failed:', err);
  }

  return updated;
}

/**
 * System automatically confirms a payment intent (e.g. via PayMob webhook or Gemini OCR).
 */
export async function confirmPaymentIntentSystem(params: {
  id: string;
  externalReference?: string;
  notes?: string;
}) {
  const db = await createAdminClient();

  // 1. Fetch current intent
  const { data: intent, error: fetchErr } = await db.from('payment_intents').select('*').eq('id', params.id).single();
  if (fetchErr || !intent) throw new Error('Payment intent not found');

  if (intent.status === 'confirmed') return intent;

  // 2. Update Status
  const { data: updated, error: updateErr } = await db
    .from('payment_intents')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      provider_reference: params.externalReference || intent.provider_reference,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single();

  if (updateErr) throw new Error(updateErr.message);


  // 3. Log Audit
  await logPaymentAuditEventAdmin({
    paymentIntentId: params.id,
    requestId: intent.request_id,
    eventType: 'PAYMENT_CONFIRMED',
    actorType: 'system',
    notes: params.notes || 'Payment confirmed automatically by system'
  });

  // 4. Log Intelligence Events
  await Promise.all([
    logPlatformEvent({
      eventType: 'payment_recorded',
      actorType: 'system',
      actorId: 'system',
      requestId: intent.request_id,
      customerId: intent.customer_id,
      metadata: { amount: intent.amount, intent_id: intent.id }
    }),
    logCustomerIntelEvent({
      customerId: intent.customer_id,
      eventType: 'payment_made',
      requestId: intent.request_id,
      metadata: { amount: intent.amount, intent_id: intent.id }
    })
  ]);

  // 5. Queue Communication (DRAFT)
  try {
    const { data: req } = await db.from('requests').select('request_code').eq('id', intent.request_id).single();
    await queueCommunication({
      customerId: intent.customer_id,
      requestId: intent.request_id,
      templateCode: 'payment_received',
      variables: {
        request_code: req?.request_code || 'N/A',
        amount: intent.amount.toString()
      },
      status: 'draft'
    });
  } catch (err) {
    log.warn('[PAYMENTS] Comm queue failed:', err);
  }

  // 6. Automatically unlock report snapshots
  const { unlockAllSnapshotsForRequest } = await import('./reports');
  await unlockAllSnapshotsForRequest(intent.request_id);

  // 7. Update referral log to first_transaction status
  try {
    const { data: customer } = await db.from('customers').select('email').eq('id', intent.customer_id).single();
    if (customer?.email) {
      const { updateReferralStatus } = await import('./points');
      await updateReferralStatus(customer.email, 'first_transaction');
    }
  } catch (err) {
    log.warn('[PAYMENTS] Referral status update failed:', err);
  }

  return updated;
}


/**
 * Rejects or cancels a payment intent.
 */
export async function updatePaymentIntentStatusAdmin(params: {
  id: string;
  status: 'rejected' | 'cancelled';
  actorStaffId: string;
  notes?: string;
}) {
  const db = await createAdminClient();

  // Resolve actorStaffId
  let resolvedId = await resolveStaffIdForAudit(params.actorStaffId);
  if (!resolvedId) {
    const { data: exists } = await db.from('staff_members').select('id').eq('id', params.actorStaffId).maybeSingle();
    if (exists) resolvedId = exists.id;
  }

  const { data: intent } = await db.from('payment_intents').select('request_id').eq('id', params.id).single();

  const { data, error } = await db
    .from('payment_intents')
    .update({ status: params.status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logPaymentAuditEventAdmin({
    paymentIntentId: params.id,
    requestId: intent?.request_id || null,
    eventType: `PAYMENT_${params.status.toUpperCase()}`,
    actorType: 'staff',
    actorStaffId: resolvedId,
    notes: params.notes
  });

  return data;
}

/**
 * Unlocks a report/contact after confirmed payment.
 */
export async function unlockReportAfterPaymentAdmin(params: {
  requestId: string;
  customerId: string;
  paymentIntentId: string;
  unlockType: 'report_full' | 'supplier_contact' | 'execution_details';
  actorStaffId?: string;
  revealText?: string;
}) {
  const db = await createAdminClient();

  // Resolve actorStaffId
  let resolvedId: string | null = null;
  if (params.actorStaffId) {
    resolvedId = await resolveStaffIdForAudit(params.actorStaffId);
    if (!resolvedId) {
      const { data: exists } = await db.from('staff_members').select('id').eq('id', params.actorStaffId).maybeSingle();
      if (exists) resolvedId = exists.id;
    }
  }

  // 1. Safety check: Payment must be confirmed
  const { data: intent } = await db.from('payment_intents').select('status').eq('id', params.paymentIntentId).single();
  if (intent?.status !== 'confirmed') {
    throw new Error('BLOCK: Cannot unlock without a confirmed payment intent.');
  }

  // 2. Resolve Report ID if not provided
  let reportId = (params as any).reportId;
  if (!reportId) {
    const { data: report } = await db
      .from('reports')
      .select('id')
      .eq('request_id', params.requestId)
      .limit(1)
      .maybeSingle();
    reportId = report?.id || null;
  }

  // 3. Insert into source_reveals
  const { data, error } = await db
    .from('source_reveals')
    .insert({
      request_id: params.requestId,
      report_id: reportId ?? undefined,
      payment_intent_id: params.paymentIntentId,
      reveal_type: params.unlockType,
      revealed_source_text: params.revealText || 'Unlocked details',
      revealed_by: resolvedId,
      revealed_at: new Date().toISOString()
    } as any)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Gets payment status for a specific request.
 */
export async function getRequestPaymentStatusAdmin(requestId: string) {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('payment_intents')
    .select('status, amount, intent_type')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

/**
 * Returns revenue summary for a customer.
 */
export async function getCustomerRevenueSummaryAdmin(customerId: string) {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('payment_intents')
    .select('amount')
    .eq('customer_id', customerId)
    .eq('status', 'confirmed');

  if (error) return { total: 0, count: 0 };
  const total = data.reduce((acc, curr) => acc + Number(curr.amount), 0);
  return { total, count: data.length };
}

/**
 * Fetches requests that have a service_fee_amount > 0 but no confirmed payment intent.
 */
export async function getRequestsNeedingPaymentAdmin(filters: {
  limit?: number;
  offset?: number;
}) {
  const db = await createAdminClient();
  
  // 1. Fetch requests with fee
  const { data: requests, error } = await db
    .from('requests')
    .select('*, customer:customers(full_name)')
    .gt('service_fee_amount', 0)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!requests) return { items: [], total: 0 };

  // 2. Fetch confirmed intents to filter
  const requestIds = requests.map(r => r.id);
  const { data: confirmedIntents } = await db
    .from('payment_intents')
    .select('request_id')
    .in('request_id', requestIds)
    .eq('status', 'confirmed');

  const confirmedSet = new Set(confirmedIntents?.map(i => i.request_id) || []);
  const filtered = requests.filter(r => !confirmedSet.has(r.id));

  // Pagination in JS for this specific filtered set
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);

  return { items: paginated, total: filtered.length };
}

/**
 * Lists confirmed records from the legacy public.payments table.
 */
export async function listConfirmedPaymentsLedgerAdmin(filters: {
  limit?: number;
  offset?: number;
}) {
  const db = await createAdminClient();
  const { data, count, error } = await db
    .from('payments')
    .select('*, customer:customers(full_name), request:requests(request_code, title)', { count: 'exact' })
    .eq('payment_status', 'confirmed')
    .order('confirmed_at', { ascending: false })
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

  if (error) throw new Error(error.message);
  return { items: data || [], total: count || 0 };
}

/**
 * Internal helper to log audit events.
 */
export async function logPaymentAuditEventAdmin(params: {
  paymentIntentId?: string | null;
  requestId?: string | null;
  eventType: string;
  actorType: 'staff' | 'customer' | 'system';
  actorStaffId?: string | null;
  notes?: string | null;
  metadata?: any;
}) {
  const db = await createAdminClient();
  await db.from('payment_audit_events').insert({
    payment_intent_id: params.paymentIntentId || null,
    request_id: params.requestId || null,
    event_type: params.eventType,
    actor_type: params.actorType,
    actor_staff_id: params.actorStaffId || null,
    notes: params.notes || null,
    metadata: params.metadata || {}
  });
}

/**
 * Submit payment receipt from customer
 */
export async function submitPaymentReceipt(params: {
  paymentIntentId: string;
  receiptImagePath: string;
}) {
  const db = await createAdminClient();
  
  // 1. Fetch the payment intent
  const { data: intent, error: fetchErr } = await db
    .from('payment_intents')
    .select('*')
    .eq('id', params.paymentIntentId)
    .single();
    
  if (fetchErr || !intent) throw new Error('Payment intent not found');
  
  // 2. Update status and save receipt image path
  const { data: updated, error: updateErr } = await db
    .from('payment_intents')
    .update({
      status: 'submitted',
      receipt_image_path: params.receiptImagePath,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.paymentIntentId)
    .select()
    .single();
    
  if (updateErr) throw new Error(updateErr.message);
  
  // 3. Log Audit
  await logPaymentAuditEventAdmin({
    paymentIntentId: params.paymentIntentId,
    requestId: intent.request_id,
    eventType: 'RECEIPT_SUBMITTED',
    actorType: 'customer',
    notes: `Customer uploaded payment receipt: ${params.receiptImagePath}`
  });
  
  // 4. Automatically unlock all report snapshots for the request
  const { unlockAllSnapshotsForRequest } = await import('./reports');
  await unlockAllSnapshotsForRequest(intent.request_id);
  
  return updated;
}

/**
 * Get active payment intent for request
 */
export async function getPaymentIntentByRequestId(requestId: string) {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('payment_intents')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) return null;
  return data;
}

/**
 * Gets or creates a payment intent for a customer requesting to unlock a report proposal.
 */
export async function getOrCreatePaymentIntentForCustomer(requestId: string, customerId: string) {
  const db = await createAdminClient();

  // 1. Check if a payment intent already exists for this request
  const existing = await getPaymentIntentByRequestId(requestId);
  if (existing) {
    return existing;
  }

  // 2. Fetch request details to get service fee amount
  const { data: request, error: reqErr } = await db
    .from('requests')
    .select('service_fee_amount')
    .eq('id', requestId)
    .single();

  if (reqErr || !request) {
    throw new Error(`[DAL] Request not found or failed to fetch fee: ${reqErr?.message}`);
  }

  const amount = request.service_fee_amount || 0;
  const currency = 'EGP';


  // 3. Insert new payment intent
  const { data: intent, error: insertErr } = await db
    .from('payment_intents')
    .insert({
      request_id: requestId,
      customer_id: customerId,
      intent_type: 'report_unlock',
      amount,
      currency_code: currency,
      status: 'pending_customer',
      created_by_staff_id: null,
      metadata: { source: 'customer_confirm' }
    })
    .select()
    .single();

  if (insertErr || !intent) {
    throw new Error(`[DAL] Failed to create payment intent: ${insertErr?.message}`);
  }

  // 4. Log audit event
  await logPaymentAuditEventAdmin({
    paymentIntentId: intent.id,
    requestId,
    eventType: 'INTENT_CREATED',
    actorType: 'customer',
    notes: `Customer created report unlock intent for ${amount} ${currency}`
  });

  return intent;
}


