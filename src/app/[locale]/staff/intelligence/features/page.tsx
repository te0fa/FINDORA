import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import FeaturesClient from './FeaturesClient';

export const metadata = {
  title: 'Feature Lifecycle | دورة حياة الميزات — Findora Staff'
};

export default async function FeaturesPage({
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

  // Fetch actual project features
  const client = await createAdminClient() as any;
  const featuresRes = await client
    .from('project_features')
    .select('*')
    .order('phase_number', { ascending: true })
    .catch(() => ({ data: [] }));

  const features = featuresRes?.data || [];

  const flagsRes = await client
    .from('economy_config')
    .select('config_key, value, description_en, description_ar')
    .like('config_key', 'flag_%')
    .order('config_key', { ascending: true })
    .catch(() => ({ data: [] }));

  const flags = (flagsRes?.data || []).map((f: any) => ({
    ...f,
    value: f.value === 'true' || f.value === true
  }));

  return (
    <FeaturesClient
      locale={locale}
      initialFeatures={features}
      initialFlags={flags}
    />
  );
}

