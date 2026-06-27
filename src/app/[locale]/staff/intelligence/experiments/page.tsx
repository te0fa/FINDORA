import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import ExperimentsClient from './ExperimentsClient';

export const metadata = {
  title: 'Company Experiments & Decisions | تجارب وقرارات الشركة — Findora Staff'
};

export default async function ExperimentsPage({
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

  // Fetch experiments
  const client = await createAdminClient() as any;
  const { data: experimentsRes } = await client
    .from('company_experiments')
    .select('*')
    .order('created_at', { ascending: false })
    .catch(() => ({ data: [] }));

  const experiments = experimentsRes || [];

  return (
    <ExperimentsClient
      locale={locale}
      initialExperiments={experiments}
    />
  );
}
