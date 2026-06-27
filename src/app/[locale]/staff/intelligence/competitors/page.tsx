import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import CompetitorsClient from './CompetitorsClient';

export const metadata = {
  title: 'Competitor Comparison | مقارنة المنافسين والتحليل — Findora Staff'
};

export default async function CompetitorsPage({
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

  // Fetch competitors, comparisons, and project phases
  const [competitorsRes, comparisonsRes, phasesRes] = await Promise.all([
    client.from('competitors').select('*').order('created_at', { ascending: true }),
    client.from('competitor_feature_comparisons').select('*').order('created_at', { ascending: true }),
    client.from('project_phases').select('phase_number, status')
  ]);

  const competitors = competitorsRes.data || [];
  const comparisons = comparisonsRes.data || [];
  const phases = phasesRes.data || [];

  // Create a set of active/completed phase numbers
  const activePhases = new Set<number>(
    phases
      .filter((p: any) => p.status === 'active' || p.status === 'completed')
      .map((p: any) => Number(p.phase_number))
  );

  return (
    <CompetitorsClient
      locale={locale}
      initialCompetitors={competitors}
      initialComparisons={comparisons}
      activePhases={Array.from(activePhases)}
    />
  );
}
