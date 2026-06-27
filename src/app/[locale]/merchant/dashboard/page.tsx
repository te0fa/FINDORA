import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import MerchantDashboardClient from './MerchantDashboardClient';

export const metadata = {
  title: 'Merchant Dashboard | لوحة التاجر — FINDORA',
};

export default async function MerchantDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const db = createAdminClient();

  // TODO: Add real merchant auth session check
  // For now, fetch first active merchant as placeholder
  const { data: merchantRaw } = await (db
    .from('merchant_profiles') as any)
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback: show register if no merchant
  if (!merchantRaw) {
    redirect(`/${locale}/merchant/register`);
  }

  const merchant = merchantRaw as {
    id: string;
    business_name_ar: string;
    business_name_en: string;
    status: string;
    trust_score: number;
    total_deals: number;
    total_earnings_egp: number;
    rating_average: number | null;
    rating_count: number;
  };

  // Fetch stats in parallel
  const [openReqRes, pendingOffersRes, recentOffersRes] = await Promise.all([
    (db.from('customer_requests') as any)
      .select('id', { count: 'exact', head: true })
      .eq('current_status', 'open'),
    (db.from('merchant_offers') as any)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending'),
    (db.from('merchant_offers') as any)
      .select('id, request_id, price_offered_egp, status, created_at')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const stats = {
    openRequests: openReqRes.count || 0,
    pendingOffers: pendingOffersRes.count || 0,
    acceptedOffers: 0,
    totalEarnings: merchant.total_earnings_egp || 0,
  };

  return (
    <MerchantDashboardClient
      locale={locale}
      merchant={merchant}
      stats={stats}
      recentOffers={recentOffersRes.data || []}
    />
  );
}
