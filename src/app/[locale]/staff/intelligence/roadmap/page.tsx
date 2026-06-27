import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import RoadmapClient from './RoadmapClient';

export const metadata = {
  title: 'Project Roadmap & Phases | مراحل المشروع — Findora Staff'
};

export default async function RoadmapPage({
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

  // Fetch actual platform metrics dynamically
  const client = await createAdminClient() as any;
  const [merchantsCount, customersCount, paymentsCount, requestsCount, phasesRes] = await Promise.all([
    client.from('merchants').select('id', { count: 'exact', head: true }),
    client.from('customers').select('id', { count: 'exact', head: true }),
    client.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'confirmed'),
    client.from('requests').select('id', { count: 'exact', head: true }),
    client.from('project_phases').select('*').order('phase_number', { ascending: true }).catch(() => ({ data: [] }))
  ]);

  const actualMerchants = merchantsCount.count || 0;
  const actualCustomers = customersCount.count || 0;
  const actualDeals = paymentsCount.count || 0;
  const actualRequests = requestsCount.count || 0;

  const phases = phasesRes?.data || [];

  return (
    <RoadmapClient
      locale={locale}
      initialPhases={phases}
      actualMetrics={{
        merchants: actualMerchants,
        customers: actualCustomers,
        deals: actualDeals,
        requests: actualRequests
      }}
    />
  );
}
