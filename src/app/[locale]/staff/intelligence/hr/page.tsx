import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions, getStaffManagementList } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import HRDashboardClient from './HRDashboardClient';

export const metadata = {
  title: 'Platform HR Control Center | مركز التحكم وإدارة الموظفين — Findora Staff'
};

export default async function HRPage({
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

  // Query departments, staff management list, hr details, and performance reviews in parallel
  const [
    departmentsRes,
    hrDetailsRes,
    reviewsRes,
    allStaffList
  ] = await Promise.all([
    client.from('staff_departments').select('*'),
    client.from('staff_hr_details').select('*'),
    client.from('staff_performance_reviews').select('*, reviewer:staff_members!reviewer_id(full_name)').order('created_at', { ascending: false }),
    getStaffManagementList()
  ]);

  const departments = departmentsRes?.data || [];
  const hrDetails = hrDetailsRes?.data || [];
  const reviews = reviewsRes?.data || [];

  return (
    <HRDashboardClient
      locale={locale}
      initialStaff={allStaffList as any}
      departments={departments}
      hrDetails={hrDetails}
      reviews={reviews}
    />
  );
}
