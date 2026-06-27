import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { getOutboundMessagesAdmin, getMessageSummaryCountsAdmin } from '@/lib/dal/communication-center';
import CommunicationsClient from './CommunicationsClient';

export default async function CommunicationIntelligencePage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; status?: string; channel?: string; template?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { locale } = await params;
  const sParams = await searchParams;
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

  const { messages, totalCount } = await getOutboundMessagesAdmin({
    search: sParams.search,
    status: sParams.status,
    channel: sParams.channel,
    templateCode: sParams.template,
    dateFrom: sParams.dateFrom,
    dateTo: sParams.dateTo
  });

  const summary = await getMessageSummaryCountsAdmin();

  return (
    <div className="intel-list-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .intel-list-page { width: 100%; }
        .page-header { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 2rem; font-weight: 900; margin: 0; }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 15px;
          text-align: center;
        }

        .summary-val { font-size: 1.5rem; font-weight: 900; display: block; }
        .summary-label { font-size: 0.75rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; }

        .filter-bar {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 30px;
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          align-items: center;
        }

        .search-input {
          flex: 2;
          min-width: 250px;
          height: 44px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0 16px;
          color: white;
          font-size: 0.95rem;
        }

        .filter-select {
          flex: 1;
          height: 44px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0 12px;
          color: white;
          font-size: 0.9rem;
        }

        .intel-table-wrap {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          overflow: hidden;
        }

        .intel-table { width: 100%; border-collapse: collapse; }
        .intel-table th {
          text-align: left;
          padding: 16px 20px;
          background: rgba(255,255,255,0.04);
          font-size: 0.8rem;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        [dir="rtl"] .intel-table th { text-align: right; }

        .intel-table td {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.95rem;
        }

        .intel-table tr:hover td { background: rgba(255,255,255,0.02); }

        .msg-temp { font-weight: 800; color: #8b5cf6; display: block; margin-bottom: 4px; }
        .msg-meta { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
        .msg-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .status-pill {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .status-draft { background: rgba(100,116,139,0.1); color: #64748b; border: 1px solid rgba(100,116,139,0.2); }
        .status-queued { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
        .status-sent { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
        .status-failed { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
        .status-skipped { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.1); }

        .view-btn {
          padding: 8px 16px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 10px;
          color: #a78bfa;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 800;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .view-btn:hover { background: rgba(139, 92, 246, 0.2); border-color: #a78bfa; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'مركز التحكم في الاتصالات' : 'Communications Control Center'}</h1>
          <p className="msg-meta" style={{ marginTop: '5px' }}>{totalCount} {isRTL ? 'رسالة في الإجمالي' : 'Total Messages'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href={`/${locale}/staff/intelligence`} className="view-btn" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            {isRTL ? '← العودة للملخص' : '← Back to Overview'}
          </Link>
        </div>
      </header>

      <div className="summary-grid">
         <div className="summary-card">
            <span className="summary-val" style={{ color: '#64748b' }}>{summary.draft}</span>
            <span className="summary-label">{isRTL ? 'مسودة' : 'Draft'}</span>
         </div>
         <div className="summary-card">
            <span className="summary-val" style={{ color: '#f59e0b' }}>{summary.queued}</span>
            <span className="summary-label">{isRTL ? 'انتظار' : 'Queued'}</span>
         </div>
         <div className="summary-card">
            <span className="summary-val" style={{ color: '#10b981' }}>{summary.sent}</span>
            <span className="summary-label">{isRTL ? 'تم الإرسال' : 'Sent'}</span>
         </div>
         <div className="summary-card">
            <span className="summary-val" style={{ color: '#ef4444' }}>{summary.failed}</span>
            <span className="summary-label">{isRTL ? 'فشل' : 'Failed'}</span>
         </div>
         <div className="summary-card">
            <span className="summary-val" style={{ color: 'rgba(255,255,255,0.4)' }}>{summary.skipped}</span>
            <span className="summary-label">{isRTL ? 'متخطى' : 'Skipped'}</span>
         </div>
      </div>

      <form className="filter-bar">
        <input 
          type="text" 
          name="search" 
          defaultValue={sParams.search} 
          placeholder={isRTL ? 'بحث بالمستلم أو العميل أو الموضوع...' : 'Search by recipient, customer or subject...'} 
          className="search-input" 
        />
        <select name="status" defaultValue={sParams.status || 'ALL'} className="filter-select">
          <option value="ALL">{isRTL ? 'كل الحالات' : 'All Status'}</option>
          <option value="draft">Draft</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
        <select name="channel" defaultValue={sParams.channel || 'ALL'} className="filter-select">
          <option value="ALL">{isRTL ? 'كل القنوات' : 'All Channels'}</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
        </select>
        <input 
          type="text" 
          name="template" 
          defaultValue={sParams.template} 
          placeholder={isRTL ? 'كود القالب' : 'Template Code'} 
          className="filter-select" 
        />
        <button type="submit" className="view-btn">{isRTL ? 'تصفية' : 'Filter'}</button>
        <Link href={`/${locale}/staff/intelligence/communications`} className="view-btn" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
          {isRTL ? 'إعادة تعيين' : 'Reset'}
        </Link>
      </form>

      <CommunicationsClient initialMessages={messages} locale={locale} isRTL={isRTL} />
    </div>
  );
}
