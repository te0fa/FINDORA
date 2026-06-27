import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import GrowthClient from './GrowthClient';

export const metadata = {
  title: 'Growth & CRM Ads | قنوات النمو وإعلانات الـ CRM — Findora Staff'
};

export default async function GrowthPage({
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

  // Query growth channels, crm performances, content plans, and some platform stats
  const [
    channelsRes,
    performancesRes,
    plansRes,
    reqCountRes,
    dealsCountRes
  ] = await Promise.all([
    client.from('growth_channels').select('*').order('created_at', { ascending: true }),
    client.from('crm_ads_performances').select('*').order('updated_at', { ascending: false }),
    client.from('growth_content_plan').select('*').order('day_number', { ascending: true }),
    client.from('requests').select('id', { count: 'exact', head: true }),
    client.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'confirmed')
  ]);

  const channels = channelsRes.data || [];
  const performances = performancesRes.data || [];
  const plans = plansRes.data || [];
  const totalRequests = reqCountRes.count || 0;
  const totalDeals = dealsCountRes.count || 0;

  return (
    <GrowthClient
      locale={locale}
      initialChannels={channels}
      initialPerformances={performances}
      initialPlans={plans}
      systemStats={{
        totalRequests,
        totalDeals
      }}
    />
  );
}
