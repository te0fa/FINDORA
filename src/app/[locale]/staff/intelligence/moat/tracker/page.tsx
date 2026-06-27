import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import TrackerClient from './TrackerClient';

export const metadata = {
  title: 'Data Moat Tracker | متتبع خندق البيانات — Findora Staff'
};

export default async function DataMoatTrackerPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin) redirect(`/${locale}/staff/dashboard`);

  const client = await createAdminClient() as any;

  // 1. Fetch latest data moat recorded metrics
  const { data: recordedMetrics } = await client
    .from('data_moat_weekly_metrics')
    .select('*')
    .order('recorded_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Fetch actual live system metrics dynamically (with catch blocks to handle empty tables/missing columns safely)
  const [
    pricesCount,
    productsCount,
    merchantsCount,
    reviewsCount,
    dealsCount,
    negotiationsCount,
    ideasRes
  ] = await Promise.all([
    // Collected prices: count submissions
    client.from('contributor_submissions').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    // Unique products
    client.from('marketplace_products').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    // Verified merchants
    client.from('merchants').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    // Real reviews
    client.from('contributor_reviews').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    // Completed deals
    client.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'confirmed').catch(() => ({ count: 0 })),
    // Negotiation logs (action steps or messages)
    client.from('request_messages').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    // Fetch related vision future ideas
    client.from('vision_future_ideas').select('*').order('created_at', { ascending: true }).catch(() => ({ data: [] }))
  ]);

  const actualMetrics = {
    collected_prices: pricesCount?.count || 0,
    unique_products: productsCount?.count || 0,
    verified_merchants: merchantsCount?.count || 0,
    real_reviews: reviewsCount?.count || 0,
    completed_deals: dealsCount?.count || 0,
    negotiation_data: negotiationsCount?.count || 0
  };

  const futureIdeas = ideasRes?.data || [];

  return (
    <TrackerClient
      locale={locale}
      initialRecordedMetrics={recordedMetrics || {
        recorded_date: new Date().toISOString().split('T')[0],
        collected_prices: 0,
        unique_products: 0,
        verified_merchants: 0,
        real_reviews: 0,
        completed_deals: 0,
        negotiation_data: 0
      }}
      actualMetrics={actualMetrics}
      futureIdeas={futureIdeas}
    />
  );
}
