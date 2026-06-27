import { createAdminClient } from '../customers';
import { resolveRequestState } from '../lifecycle';

export async function getPlatformKpiSnapshot() {
  const supabase = await createAdminClient();

  // 1. Fetch counts
  const [
    customersRes,
    merchantsRes,
    requestsRes,
    quotesRes,
    shortlistRes,
    messagesRes,
    paymentsRes
  ] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('merchants').select('id', { count: 'exact', head: true }),
    supabase.from('requests').select('id, current_status, reviewer_decision, is_archived, accepted_at, created_at, request_kind'),
    supabase.from('merchant_quotes').select('id', { count: 'exact', head: true }),
    supabase.from('request_candidate_shortlists').select('id', { count: 'exact', head: true }),
    supabase.from('outbound_messages').select('status'),
    supabase.from('payments').select('amount, status')
  ]);

  const requests = requestsRes.data || [];
  const messages = messagesRes.data || [];
  const payments = (paymentsRes as any)?.data || [];

  // 2. Process Requests for Funnel
  // Note: we need released state for canonical resolution
  const { data: uiStatus } = await supabase.from('v_request_ui_status').select('request_id, client_released_at');
  const releasedMap = new Map((uiStatus || []).map((u: any) => [u.request_id, u.client_released_at]));

  const resolved = requests.map(r => ({
    ...r,
    canonical_state: resolveRequestState({ ...r, client_released_at: releasedMap.get(r.id) })
  }));

  const completed = resolved.filter(r => r.canonical_state === 'COMPLETED').length;
  const ready = resolved.filter(r => r.canonical_state === 'READY').length;
  const operations = resolved.filter(r => r.canonical_state === 'OPERATIONS').length;
  const intake = resolved.filter(r => r.canonical_state === 'INTAKE').length;
  const issues = resolved.filter(r => r.canonical_state === 'ISSUES').length;
  const archived = resolved.filter(r => r.canonical_state === 'ARCHIVED').length;

  const totalRequests = requests.length;
  const accepted = resolved.filter(r => r.accepted_at !== null || (r.reviewer_decision === 'approve')).length;

  // 3. Conversion Rates
  const request_to_accepted_rate = totalRequests > 0 ? (accepted / totalRequests) : null;
  const accepted_to_ready_rate = accepted > 0 ? ((ready + completed) / accepted) : null;
  const ready_to_completed_rate = (ready + completed) > 0 ? (completed / (ready + completed)) : null;

  // 4. Revenue
  const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.status === 'completed' || p.status === 'paid' ? (Number(p.amount) || 0) : 0), 0);
  const paidCount = payments.filter((p: any) => p.status === 'completed' || p.status === 'paid').length;
  const request_to_paid_rate = totalRequests > 0 ? (paidCount / totalRequests) : null;

  // 5. Top Request Kinds (Heuristic)
  const kindsMap: Record<string, number> = {};
  requests.forEach(r => {
    const k = r.request_kind || 'general';
    kindsMap[k] = (kindsMap[k] || 0) + 1;
  });
  const topRequestKinds = Object.entries(kindsMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => ({ kind: e[0], count: e[1] }));

  // 6. Top Merchants/Customers (By Score)
  const [topMerchantsRes, topCustomersRes] = await Promise.all([
    supabase.from('merchants').select('id, name, business_name_en, overall_score').order('overall_score', { ascending: false }).limit(5),
    supabase.from('customer_score_snapshots').select('customer_id, seriousness_score').order('calculated_at', { ascending: false }).limit(20)
  ]);

  return {
    total_customers: customersRes.count || 0,
    total_requests: totalRequests,
    active_requests: intake + operations + ready + issues,
    completed_requests: completed,
    rejected_requests: resolved.filter(r => r.reviewer_decision === 'reject').length,
    archived_requests: archived,
    total_merchants: merchantsRes.count || 0,
    total_quotes: quotesRes.count || 0,
    total_shortlisted_items: shortlistRes.count || 0,
    draft_messages: messages.filter((m: any) => m.status === 'draft').length,
    sent_messages: messages.filter((m: any) => m.status === 'sent').length,
    estimated_revenue: totalRevenue || null,
    conversion_rates: {
      request_to_accepted_rate,
      accepted_to_ready_rate,
      ready_to_completed_rate,
      request_to_paid_rate
    },
    top_request_kinds: topRequestKinds,
    top_merchants: topMerchantsRes.data || [],
    top_customers: topCustomersRes.data || [] // Simplified
  };
}
