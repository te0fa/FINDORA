import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { listPaymentIntentsAdmin, getRequestsNeedingPaymentAdmin, listConfirmedPaymentsLedgerAdmin } from '@/lib/dal/payments';
import PaymentsClient from './PaymentsClient';

export default async function PaymentsControlPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);
  const isRTL = locale === 'ar';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin && !permissions.canManageArchive && !permissions.canReport) {
    redirect(`/${locale}/staff/dashboard`);
  }

  // Fetch all 3 data sets in parallel
  const [
    { items: intents },
    { items: needsPayment },
    { items: ledger }
  ] = await Promise.all([
    listPaymentIntentsAdmin({ limit: 100 }),
    getRequestsNeedingPaymentAdmin({ limit: 100 }),
    listConfirmedPaymentsLedgerAdmin({ limit: 100 })
  ]);

  return (
    <div className="payments-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .payments-page { width: 100%; }
        .page-header { margin-bottom: 40px; }
        .page-title { font-size: 2.5rem; font-weight: 900; margin: 0 0 10px; letter-spacing: -0.02em; }
        .page-subtitle { color: rgba(255,255,255,0.5); font-size: 1.1rem; }
      ` }} />

      <header className="page-header">
        <h1 className="page-title">{isRTL ? 'مركز التحكم في المدفوعات' : 'Payments Control Center'}</h1>
        <p className="page-subtitle">{isRTL ? 'إدارة نوايا الدفع، تأكيد التحويلات اليدوية، وتتبع الإيرادات.' : 'Manage payment intents, confirm manual transfers, and track revenue.'}</p>
      </header>

      <PaymentsClient 
        initialIntents={intents} 
        initialNeedsPayment={needsPayment}
        initialLedger={ledger}
        locale={locale} 
      />
    </div>
  );
}
