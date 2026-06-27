import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import KillListClient from './KillListClient';

export const metadata = {
  title: 'Startup Kill List | قائمة المحظورات والتركيز — Findora Staff'
};

export default async function KillListPage({
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

  // Fetch kill list items
  const { data: killList } = await client
    .from('kill_list_items')
    .select('*')
    .order('created_at', { ascending: true })
    .catch(() => ({ data: [] }));

  const items = killList || [];

  return (
    <KillListClient
      locale={locale}
      initialItems={items}
    />
  );
}
