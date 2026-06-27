import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import NorthStarClient from './NorthStarClient';

export const metadata = {
  title: 'North Star Metric | مؤشر الشمال والتحويل — Findora Staff'
};

export default async function NorthStarPage({
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

  // Query actual ERP dynamic counts in parallel
  const [
    reqTotalRes,
    reqWithQuotesRes,
    reqAcceptedRes,
    dealsRes,
    configRes,
    goalsRes,
    stepsRes
  ] = await Promise.all([
    client.from('requests').select('id', { count: 'exact', head: true }),
    client.from('merchant_quotes').select('request_id'), // To calculate distinct requests with quotes
    client.from('requests').select('id', { count: 'exact', head: true }).in('current_status', ['accepted', 'ready', 'quotes_ready']),
    client.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'confirmed'),
    client.from('north_star_config').select('*'),
    client.from('north_star_goals').select('*').order('month_number', { ascending: true }),
    client.from('staff_action_steps').select('*').order('step_number', { ascending: true }).catch(() => ({ data: [] }))
  ]);

  // Extract counts
  const actualRequests = reqTotalRes.count || 0;
  
  // Calculate distinct requests with quotes
  const quotesData = reqWithQuotesRes.data || [];
  const distinctRequestsWithQuotes = new Set(quotesData.map((q: any) => q.request_id)).size;

  const actualAccepted = reqAcceptedRes.count || 0;
  const actualDeals = dealsRes.count || 0;

  // Extract configs (overrides)
  const configs = configRes.data || [];
  const overrides = {
    requests: Number(configs.find((c: any) => c.config_key === 'override_requests')?.value || 0),
    offers: Number(configs.find((c: any) => c.config_key === 'override_offers')?.value || 0),
    accepted: Number(configs.find((c: any) => c.config_key === 'override_accepted')?.value || 0),
    completed: Number(configs.find((c: any) => c.config_key === 'override_completed')?.value || 0)
  };

  const goals = goalsRes.data || [];
  const steps = stepsRes?.data || [];

  return (
    <NorthStarClient
      locale={locale}
      actualMetrics={{
        requests: actualRequests,
        offers: distinctRequestsWithQuotes,
        accepted: actualAccepted,
        completed: actualDeals
      }}
      overrides={overrides}
      goals={goals}
      actionSteps={steps}
    />
  );
}
