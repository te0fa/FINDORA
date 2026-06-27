import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { getAllSpecializations, getBeachheadMetrics, BeachheadMetrics } from '@/lib/dal/specializations';
import BeachheadManagerClient from './BeachheadManagerClient';

export const metadata = {
  title: 'Beachhead Markets | سوق Beachhead — Findora Staff'
};

export default async function BeachheadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staff = await getStaffMemberByAuthUserId(user.id);
  const perms = staff ? getStaffUiPermissions(staff) : null;

  // Accessible by admins and vendor managers
  if (!perms?.isAdmin && !perms?.canManageVendors) {
    redirect(`/${locale}/staff/dashboard`);
  }

  // 1. Get all specializations
  const allSpecs = await getAllSpecializations();
  
  // We only track root categories for Beachhead Markets (where parent_id is null)
  const rootCategories = allSpecs.filter(s => s.parent_id === null);

  // 2. Fetch live metrics for all root categories
  const metricsMap: Record<string, BeachheadMetrics> = {};
  
  await Promise.all(
    rootCategories.map(async (cat) => {
      const metrics = await getBeachheadMetrics(
        cat.id,
        cat.target_merchants ?? 10,
        cat.target_deals ?? 5
      );
      metricsMap[cat.id] = metrics;
    })
  );

  return (
    <BeachheadManagerClient
      locale={locale}
      isAdmin={perms?.isAdmin ?? false}
      initialCategories={rootCategories}
      metricsMap={metricsMap}
    />
  );
}
