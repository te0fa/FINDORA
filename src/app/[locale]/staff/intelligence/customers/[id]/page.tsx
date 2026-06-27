import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import CustomerDetailsClient from './CustomerDetailsClient';

export const metadata = {
  title: 'Customer Detail | تفاصيل العميل — Findora Staff'
};

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const isRTL = locale === 'ar';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin) redirect(`/${locale}/staff/dashboard`);

  // Fetch customer information
  const client = await createAdminClient() as any;
  const [customerRes, segmentsRes, requestsRes, messagesRes, scoreRes, interviewsRes, trackingRes] = await Promise.all([
    client.from('customers').select('*').eq('id', id).single(),
    client.from('customer_segments').select('segment_code').eq('customer_id', id),
    client.from('requests').select('id, request_code, title, current_status, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    client.from('outbound_messages').select('id, channel, recipient, template_code, status, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    client.from('customer_score_snapshots').select('seriousness_score, loyalty_score, conversion_score').eq('customer_id', id).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('customer_discovery_interviews').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    client.from('platform_events').select('*').eq('customer_id', id).order('occurred_at', { ascending: false })
  ]);

  if (customerRes.error || !customerRes.data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>{isRTL ? 'العميل غير موجود' : 'Customer Not Found'}</h2>
        <Link href={`/${locale}/staff/intelligence/customers`} className="view-btn">
          {isRTL ? 'العودة للقائمة' : 'Back to List'}
        </Link>
      </div>
    );
  }

  const customer = customerRes.data;
  const segments = (segmentsRes.data || []).map((s: any) => s.segment_code);
  const requests = requestsRes.data || [];
  const messages = messagesRes.data || [];
  const scores = scoreRes.data || { seriousness_score: 85, loyalty_score: 75, conversion_score: 60 }; // defaults if no snapshot yet
  const interviews = interviewsRes.data || [];
  const trackingEvents = trackingRes.data || [];

  return (
    <CustomerDetailsClient
      locale={locale}
      customer={customer}
      segments={segments}
      requests={requests}
      messages={messages}
      scores={scores}
      interviews={interviews}
      trackingEvents={trackingEvents}
    />
  );
}
