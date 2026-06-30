import { createAdminClient } from '../customers';

export type MerchantScoreResult = {
  overall_score: number;
  activity_score: number;
  shortlist_score: number;
  price_competitiveness_score: number;
  quality_score: number;
  reliability_score: number;
  service_score: number;
  confidence_score: number;
  strengths: string[];
  weaknesses: string[];
  snapshot_data: any;
};

/**
 * Calculates deterministic scores for a merchant.
 */
export async function calculateMerchantScore(merchantId: string): Promise<MerchantScoreResult> {
  const supabase = await createAdminClient();

  // 1. Fetch all raw data for this merchant
  const [
    merchantRes,
    eventsRes,
    feedbackRes,
    quotesRes,
    shortlistRes,
    studiesRes
  ] = await Promise.all([
    supabase.from('merchants').select('*').eq('id', merchantId).single(),
    supabase.from('merchant_performance_events').select('*').eq('merchant_id', merchantId),
    supabase.from('merchant_customer_feedback').select('*').eq('merchant_id', merchantId),
    supabase.from('merchant_quotes').select('*').eq('merchant_id', merchantId),
    (supabase as any).from('request_candidate_shortlists').select('*').eq('merchant_id', merchantId),
    supabase.from('merchant_discovery_studies').select('accepts_commission, accepts_bidding').eq('merchant_id', merchantId)
  ]);

  const merchant = (merchantRes.data as any) || {};
  const events = eventsRes.data || [];
  const feedback = feedbackRes.data || [];
  const quotes = quotesRes.data || [];
  const shortlist = shortlistRes.data || [];
  const studies = studiesRes?.data || [];

  // --- Dimension 1: Activity Score (15%) ---
  // Scale: 0 to 100. 10 quotes = 100 points.
  const quoteCount = quotes.length;
  let activity_score = Math.min(100, quoteCount * 10);
  
  // Boost activity and engagement score if studied
  if (studies.length > 0) {
    activity_score = Math.min(100, activity_score + 20);
  }

  // --- Dimension 2: Shortlist Score ---
  // (Included in activity/reliability context but tracked as strength)
  const shortlistCount = shortlist.length;
  const shortlist_score = Math.min(100, shortlistCount * 20);

  // --- Dimension 3: Price Competitiveness (20%) ---
  // Heuristic: compare against other quotes for same requests
  let price_competitiveness_score = 50; // Neutral default
  let price_confidence = 0;
  
  if (quotes.length > 0) {
    const requestIds = Array.from(new Set(quotes.map((q: any) => q.request_id)));
    const { data: siblingQuotes } = await supabase
      .from('merchant_quotes')
      .select('request_id, price_amount')
      .in('request_id', requestIds);

    if (siblingQuotes && siblingQuotes.length > 0) {
      let totalRelPrice = 0;
      let comparableCount = 0;

      requestIds.forEach(rid => {
        const myQuotes = quotes.filter((q: any) => q.request_id === rid);
        const others = siblingQuotes.filter((q: any) => q.request_id === rid);
        if (others.length > 1) {
          const avgPrice = others.reduce((sum, q) => sum + (q.price_amount || 0), 0) / others.length;
          const myMinPrice = Math.min(...myQuotes.map((q: any) => q.price_amount || 0));
          if (myMinPrice > 0) {
            // If my price is lower than average, score > 100 (capped at 150), if higher, score < 100
            totalRelPrice += (avgPrice / myMinPrice) * 100;
            comparableCount++;
          }
        }
      });

      if (comparableCount > 0) {
        price_competitiveness_score = Math.min(100, totalRelPrice / comparableCount);
        price_confidence = Math.min(1, comparableCount / 5);
      }
    }
  }

  // --- Dimension 4: Quality Score (25%) ---
  let quality_score = Number(merchant.quality_score) || 0;
  if (feedback.length > 0) {
    const avgRating = feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length;
    quality_score = (avgRating / 5) * 100;
  }

  // --- Dimension 5: Reliability Score (30%) ---
  let reliability_score = Number(merchant.reliability_score) || 0;
  const conversions = events.filter((e: any) => e.event_type === 'paid_conversion').length;
  const issues = events.filter((e: any) => e.event_type === 'issue_reported').length;
  
  if (conversions + issues > 0) {
    reliability_score = (conversions / (conversions + issues)) * 100;
  } else if (conversions > 0) {
    reliability_score = 100;
  } else if (issues > 0) {
    reliability_score = 0;
  }

  // --- Dimension 6: Service Score (10%) ---
  // Heuristic: selection rate and response speed + Discovery profile
  const selectedCount = events.filter((e: any) => e.event_type === 'selected_by_customer').length;
  const selectionRate = quoteCount > 0 ? (selectedCount / quoteCount) * 100 : 0;
  let service_score = Math.min(100, selectionRate + (quality_score * 0.5));
  
  const acceptsCommission = studies.some((s: any) => s.accepts_commission);
  const acceptsBidding = studies.some((s: any) => s.accepts_bidding);
  if (acceptsCommission) service_score = Math.min(100, service_score + 15);
  if (acceptsBidding) service_score = Math.min(100, service_score + 10);

  // --- Overall Score & Confidence ---
  const overall_score = Math.round(
    (reliability_score * 0.30) +
    (quality_score * 0.25) +
    (price_competitiveness_score * 0.20) +
    (activity_score * 0.15) +
    (service_score * 0.10)
  );

  const confidence_score = Math.min(1, (quoteCount / 5) * 0.5 + (feedback.length / 3) * 0.5);

  // --- Strengths & Weaknesses ---
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (reliability_score >= 80) strengths.push('High Reliability');
  if (quality_score >= 80) strengths.push('Excellent Quality');
  if (price_competitiveness_score >= 80) strengths.push('Competitive Pricing');
  if (activity_score >= 70) strengths.push('Highly Active');
  if (shortlistCount >= 3) strengths.push('Frequent Shortlist Selection');

  if (reliability_score < 40) weaknesses.push('Reliability Concerns');
  if (quality_score < 40) weaknesses.push('Poor Quality Feedback');
  if (price_competitiveness_score < 40) weaknesses.push('High Price Point');
  if (activity_score < 20) weaknesses.push('Low Activity');

  return {
    overall_score,
    activity_score,
    shortlist_score,
    price_competitiveness_score,
    quality_score,
    reliability_score,
    service_score,
    confidence_score,
    strengths,
    weaknesses,
    snapshot_data: {
      metrics: {
        quotes: quoteCount,
        shortlisted: shortlistCount,
        conversions,
        issues,
        avg_rating: feedback.length > 0 ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1) : null,
        comparable_quotes: price_confidence > 0 ? 'available' : 'insufficient'
      },
      formula: "reliability(30%) + quality(25%) + price(20%) + activity(15%) + service(10%)"
    }
  };
}

/**
 * Saves a new score snapshot for a merchant.
 */
export async function createMerchantScoreSnapshot(merchantId: string) {
  const scores = await calculateMerchantScore(merchantId);
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('merchant_score_snapshots')
    .insert({
      merchant_id: merchantId,
      score: scores.overall_score,
      strengths: scores.strengths,
      weaknesses: scores.weaknesses,
      snapshot_data: {
        ...scores.snapshot_data,
        dimensions: {
          reliability: scores.reliability_score,
          quality: scores.quality_score,
          price: scores.price_competitiveness_score,
          activity: scores.activity_score,
          service: scores.service_score,
          confidence: scores.confidence_score
        }
      }
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update current merchant row if columns exist
  try {
    await supabase
      .from('merchants')
      .update({
        overall_score: scores.overall_score,
        reliability_score: scores.reliability_score,
        quality_score: scores.quality_score,
      })
      .eq('id', merchantId);
  } catch (e: any) {
    console.warn('[SCORING] Could not update merchant columns:', e.message);
  }

  return data;
}

/**
 * Recalculates scores for all merchants.
 */
export async function recalculateAllMerchantScores() {
  const supabase = await createAdminClient();
  const { data: merchants, error } = await supabase.from('merchants').select('id');
  
  if (error) throw new Error(error.message);
  if (!merchants) return { count: 0 };

  const results = [];
  for (const m of merchants) {
    try {
      const snap = await createMerchantScoreSnapshot(m.id);
      results.push(snap);
    } catch (err: any) {
      console.warn(`[SCORING] Failed for merchant ${m.id}:`, err.message);
    }
  }

  return { count: results.length };
}
