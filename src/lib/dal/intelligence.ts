import { createAdminClient } from './customers';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('DAL:intelligence')

export type MerchantEventType = 
  | 'quote_submitted' 
  | 'shortlisted' 
  | 'selected_by_customer' 
  | 'paid_conversion' 
  | 'issue_reported';

export type CustomerIntelEventType = 
  | 'request_created' 
  | 'request_completed' 
  | 'payment_made' 
  | 'contact_interaction';

export type PlatformEventType = 
  | 'visitor_landed' 
  | 'request_started' 
  | 'request_submitted' 
  | 'report_released' 
  | 'report_preparing'
  | 'report_ready'
  | 'payment_recorded'
  | 'request_accepted'
  | 'request_rejected'
  | 'clarification_needed'
  | 'research_started';

/**
 * Logs a merchant performance event.
 */
export async function logMerchantEvent(params: {
  merchantId: string;
  eventType: MerchantEventType;
  requestId?: string;
  metadata?: any;
}) {
  const db = await createAdminClient();
  const { error } = await db.from('merchant_performance_events').insert({
    merchant_id: params.merchantId,
    event_type: params.eventType,
    request_id: params.requestId || null,
    metadata: params.metadata || {}
  });

  if (error) {
    log.error(`[INTEL] Failed to log merchant event ${params.eventType}:`, error.message);
  }
}

/**
 * Logs a customer intelligence event.
 */
export async function logCustomerIntelEvent(params: {
  customerId: string;
  eventType: CustomerIntelEventType;
  requestId?: string;
  metadata?: any;
}) {
  const db = await createAdminClient();
  const { error } = await db.from('customer_intelligence_events').insert({
    customer_id: params.customerId,
    event_type: params.eventType,
    request_id: params.requestId || null,
    metadata: params.metadata || {}
  });

  if (error) {
    log.error(`[INTEL] Failed to log customer event ${params.eventType}:`, error.message);
  }
}

/**
 * Logs a platform-wide funnel event.
 */
export async function logPlatformEvent(params: {
  eventType: PlatformEventType;
  actorType?: 'guest' | 'customer' | 'staff' | 'system';
  actorId?: string;
  requestId?: string;
  customerId?: string;
  merchantId?: string;
  metadata?: any;
}) {
  const db = await createAdminClient();
  const { error } = await db.from('platform_events').insert({
    event_type: params.eventType,
    actor_type: params.actorType || 'guest',
    actor_id: params.actorId || null,
    request_id: params.requestId || null,
    customer_id: params.customerId || null,
    merchant_id: params.merchantId || null,
    metadata: params.metadata || {}
  });

    if (error) {
    log.warn(`[INTEL] Failed to log platform event ${params.eventType}:`, error.message);
  }
}

/**
 * Resolves a merchant record for a quote, creating it if needed.
 * Respects legacy NOT NULL constraints: 'name', 'merchant_type'.
 */
export async function resolveMerchantForQuote(params: {
  merchantName: string;
  category?: string;
  governorate?: string;
  area?: string;
  address?: string;
}) {
  const db = await createAdminClient();
  const merchantCode = `M-${params.merchantName.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Try to find existing by name (exact)
  const { data: existing } = await db
    .from('merchants')
    .select('id')
    .eq('name', params.merchantName)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new with legacy compatibility
  const { data, error } = await db
    .from('merchants')
    .insert({
      merchant_code: merchantCode,
      name: params.merchantName, // Legacy NOT NULL
      merchant_type: 'supplier', // Legacy NOT NULL fallback
      business_name_en: params.merchantName,
      city: params.governorate, // Legacy mapping
      area: params.area,
      is_active: true
    })
    .select('id')
    .single();

  if (error) {
    log.warn(`[INTEL] Failed to auto-create merchant for "${params.merchantName}":`, error.message);
    return null;
  }

  return data.id;
}

/**
 * Returns a display-friendly name for a merchant using fallbacks.
 */
export function getMerchantDisplayName(merchant: {
  business_name_en?: string | null;
  business_name_ar?: string | null;
  name?: string | null;
  merchant_code?: string | null;
}) {
  return (
    merchant.business_name_en || 
    merchant.business_name_ar || 
    merchant.name || 
    merchant.merchant_code || 
    'Unknown Merchant'
  );
}
