import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import SourcingConfigClient from './SourcingConfigClient';

export const metadata = {
  title: 'Multi-Source Sourcing Config | إعدادات محركات البحث — Findora Staff'
};

export default async function SourcingConfigPage({
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

  // Fetch all sourcing configs
  const { data: sources, error } = await client
    .from('sourcing_sources')
    .select('*')
    .order('name', { ascending: true });

  return (
    <SourcingConfigClient
      locale={locale}
      initialSources={sources || []}
    />
  );
}
