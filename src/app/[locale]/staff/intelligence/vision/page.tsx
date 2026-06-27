import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import VisionClient from './VisionClient';

export const metadata = {
  title: 'Project Vision & Future Milestones | رؤية ومستقبل المشروع — Findora Staff'
};

export default async function VisionPage({
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

  // Fetch vision tables
  const [pillarsRes, timelineRes, ideasRes] = await Promise.all([
    client.from('vision_pillars').select('*').order('created_at', { ascending: true }),
    client.from('vision_timeline').select('*').order('milestone_year', { ascending: true }),
    client.from('vision_future_ideas').select('*').order('created_at', { ascending: true })
  ]);

  const pillars = pillarsRes.data || [];
  const timeline = timelineRes.data || [];
  const ideas = ideasRes.data || [];

  return (
    <VisionClient
      locale={locale}
      initialPillars={pillars}
      initialTimeline={timeline}
      initialIdeas={ideas}
    />
  );
}
