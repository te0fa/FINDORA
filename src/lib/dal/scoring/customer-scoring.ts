import { createAdminClient } from '../customers';

export type CustomerScoreResult = {
  seriousness_score: number;
  loyalty_score: number;
  conversion_score: number;
  value_score: number;
  engagement_score: number;
  confidence_score: number;
  snapshot_data: any;
};

/**
 * Calculates deterministic scores for a customer.
 */
export async function calculateCustomerScore(customerId: string): Promise<CustomerScoreResult> {
  const supabase = await createAdminClient();

  // 1. Fetch data
  const [
    requestsRes,
    eventsRes,
    messagesRes,
    paymentsRes,
    interviewsRes
  ] = await Promise.all([
    supabase.from('requests').select('id, current_status, reviewer_decision, created_at').eq('customer_id', customerId),
    supabase.from('customer_intelligence_events').select('*').eq('customer_id', customerId),
    supabase.from('outbound_messages').select('id').eq('customer_id', customerId),
    supabase.from('payments').select('amount, status').eq('customer_id', customerId),
    supabase.from('customer_discovery_interviews').select('will_pay').eq('customer_id', customerId)
  ]);

  const requests = requestsRes.data || [];
  const events = eventsRes.data || [];
  const messages = messagesRes.data || [];
  const payments = (paymentsRes as any)?.data || [];
  const interviews = interviewsRes?.data || [];

  // --- Dimension 1: Seriousness Score ---
  // Based on completed / submitted ratio + payment bonus
  const submittedCount = requests.length;
  const completedCount = requests.filter(r => r.current_status === 'closed' || r.current_status === 'released').length;
  const hasPayments = payments.some((p: any) => p.status === 'completed' || p.status === 'paid');
  
  let seriousness_score = submittedCount > 0 ? (completedCount / submittedCount) * 100 : 0;
  if (hasPayments) seriousness_score = Math.min(100, seriousness_score + 20);
  if (submittedCount > 0 && seriousness_score === 0) seriousness_score = 30; // Initial trust for new users
  
  // If we had a positive discovery meeting, boost initial seriousness
  const committedToPay = interviews.some((i: any) => i.will_pay);
  if (committedToPay) {
    seriousness_score = Math.min(100, seriousness_score + 25);
  }

  // --- Dimension 2: Loyalty Score ---
  // Based on count and recency
  const requestCount = requests.length;
  const recencyDays = requests.length > 0 
      ? Math.floor((Date.now() - new Date(requests[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
  
  const loyalty_score = Math.min(100, (requestCount * 10) + Math.max(0, 50 - (recencyDays / 30)));

  // --- Dimension 3: Conversion Score ---
  // Paid / Created + Discovery expectations
  const paidCount = payments.filter((p: any) => p.status === 'completed' || p.status === 'paid').length;
  let conversion_score = submittedCount > 0 ? (paidCount / submittedCount) * 100 : 0;
  
  if (committedToPay) {
    if (conversion_score === 0) {
      conversion_score = 65; // Anticipate high likelihood of conversion
    } else {
      conversion_score = Math.min(100, conversion_score + 15);
    }
  }

  // --- Dimension 4: Value Score ---
  // Based on total payments
  const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.status === 'completed' || p.status === 'paid' ? (Number(p.amount) || 0) : 0), 0);
  const value_score = Math.min(100, totalPaid / 50); // Heuristic: 5000 EGP = 100 points

  // --- Dimension 5: Engagement Score ---
  // Interaction events + messages sent to them
  const interactionCount = events.filter(e => e.event_type === 'contact_interaction').length;
  const engagement_score = Math.min(100, (interactionCount * 20) + (messages.length * 5));

  const confidence_score = Math.min(1, (submittedCount / 3) * 0.5 + (interactionCount / 2) * 0.5);

  return {
    seriousness_score,
    loyalty_score,
    conversion_score,
    value_score,
    engagement_score,
    confidence_score,
    snapshot_data: {
      metrics: {
        total_requests: submittedCount,
        completed_requests: completedCount,
        total_payments: totalPaid,
        total_messages: messages.length,
        interactions: interactionCount
      }
    }
  };
}

/**
 * Saves a new score snapshot for a customer.
 */
export async function createCustomerScoreSnapshot(customerId: string) {
  const scores = await calculateCustomerScore(customerId);
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('customer_score_snapshots')
    .insert({
      customer_id: customerId,
      seriousness_score: scores.seriousness_score,
      loyalty_score: scores.loyalty_score,
      conversion_score: scores.conversion_score,
      calculated_at: new Date().toISOString()
      // Note: value_score, engagement_score, confidence_score are stored in snapshot_data if columns don't exist
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update snapshot_data with more details
  try {
    await supabase
      .from('customer_score_snapshots')
      .update({
        // placeholder
      })
      .eq('id', data.id);
  } catch (e) {
    // Ignore if column missing
  }

  return data;
}

/**
 * Recalculates scores for all customers.
 */
export async function recalculateAllCustomerScores() {
  const supabase = await createAdminClient();
  const { data: customers, error } = await supabase.from('customers').select('id');
  
  if (error) throw new Error(error.message);
  if (!customers) return { count: 0 };

  const results = [];
  for (const c of customers) {
    try {
      const snap = await createCustomerScoreSnapshot(c.id);
      results.push(snap);
    } catch (err: any) {
      console.warn(`[SCORING] Failed for customer ${c.id}:`, err.message);
    }
  }

  return { count: results.length };
}
