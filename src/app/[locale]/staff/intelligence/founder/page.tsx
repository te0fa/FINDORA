import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import FounderClient from './FounderClient';

export const metadata = {
  title: 'Founder Accountability Dashboard | لوحة تحكم المؤسس — Findora Staff'
};

export default async function FounderPage({
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

  // Calculate start of current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);
  const startOfMonthStr = startOfMonth.toISOString();

  // Fetch metrics, past logs, accountability items, and active phase in parallel
  const [custDiscoveryRes, merchDiscoveryRes, pastLogsRes, accountabilityRes, activePhaseRes, totalRequestsRes, activeScoutsRes, totalSnapshotsRes] = await Promise.all([
    client.from('customer_discovery_interviews').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonthStr),
    client.from('merchant_discovery_studies').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonthStr),
    client.from('founder_weekly_logs').select('*, staff_members(full_name)').order('week_start_date', { ascending: false }).limit(20).catch(() => ({ data: [] })),
    client.from('founder_accountability_items').select('*').order('created_at', { ascending: true }).catch(() => ({ data: [] })),
    client.from('project_phases').select('phase_number, title_en, title_ar').eq('status', 'active').limit(1).catch(() => ({ data: [] })),
    client.from('requests').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    client.from('contributors').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    client.from('report_option_snapshots').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 }))
  ]);

  const monthlyMetrics = {
    customerInterviews: custDiscoveryRes?.count || 0,
    merchantStudies: merchDiscoveryRes?.count || 0,
    totalRequests: totalRequestsRes?.count || 0,
    activeScouts: activeScoutsRes?.count || 0,
    totalSnapshots: totalSnapshotsRes?.count || 0
  };

  const pastLogs = pastLogsRes?.data || [];
  const accountabilityItems = accountabilityRes?.data || [];
  
  // Find current active phase title or fallback
  const activePhase = activePhaseRes?.data?.[0] || { phase_number: 0, title_en: 'Validation', title_ar: 'التحقق' };

  return (
    <FounderClient
      locale={locale}
      monthlyMetrics={monthlyMetrics}
      pastLogs={pastLogs}
      accountabilityItems={accountabilityItems}
      activePhase={activePhase}
    />
  );

}
