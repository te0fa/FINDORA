import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import MerchantOffersClient from './MerchantOffersClient';

export const metadata = {
  title: 'Browse Requests | استعراض الطلبات — FINDORA Merchant',
};

export default async function MerchantOffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/auth/login`);

  const [requestsRes, myOffersRes] = await Promise.all([
    (db.from('customer_requests') as any)
      .select('id, product_name_ar, product_name_en, target_price_egp, current_status, created_at, governorate, notes')
      .eq('current_status', 'open')
      .order('created_at', { ascending: false })
      .limit(50),
    merchantId
      ? (db.from('merchant_offers') as any)
          .select('request_id, price_offered_egp, status')
          .eq('merchant_id', merchantId)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <MerchantOffersClient
      locale={locale}
      merchantId={merchantId}
      openRequests={requestsRes.data || []}
      myOffers={myOffersRes.data || []}
    />
  );
}
