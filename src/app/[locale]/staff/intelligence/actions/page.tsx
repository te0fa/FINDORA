import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import ActionsClient from './ActionsClient';

export const metadata = {
  title: 'Project Actions & Steps | خطوات التنفيذ — Findora Staff'
};

export default async function ActionsPage({
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
  if (!permissions.isAdmin && !permissions.canAccessDashboard) redirect(`/${locale}/staff/dashboard`);

  // Fetch actual platform metrics dynamically
  const client = await createAdminClient() as any;
  const [
    merchantsCount,
    discoveryCount,
    requestsCount,
    dealsCount,
    merchantDiscoveryCount,
    stepsRes
  ] = await Promise.all([
    client.from('merchants').select('id', { count: 'exact', head: true }),
    client.from('customer_discovery_interviews').select('id', { count: 'exact', head: true }),
    client.from('requests').select('id', { count: 'exact', head: true }),
    client.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'confirmed'),
    client.from('merchant_discovery_studies').select('id', { count: 'exact', head: true }),
    client.from('staff_action_steps').select('*').order('step_number', { ascending: true }).catch(() => ({ data: [] }))
  ]);

  const actualMetrics = {
    merchants: merchantsCount?.count || 0,
    discovery: discoveryCount?.count || 0,
    requests: requestsCount?.count || 0,
    deals: dealsCount?.count || 0,
    merchant_discovery: merchantDiscoveryCount?.count || 0
  };

  const steps = stepsRes?.data || [];

  return (
    <ActionsClient
      locale={locale}
      initialSteps={steps}
      actualMetrics={actualMetrics}
    />
  );
}
