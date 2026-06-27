import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { getFlywheelStages } from '@/lib/dal/flywheel';
import FlywheelManagerClient from './FlywheelManagerClient';

export const metadata = {
  title: 'Flywheel Growth Engine | عجلة النمو — Findora Staff'
};

export default async function FlywheelPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staff = await getStaffMemberByAuthUserId(user.id);
  const perms = staff ? getStaffUiPermissions(staff) : null;

  if (!perms?.isAdmin && !perms?.canAccessDashboard) {
    redirect(`/${locale}/staff/dashboard`);
  }

  // Fetch flywheel stages with live calculated metric values
  const stages = await getFlywheelStages();

  return (
    <FlywheelManagerClient
      locale={locale}
      isAdmin={perms?.isAdmin ?? false}
      initialStages={stages}
    />
  );
}
