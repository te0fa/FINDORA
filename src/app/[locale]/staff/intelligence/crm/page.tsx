import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import CRMClient from './CRMClient';

export const metadata = {
  title: 'Executive Platform CRM | لوحة تحكم ومراقبة النظام — Findora Staff'
};

export default async function CRMPage({
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
  if (!permissions.isAdmin && !permissions.canAccessDashboard) redirect(`/${locale}/staff/dashboard`);

  const client = await createAdminClient() as any;

  // Query database statistics in parallel
  const [
    staffRes,
    custInterviewsRes,
    merchStudiesRes,
    experimentsRes,
    requestsRes,
    merchantsRes,
    paymentsRes,
    customersRes
  ] = await Promise.all([
    client.from('staff_members').select('id, full_name, staff_role, is_active'),
    client.from('customer_discovery_interviews').select('id, interviewer_id, will_pay, potential_commission_egp'),
    client.from('merchant_discovery_studies').select('id, researcher_id, accepts_commission, accepts_bidding, specialization'),
    client.from('company_experiments').select('id, status, created_by_staff_id'),
    client.from('requests').select('id, created_at, category_id, budget_egp'),
    client.from('merchants').select('id, created_at'),
    client.from('payments').select('id, amount_egp, payment_status, created_at').eq('payment_status', 'confirmed'),
    client.from('customers').select('id, created_at')
  ]);

  const staffList = staffRes?.data || [];
  const custInterviews = custInterviewsRes?.data || [];
  const merchStudies = merchStudiesRes?.data || [];
  const experiments = experimentsRes?.data || [];
  const requests = requestsRes?.data || [];
  const merchants = merchantsRes?.data || [];
  const payments = paymentsRes?.data || [];
  const customers = customersRes?.data || [];

  // Group metrics by staff member to compute performance
  const staffPerformance = staffList.map((st: any) => {
    const interviewsCount = custInterviews.filter((ci: any) => ci.interviewer_id === st.id).length;
    const studiesCount = merchStudies.filter((ms: any) => ms.researcher_id === st.id).length;
    const experimentsCount = experiments.filter((ex: any) => ex.created_by_staff_id === st.id).length;
    
    return {
      id: st.id,
      name: st.full_name,
      role: st.staff_role,
      isActive: st.is_active,
      interviewsCount,
      studiesCount,
      experimentsCount,
      totalContributions: interviewsCount + studiesCount + experimentsCount
    };
  }).sort((a: any, b: any) => b.totalContributions - a.totalContributions);

  // General metrics summary
  const summaryMetrics = {
    totalCustomers: customers.length,
    totalMerchants: merchants.length,
    totalRequests: requests.length,
    totalDeals: payments.length,
    totalRevenue: payments.reduce((acc: number, p: any) => acc + (Number(p.amount_egp) || 0), 0),
    custInterviewsCount: custInterviews.length,
    merchStudiesCount: merchStudies.length,
    experimentsCount: experiments.length
  };

  return (
    <CRMClient
      locale={locale}
      summaryMetrics={summaryMetrics}
      staffPerformance={staffPerformance}
      rawRequests={requests}
      rawPayments={payments}
      rawStudies={merchStudies}
    />
  );
}
