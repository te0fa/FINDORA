import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import MoatClient from './MoatClient';

export const metadata = {
  title: 'Defensive Moats | الخندق الدفاعي للمشروع — Findora Staff'
};

export default async function MoatPage({
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

  // Query platform moats and competitor threats
  const [moatsRes, threatsRes] = await Promise.all([
    client.from('platform_moats').select('*').order('moat_number', { ascending: true }),
    client.from('moat_competitor_threats').select('*, platform_moats(title_en, title_ar)').order('logged_at', { ascending: false }).catch(() => ({ data: [] }))
  ]);

  const moats = moatsRes?.data || [];
  const threats = threatsRes?.data || [];

  return (
    <MoatClient
      locale={locale}
      moats={moats}
      threats={threats}
    />
  );
}
