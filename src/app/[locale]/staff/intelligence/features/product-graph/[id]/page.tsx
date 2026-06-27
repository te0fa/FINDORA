import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import ProductDetailsClient from './ProductDetailsClient';

export const metadata = {
  title: 'Product Details & Analytics | تفاصيل المنتج — Findora Staff'
};

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin) redirect(`/${locale}/staff/dashboard`);

  const client = await createAdminClient() as any;

  // 1. Fetch Product
  const { data: product, error: prodError } = await client
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (prodError || !product) redirect(`/${locale}/staff/intelligence/features/product-graph`);

  // 2. Fetch Price History
  const { data: priceHistory } = await client
    .from('price_history')
    .select('*')
    .eq('product_id', id)
    .order('captured_at', { ascending: false });

  // 3. Fetch Price Events
  const { data: priceEvents } = await client
    .from('price_events')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false });

  // 4. Fetch Watchlist Status
  const { data: watchlistEntry } = await client
    .from('user_watchlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', id)
    .maybeSingle();

  // 5. Fetch Active Alerts for this user/product
  const { data: priceAlerts } = await client
    .from('price_alerts')
    .select('*')
    .eq('product_id', id)
    .eq('user_id', user.id);

  // 6. Fetch Alert Events for this product's alerts
  const alertIds = (priceAlerts || []).map((a: any) => a.id);
  let alertEvents: any[] = [];
  if (alertIds.length > 0) {
    const { data: events } = await client
      .from('alert_events')
      .select('*, price_alerts(alert_type)')
      .in('alert_id', alertIds)
      .order('created_at', { ascending: false });
    alertEvents = events || [];
  }

  // Calculate price metrics
  const prices: number[] = (priceHistory || []).map((h: any) => Number(h.price));
  const lowest = prices.length ? Math.min(...prices) : Number(product.current_price);
  const highest = prices.length ? Math.max(...prices) : Number(product.current_price);
  const average = prices.length ? Math.round(prices.reduce((acc, val) => acc + val, 0) / prices.length) : Number(product.current_price);

  // Calculate trends (7/30/90 days)
  const getTrendForDays = (days: number) => {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const pastPoints = (priceHistory || []).filter((h: any) => new Date(h.captured_at) <= thresholdDate);
    if (pastPoints.length > 0) {
      const pastPrice = Number(pastPoints[0].price);
      const currentPrice = Number(product.current_price);
      const diff = currentPrice - pastPrice;
      const pct = pastPrice > 0 ? (diff / pastPrice) * 100 : 0;
      return { diff, pct };
    }
    return { diff: 0, pct: 0 };
  };

  const trend7 = getTrendForDays(7);
  const trend30 = getTrendForDays(30);
  const trend90 = getTrendForDays(90);

  // Detect direction label
  let trendDirection = 'Stable price';
  const pct30 = trend30.pct;
  if (pct30 > 10) trendDirection = 'Fast increase';
  else if (pct30 > 2) trendDirection = 'Slow increase';
  else if (pct30 < -10) trendDirection = 'Fast decline';
  else if (pct30 < -2) trendDirection = 'Slow decline';

  const trendScore = Math.max(0, Math.min(100, Math.round(50 + (pct30 * 2.5))));

  // Fetch candidate alternatives in same category
  const { data: candidates } = await client
    .from('products')
    .select('*')
    .eq('category', product.category)
    .neq('id', id);

  const targetPrice = Number(product.current_price);
  const targetSpecs = product.specifications || {};

  const scoredAlternatives = (candidates || []).map((candidate: any) => {
    const candidatePrice = Number(candidate.current_price);
    const candidateSpecs = candidate.specifications || {};

    const categoryScore = 40;

    const priceDiff = Math.abs(targetPrice - candidatePrice);
    const priceSimilarityRatio = targetPrice > 0 ? 1 - Math.min(1, priceDiff / targetPrice) : 0;
    const priceScore = priceSimilarityRatio * 30;

    const specKeys = ['ram', 'storage', 'cpu', 'gpu', 'battery', 'camera', 'display'];
    let matchCount = 0;
    let comparedCount = 0;

    specKeys.forEach(key => {
      const targetVal = String(targetSpecs[key] || '').trim().toLowerCase();
      const candVal = String(candidateSpecs[key] || '').trim().toLowerCase();
      if (targetVal || candVal) {
        comparedCount++;
        if (targetVal === candVal && targetVal !== '') {
          matchCount++;
        }
      }
    });

    const specSimilarityRatio = comparedCount > 0 ? matchCount / comparedCount : 0.5;
    const specScore = specSimilarityRatio * 20;

    const brandMatch = product.brand.toLowerCase() === candidate.brand.toLowerCase();
    const popularityScore = brandMatch ? 10 : 5;

    const totalScore = Math.round(categoryScore + priceScore + specScore + popularityScore);

    const pros = [];
    const cons = [];
    const savingsAmt = targetPrice - candidatePrice;
    const savingsPct = targetPrice > 0 ? Math.round((savingsAmt / targetPrice) * 100) : 0;

    if (savingsAmt > 0) {
      pros.push(`${savingsPct}% cheaper (saves EGP ${savingsAmt.toLocaleString()})`);
    } else if (savingsAmt < 0) {
      cons.push(`${Math.abs(savingsPct)}% more expensive`);
    }

    specKeys.forEach(key => {
      const targetVal = String(targetSpecs[key] || '').trim();
      const candVal = String(candidateSpecs[key] || '').trim();
      if (targetVal !== candVal && targetVal && candVal) {
        pros.push(`Alternative has ${key}: ${candVal}`);
      }
    });

    return {
      id: candidate.id,
      title: candidate.title,
      brand: candidate.brand,
      category: candidate.category,
      current_price: candidatePrice,
      score: totalScore,
      savings_amount: savingsAmt,
      savings_percentage: savingsPct,
      reasons: {
        pros: pros.slice(0, 3),
        cons: cons.slice(0, 3),
        explanation: savingsAmt > 0
          ? `Recommended alternative is ${savingsPct}% more affordable with a price similarity of ${Math.round(priceSimilarityRatio * 100)}%.`
          : `Premium alternative with ${Math.round(specSimilarityRatio * 100)}% specifications similarity.`
      }
    };
  });

  const topAlternatives = scoredAlternatives
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  return (
    <ProductDetailsClient
      locale={locale}
      product={product}
      priceHistory={priceHistory || []}
      priceEvents={priceEvents || []}
      isWatched={!!watchlistEntry}
      priceAlerts={priceAlerts || []}
      alertEvents={alertEvents}
      analytics={{
        lowest_historical_price: lowest,
        highest_historical_price: highest,
        average_price: average,
        trend_7_days: trend7,
        trend_30_days: trend30,
        trend_90_days: trend90,
        detected_trend: trendDirection,
        trend_score: trendScore
      }}
      alternatives={topAlternatives}
      currentUserId={user.id}
    />
  );
}
