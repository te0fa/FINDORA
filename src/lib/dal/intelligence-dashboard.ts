import { createClient } from '@/lib/supabase/server';
import { resolveRequestState } from './lifecycle';
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:intelligence-dashboard');


/**
 * BATCH 4C: Admin Intelligence Dashboards DAL
 */

export type MerchantFilter = {
  search?: string;
  type?: string;
  category?: string;
  city?: string;
  area?: string;
  isActive?: boolean;
};

export type CustomerFilter = {
  search?: string;
  language?: string;
};

export type MessageFilter = {
  status?: string;
  channel?: string;
  templateCode?: string;
  search?: string;
};

type AnyRow = Record<string, any>;

type MerchantRow = AnyRow & {
  id: string;
  merchant_id?: string | null;
  merchant_code?: string | null;
  name?: string | null;
  business_name_en?: string | null;
  business_name_ar?: string | null;
  merchant_type?: string | null;
  category?: string | null;
  city?: string | null;
  area?: string | null;
  primary_phone?: string | null;
  phone_number_primary?: string | null;
  email?: string | null;
  overall_score?: number | null;
};

type CustomerRow = AnyRow & {
  id: string;
  customer_id?: string | null;
  full_name?: string | null;
  customer_code?: string | null;
  phone_number_normalized?: string | null;
  email?: string | null;
  preferred_language?: string | null;
  created_at?: string | null;
};

type RequestRow = AnyRow & {
  id: string;
  customer_id?: string | null;
  created_at?: string | null;
};

type MerchantRelatedRow = AnyRow & {
  id: string;
  merchant_id: string | null;
};

type CustomerRelatedRow = AnyRow & {
  id: string;
  customer_id: string | null;
};

async function createAdminClient(): Promise<any> {
  // If in a request context (has cookies), use the standard server client
  // Otherwise (e.g. script), use the service client if available or a fallback
  try {
    const { createClient } = await import('@/lib/supabase/server');
    return await createClient();
  } catch (e) {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
}

/**
 * Main Platform Intelligence Overview
 */
export async function getPlatformIntelligenceOverview() {
  try {
    const { getPlatformKpiSnapshot } = await import('./scoring/platform-scoring');
    const snapshot = await getPlatformKpiSnapshot();
    
    return {
      totalCustomers: snapshot.total_customers,
      totalRequests: snapshot.total_requests,
      totalMerchants: snapshot.total_merchants,
      totalDraftMessages: snapshot.draft_messages,
      activeRequests: snapshot.active_requests,
      completedRequests: snapshot.completed_requests,
      rejectedRequests: snapshot.rejected_requests,
      funnel: snapshot.conversion_rates ? {
        submitted: snapshot.total_requests,
        accepted: Math.round(snapshot.total_requests * (snapshot.conversion_rates.request_to_accepted_rate || 0)),
        ready: Math.round(snapshot.total_requests * (snapshot.conversion_rates.request_to_accepted_rate || 0) * (snapshot.conversion_rates.accepted_to_ready_rate || 0)),
        completed: snapshot.completed_requests
      } : {
        submitted: snapshot.total_requests,
        accepted: 0,
        ready: 0,
        completed: snapshot.completed_requests
      }
    };
  } catch (e) {
    log.warn('[INTEL] Scoring engine not available, falling back to basic overview.');
    const supabase = (await createAdminClient()) as any;
    const [customersCount, requestsRes, merchantsCount, draftMessagesCount] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('requests').select('id, current_status'),
      supabase.from('merchants').select('*', { count: 'exact', head: true }),
      supabase.from('outbound_messages').select('*', { count: 'exact', head: true }).eq('status', 'draft')
    ]);
    return {
      totalCustomers: customersCount.count || 0,
      totalRequests: (requestsRes.data || []).length,
      totalMerchants: merchantsCount.count || 0,
      totalDraftMessages: draftMessagesCount.count || 0,
      activeRequests: (requestsRes.data || []).length,
      completedRequests: 0,
      rejectedRequests: 0,
      funnel: { submitted: (requestsRes.data || []).length, accepted: 0, ready: 0, completed: 0 }
    };
  }
}

/**
 * Merchant Intelligence List
 */
export async function getMerchantIntelligenceList(filter: MerchantFilter = {}) {
  const supabase = (await createAdminClient()) as any;

  let query = supabase.from('merchants').select('*');

  if (filter.search) {
    query = query.or(`name.ilike.%${filter.search}%,merchant_code.ilike.%${filter.search}%,primary_phone.ilike.%${filter.search}%,phone_number_primary.ilike.%${filter.search}%`);
  }
  if (filter.type) {
    query = query.eq('merchant_type', filter.type);
  }
  if (filter.city) {
    query = query.eq('city', filter.city);
  }
  if (filter.area) {
    query = query.eq('area', filter.area);
  }
  if (filter.isActive !== undefined) {
    query = query.eq('is_active', filter.isActive);
  }

  const { data: merchants, error } = await query.order('name', { ascending: true });

  if (error) throw error;

  const merchantsList = ((merchants || []) as MerchantRow[]);

  // Aggregate counts from other tables (non-FK joins)
  const merchantIds = merchantsList.map((m: MerchantRow) => m.id);
  
  const [quotesRes, eventsRes, scoreSnapsRes] = await Promise.all([
    supabase.from('merchant_quotes').select('id, merchant_id').in('merchant_id', merchantIds),
    supabase.from('merchant_performance_events').select('id, merchant_id').in('merchant_id', merchantIds),
    supabase.from('merchant_score_snapshots').select('merchant_id, score, snapshot_data').in('merchant_id', merchantIds).order('calculated_at', { ascending: false })
  ]);

  const quotesMap = new Map<string, number>();
  const quoteRows = ((quotesRes.data || []) as MerchantRelatedRow[]);
  quoteRows.forEach((q: MerchantRelatedRow) => {
    if (!q.merchant_id) return;
    quotesMap.set(q.merchant_id, (quotesMap.get(q.merchant_id) || 0) + 1);
  });

  const eventsMap = new Map<string, number>();
  const eventRows = ((eventsRes.data || []) as MerchantRelatedRow[]);
  eventRows.forEach((e: MerchantRelatedRow) => {
    if (!e.merchant_id) return;
    eventsMap.set(e.merchant_id, (eventsMap.get(e.merchant_id) || 0) + 1);
  });

  const scoreMap = new Map<string, any>();
  (scoreSnapsRes.data || []).forEach((s: any) => {
    if (!scoreMap.has(s.merchant_id)) {
      scoreMap.set(s.merchant_id, {
        score: s.score,
        confidence: s.snapshot_data?.dimensions?.confidence || 0
      });
    }
  });

  return merchantsList.map((m: MerchantRow) => ({
    ...m,
    quotesCount: quotesMap.get(m.id) || 0,
    performanceEventsCount: eventsMap.get(m.id) || 0,
    overall_score: scoreMap.get(m.id)?.score || m.overall_score || null,
    confidence_score: scoreMap.get(m.id)?.confidence || 0,
    displayName: m.business_name_en || m.business_name_ar || m.name || 'Unknown Merchant'
  }));
}

export type MerchantDetail = {
  id: string;
  merchant_code: string;
  name: string;
  business_name_en: string | null;
  business_name_ar: string | null;
  merchant_type: string | null;
  city: string | null;
  area: string | null;
  primary_phone: string | null;
  phone_number_primary: string | null;
  email: string | null;
  whatsapp: string | null;
  website_url: string | null;
  overall_score: number | null;
  reliability_score: number | null;
  quality_score: number | null;
  price_competitiveness_score: number | null;
  service_score: number | null;
};

/**
 * Merchant Intelligence Detail
 */
export async function getMerchantIntelligenceDetail(merchantId: string) {
  const supabase = (await createAdminClient()) as any;

  const [merchantRes, quotesRes, eventsRes, feedbackRes, scoresRes] = await Promise.all([
    supabase.from('merchants').select('*').eq('id', merchantId).single(),
    supabase.from('merchant_quotes').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false }),
    supabase.from('merchant_performance_events').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false }),
    supabase.from('merchant_customer_feedback').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false }),
    supabase.from('merchant_score_snapshots').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  if (merchantRes.error) throw merchantRes.error;

  return {
    merchant: merchantRes.data as MerchantDetail,
    quotes: (quotesRes.data || []) as any[],
    performanceEvents: (eventsRes.data || []) as any[],
    feedback: (feedbackRes.data || []) as any[],
    latestScore: scoresRes.data || null
  };
}

/**
 * Customer Intelligence List
 */
export async function getCustomerIntelligenceList(filter: CustomerFilter = {}) {
  const supabase = (await createAdminClient()) as any;

  let query = supabase.from('customers').select('*');

  if (filter.search) {
    query = query.or(`full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone_number_normalized.ilike.%${filter.search}%,customer_code.ilike.%${filter.search}%`);
  }
  if (filter.language) {
    query = query.eq('preferred_language', filter.language);
  }

  const { data: customers, error } = await query.order('full_name', { ascending: true });

  if (error) throw error;

  const customersList = ((customers || []) as CustomerRow[]);
  const customerIds = customersList.map((c: CustomerRow) => c.id);

  const [requestsRes, messagesRes, scoreSnapsRes] = await Promise.all([
    supabase.from('requests').select('id, customer_id, current_status, reviewer_decision, is_archived, created_at'),
    supabase.from('outbound_messages').select('id, customer_id').in('customer_id', customerIds),
    supabase.from('customer_score_snapshots').select('customer_id, seriousness_score, loyalty_score, conversion_score').in('customer_id', customerIds).order('calculated_at', { ascending: false })
  ]);

  // Handle released status via state resolver
  const uiStatusRes = await supabase.from('v_request_ui_status').select('request_id, client_released_at');
  const releasedMap = new Map((uiStatusRes.data || []).map((r: any) => [r.request_id, r.client_released_at]));

  const reqsMap = new Map<string, any[]>();
  const requestRows = ((requestsRes.data || []) as RequestRow[]);
  requestRows.forEach((r: RequestRow) => {
    if (!r.customer_id) return;
    if (!reqsMap.has(r.customer_id)) reqsMap.set(r.customer_id, []);
    reqsMap.get(r.customer_id)!.push({
      ...r,
      state: resolveRequestState({ ...r, client_released_at: releasedMap.get(r.id) as any })
    });
  });

  const msgsMap = new Map<string, number>();
  const messageRows = ((messagesRes.data || []) as CustomerRelatedRow[]);
  messageRows.forEach((m: CustomerRelatedRow) => {
    if (!m.customer_id) return;
    msgsMap.set(m.customer_id, (msgsMap.get(m.customer_id) || 0) + 1);
  });

  const scoreMap = new Map<string, any>();
  (scoreSnapsRes.data || []).forEach((s: any) => {
    if (!scoreMap.has(s.customer_id)) {
      scoreMap.set(s.customer_id, s);
    }
  });

  return customersList.map((c: CustomerRow) => {
    const cReqs = reqsMap.get(c.id) || [];
    const sortedReqs = [...cReqs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestScores = scoreMap.get(c.id);

    return {
      ...c,
      requestsCount: cReqs.length,
      completedRequestsCount: cReqs.filter(r => r.state === 'COMPLETED').length,
      outboundMessagesCount: msgsMap.get(c.id) || 0,
      lastRequestDate: sortedReqs[0]?.created_at || null,
      seriousness_score: latestScores?.seriousness_score || null,
      loyalty_score: latestScores?.loyalty_score || null,
      conversion_score: latestScores?.conversion_score || null
    };
  });
}

/**
 * Outbound Messages List
 */
export async function getOutboundMessagesList(filter: MessageFilter = {}) {
  const supabase = (await createAdminClient()) as any;

  let query = supabase.from('outbound_messages').select('*, customers(full_name), requests(request_code)');

  if (filter.status) {
    query = query.eq('status', filter.status);
  }
  if (filter.channel) {
    query = query.eq('channel', filter.channel);
  }
  if (filter.templateCode) {
    query = query.eq('template_code', filter.templateCode);
  }
  if (filter.search) {
    query = query.or(`recipient.ilike.%${filter.search}%,rendered_subject.ilike.%${filter.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data;
}

/**
 * Trust Funnel Intelligence Metrics
 */
export async function getTrustFunnelMetricsAdmin() {
  const supabase = (await createAdminClient()) as any;

  // Fetch all necessary data
  const [requestsRes, reportsRes, snapshotsRes, intentsRes, paymentsRes, revealsRes] = await Promise.all([
    supabase.from('requests').select('id, request_kind, pricing_model, payment_policy, current_status, reviewer_decision'),
    supabase.from('reports').select('id, request_id'),
    supabase.from('report_option_snapshots').select('id, request_id, reveal_locked'),
    supabase.from('payment_intents').select('id, request_id, status, amount, currency_code'),
    supabase.from('payments').select('id, request_id, payment_status, amount, currency_code'),
    supabase.from('source_reveals').select('id, request_id, reveal_type, created_at')
  ]);

  const requests = requestsRes.data || [];
  const reports = reportsRes.data || [];
  const snapshots = snapshotsRes.data || [];
  const paymentIntents = intentsRes.data || [];
  const payments = paymentsRes.data || [];
  const sourceReveals = revealsRes.data || [];

  const safeNum = (val: any) => {
    const num = Number(val);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  const calcRate = (numerator: number, denominator: number) => {
    if (denominator === 0) return 0;
    const rate = (numerator / denominator) * 100;
    return Math.max(0, Math.min(100, safeNum(rate)));
  };

  // 1. Trust Funnel Counts
  const totalSubmitted = requests.length;
  const pricedRequests = requests.filter((r: any) => r.payment_policy || r.pricing_model || r.reviewer_decision).length;
  const reportsPrepared = new Set(reports.map((r: any) => r.request_id)).size;
  const reportOptionPreviews = snapshots.length;
  const paymentIntentsCreated = new Set(paymentIntents.map((pi: any) => pi.request_id)).size;
  const confirmedPaymentsCount = new Set(payments.filter((p: any) => p.payment_status === 'confirmed').map((p: any) => p.request_id)).size;
  const sourceRevealsUnlocked = new Set(sourceReveals.map((sr: any) => sr.request_id)).size;
  const completedRequests = requests.filter((r: any) => r.current_status === 'completed' || r.current_status === 'closed').length;

  // 2. Revenue Metrics
  const confirmedPayments = payments.filter((p: any) => p.payment_status === 'confirmed');
  const confirmedRevenueTotal = confirmedPayments.reduce((sum: number, p: any) => sum + safeNum(p.amount), 0);
  const pendingIntents = paymentIntents.filter((pi: any) => pi.status !== 'confirmed' && pi.status !== 'cancelled' && pi.status !== 'rejected');
  const pendingPaymentAmount = pendingIntents.reduce((sum: number, pi: any) => sum + safeNum(pi.amount), 0);
  const averageConfirmedPaymentAmount = confirmedPayments.length > 0 ? safeNum(confirmedRevenueTotal / confirmedPayments.length) : 0;

  // Revenue by request_kind, pricing_model, payment_policy
  const revenueByRequestKind: Record<string, number> = {};
  const revenueByPricingModel: Record<string, number> = {};
  const revenueByPaymentPolicy: Record<string, number> = {};

  // Build maps for fast lookup
  const requestKindMap = new Map<string, string>(requests.map((r: any) => [r.id, r.request_kind]));
  const pricingModelMap = new Map<string, string>(requests.map((r: any) => [r.id, r.pricing_model]));
  const paymentPolicyMap = new Map<string, string>(requests.map((r: any) => [r.id, r.payment_policy]));

  confirmedPayments.forEach((p: any) => {
    const amount = safeNum(p.amount);
    const kind = requestKindMap.get(p.request_id) || 'unknown';
    const model = pricingModelMap.get(p.request_id) || 'unknown';
    const policy = paymentPolicyMap.get(p.request_id) || 'unknown';

    revenueByRequestKind[kind] = (revenueByRequestKind[kind] || 0) + amount;
    revenueByPricingModel[model] = (revenueByPricingModel[model] || 0) + amount;
    revenueByPaymentPolicy[policy] = (revenueByPaymentPolicy[policy] || 0) + amount;
  });

  // 4. Breakdown by request_kind
  const requestKinds = ['everyday_purchase', 'high_value_deals', 'projects_supplies'];
  const breakdownByRequestKind = requestKinds.map(kind => {
    const kindRequests = requests.filter((r: any) => r.request_kind === kind);
    const kindReqIds = new Set(kindRequests.map((r: any) => r.id));
    
    const submitted = kindRequests.length;
    const priced = kindRequests.filter((r: any) => r.payment_policy || r.pricing_model || r.reviewer_decision).length;
    const kindReports = reports.filter((r: any) => kindReqIds.has(r.request_id)).length;
    const previews = snapshots.filter((s: any) => kindReqIds.has(s.request_id)).length;
    const intents = paymentIntents.filter((pi: any) => kindReqIds.has(pi.request_id)).length;
    const confirmed = confirmedPayments.filter((p: any) => kindReqIds.has(p.request_id)).length;
    const unlocks = sourceReveals.filter((sr: any) => kindReqIds.has(sr.request_id)).length;

    const revenue = revenueByRequestKind[kind] || 0;

    return {
      request_kind: kind,
      submitted,
      priced,
      reports: kindReports,
      previews,
      payment_intents: intents,
      confirmed_payments: confirmed,
      source_unlocks: unlocks,
      revenue,
      conversion_rate: calcRate(confirmed, submitted)
    };
  });

  // 5. Breakdown by payment_policy
  const paymentPolicies = ['pay_after_preview', 'upfront_deposit', 'milestone_plan', 'custom_agreement', 'retainer'];
  const breakdownByPaymentPolicy = paymentPolicies.map(policy => {
    const policyRequests = requests.filter((r: any) => r.payment_policy === policy);
    const policyReqIds = new Set(policyRequests.map((r: any) => r.id));

    const submitted = policyRequests.length;
    const intents = paymentIntents.filter((pi: any) => policyReqIds.has(pi.request_id)).length;
    const confirmed = confirmedPayments.filter((p: any) => policyReqIds.has(p.request_id)).length;
    const revenue = revenueByPaymentPolicy[policy] || 0;

    return {
      payment_policy: policy,
      requests: submitted,
      payment_intents: intents,
      confirmed_payments: confirmed,
      revenue,
      conversion_rate: calcRate(confirmed, submitted)
    };
  });

  // 6. Source Reveal Metrics
  const totalUnlocks = sourceReveals.length;
  const unlocksByRevealType: Record<string, number> = {};
  sourceReveals.forEach((sr: any) => {
    const type = sr.reveal_type || 'unknown';
    unlocksByRevealType[type] = (unlocksByRevealType[type] || 0) + 1;
  });

  const latestUnlocksList = [...sourceReveals]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5)
    .map((sr: any) => ({
      id: sr.id,
      request_id: sr.request_id,
      reveal_type: sr.reveal_type,
      created_at: sr.created_at
    }));

  return {
    counts: {
      submitted_requests: totalSubmitted,
      priced_requests: pricedRequests,
      reports_prepared: reportsPrepared,
      report_option_previews_created: reportOptionPreviews,
      payment_intents_created: paymentIntentsCreated,
      confirmed_payments: confirmedPaymentsCount,
      source_reveals_unlocked: sourceRevealsUnlocked,
      completed_requests: completedRequests
    },
    conversion_rates: {
      submitted_to_priced_rate: calcRate(pricedRequests, totalSubmitted),
      priced_to_report_rate: calcRate(reportsPrepared, pricedRequests),
      report_to_payment_intent_rate: calcRate(paymentIntentsCreated, reportsPrepared),
      payment_intent_to_confirmed_payment_rate: calcRate(confirmedPaymentsCount, paymentIntentsCreated),
      preview_to_unlock_rate: calcRate(sourceRevealsUnlocked, reportOptionPreviews > 0 ? reportOptionPreviews : reportsPrepared),
      submitted_to_paid_rate: calcRate(confirmedPaymentsCount, totalSubmitted)
    },
    revenue: {
      confirmed_revenue_total: confirmedRevenueTotal,
      pending_payment_amount: pendingPaymentAmount,
      average_confirmed_payment_amount: averageConfirmedPaymentAmount,
      confirmed_revenue_by_request_kind: revenueByRequestKind,
      confirmed_revenue_by_pricing_model: revenueByPricingModel,
      confirmed_revenue_by_payment_policy: revenueByPaymentPolicy
    },
    breakdown_by_request_kind: breakdownByRequestKind,
    breakdown_by_payment_policy: breakdownByPaymentPolicy,
    source_reveals: {
      total_unlocks: totalUnlocks,
      unlocks_by_reveal_type: unlocksByRevealType,
      latest_unlocks_list: latestUnlocksList
    }
  };
}
