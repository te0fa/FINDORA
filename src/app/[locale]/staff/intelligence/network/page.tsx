import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import NetworkClient from './NetworkClient';

export const metadata = {
  title: 'Network Effects Tracker | مؤشرات صحة السوق — Findora Staff'
};

export default async function NetworkPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin) redirect(`/${locale}/staff/dashboard`);

  const client = await createAdminClient() as any;

  // Fetch all data in parallel to calculate metrics dynamically
  const [requestsRes, quotesRes, paymentsRes, indicatorsRes] = await Promise.all([
    client.from('requests').select('id, current_status, created_at, category').catch(() => ({ data: [] })),
    client.from('merchant_quotes').select('id, request_id, merchant_id, price_amount, created_at, is_selected').catch(() => ({ data: [] })),
    client.from('payments').select('id, request_id, amount, payment_status, created_at').catch(() => ({ data: [] })),
    client.from('market_health_indicators').select('*').catch(() => ({ data: [] }))
  ]);

  const requests = requestsRes?.data || [];
  const quotes = quotesRes?.data || [];
  const payments = paymentsRes?.data || [];
  const indicators = indicatorsRes?.data || [];

  // 1. Calculate Global Metrics
  const totalRequestsCount = requests.length;
  const totalQuotesCount = quotes.length;
  
  const globalAvgQuotes = totalRequestsCount > 0 ? (totalQuotesCount / totalRequestsCount) : 0;
  
  // Calculate average response time in hours
  let totalResponseTimeMs = 0;
  let responseCount = 0;
  const reqMap = new Map(requests.map((r: any) => [r.id, r.created_at]));
  quotes.forEach((q: any) => {
    const reqCreatedAt = reqMap.get(q.request_id);
    if (reqCreatedAt) {
      const diff = new Date(q.created_at).getTime() - new Date(reqCreatedAt as any).getTime();
      if (diff > 0) {
        totalResponseTimeMs += diff;
        responseCount++;
      }
    }
  });
  const globalAvgResponseTimeHours = responseCount > 0 ? (totalResponseTimeMs / (1000 * 60 * 60 * responseCount)) : 0;

  // Merchant win rate
  const selectedQuotes = quotes.filter((q: any) => q.is_selected);
  const globalWinRate = totalQuotesCount > 0 ? (selectedQuotes.length / totalQuotesCount) * 100 : 0;

  // Active merchants (submitted quotes in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeMerchantsSet = new Set(
    quotes
      .filter((q: any) => new Date(q.created_at) >= sevenDaysAgo)
      .map((q: any) => q.merchant_id)
  );
  const globalActiveMerchants = activeMerchantsSet.size;

  // Request conversion rate (requests with confirmed payment)
  const paidRequestIds = new Set(
    payments
      .filter((p: any) => p.payment_status === 'confirmed' || p.status === 'completed' || p.status === 'paid')
      .map((p: any) => p.request_id)
  );
  const globalConversionRate = totalRequestsCount > 0 ? (paidRequestIds.size / totalRequestsCount) * 100 : 0;

  // Avg deal value
  const confirmedPayments = payments.filter((p: any) => p.payment_status === 'confirmed' || p.status === 'completed' || p.status === 'paid');
  const totalPaidSum = confirmedPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const globalAvgDealValue = confirmedPayments.length > 0 ? (totalPaidSum / confirmedPayments.length) : 0;

  const globalMetrics = {
    avg_quotes: Number(globalAvgQuotes.toFixed(1)),
    avg_response_time: Number(globalAvgResponseTimeHours.toFixed(1)),
    win_rate: Number(globalWinRate.toFixed(1)),
    active_merchants: globalActiveMerchants,
    conversion_rate: Number(globalConversionRate.toFixed(1)),
    avg_deal_value: Math.round(globalAvgDealValue)
  };

  // 2. Group & Calculate Category-wise metrics
  const uniqueCategories = Array.from(new Set(requests.map((r: any) => r.category || 'other')));
  const categoriesMetrics = uniqueCategories.map(cat => {
    const catRequests = requests.filter((r: any) => (r.category || 'other') === cat);
    const catReqIds = new Set(catRequests.map((r: any) => r.id));
    const catRequestsCount = catRequests.length;

    const catQuotes = quotes.filter((q: any) => catReqIds.has(q.request_id));
    const catQuotesCount = catQuotes.length;

    const catAvgQuotes = catRequestsCount > 0 ? (catQuotesCount / catRequestsCount) : 0;

    // Response time
    let catResponseTimeMs = 0;
    let catResponseCount = 0;
    catQuotes.forEach((q: any) => {
      const reqCreatedAt = reqMap.get(q.request_id);
      if (reqCreatedAt) {
        const diff = new Date(q.created_at).getTime() - new Date(reqCreatedAt as any).getTime();
        if (diff > 0) {
          catResponseTimeMs += diff;
          catResponseCount++;
        }
      }
    });
    const catAvgResponseTimeHours = catResponseCount > 0 ? (catResponseTimeMs / (1000 * 60 * 60 * catResponseCount)) : 0;

    // Win rate
    const catSelectedQuotes = catQuotes.filter((q: any) => q.is_selected);
    const catWinRate = catQuotesCount > 0 ? (catSelectedQuotes.length / catQuotesCount) * 100 : 0;

    // Active merchants
    const catActiveMerchantsSet = new Set(
      catQuotes
        .filter((q: any) => new Date(q.created_at) >= sevenDaysAgo)
        .map((q: any) => q.merchant_id)
    );

    // Conversion rate
    const catPaidRequestsCount = Array.from(paidRequestIds).filter(id => catReqIds.has(id)).length;
    const catConversionRate = catRequestsCount > 0 ? (catPaidRequestsCount / catRequestsCount) * 100 : 0;

    // Deal Value
    const catPayments = payments.filter((p: any) => catReqIds.has(p.request_id) && (p.payment_status === 'confirmed' || p.status === 'completed' || p.status === 'paid'));
    const catPaidSum = catPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const catAvgDealValue = catPayments.length > 0 ? (catPaidSum / catPayments.length) : 0;

    return {
      category: cat,
      avg_quotes: Number(catAvgQuotes.toFixed(1)),
      avg_response_time: Number(catAvgResponseTimeHours.toFixed(1)),
      win_rate: Number(catWinRate.toFixed(1)),
      active_merchants: catActiveMerchantsSet.size,
      conversion_rate: Number(catConversionRate.toFixed(1)),
      avg_deal_value: Math.round(catAvgDealValue)
    };
  });

  return (
    <NetworkClient
      locale={locale}
      globalMetrics={globalMetrics}
      categoriesMetrics={categoriesMetrics as any}
      indicators={indicators}
    />
  );
}
