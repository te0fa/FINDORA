import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { getCustomerIntelligenceList } from '@/lib/dal/intelligence-dashboard';

export default async function CustomerIntelligenceListPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; language?: string }>;
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
  if (!permissions.isAdmin) redirect(`/${locale}/staff/dashboard`);

  const customers = await getCustomerIntelligenceList({
    search: sParams.search,
    language: sParams.language
  });

  return (
    <div className="intel-list-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .intel-list-page { width: 100%; }
        .page-header { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 2rem; font-weight: 900; margin: 0; }
        
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
          flex: 1;
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

        .c-name { font-weight: 800; color: #3b82f6; display: block; margin-bottom: 4px; }
        .c-meta { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
        .c-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .view-btn {
          padding: 8px 16px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          color: #60a5fa;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 800;
          transition: all 0.2s ease;
        }

        .view-btn:hover { background: rgba(59, 130, 246, 0.2); border-color: #60a5fa; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'دليل العملاء الذكي' : 'Customer Intelligence Directory'}</h1>
          <p className="c-meta" style={{ marginTop: '5px' }}>{customers.length} {isRTL ? 'عميل مسجل' : 'Customers Found'}</p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="view-btn" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          {isRTL ? '← العودة للملخص' : '← Back to Overview'}
        </Link>
      </header>

      <form className="filter-bar">
        <input 
          type="text" 
          name="search" 
          defaultValue={sParams.search} 
          placeholder={isRTL ? 'بحث بالاسم، الكود، أو الهاتف...' : 'Search by name, code, or phone...'} 
          className="search-input" 
        />
        <select name="language" defaultValue={sParams.language} className="filter-select">
          <option value="">{isRTL ? 'كل اللغات' : 'All Languages'}</option>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
        <button type="submit" className="view-btn">{isRTL ? 'تصفية' : 'Filter'}</button>
      </form>

      <div className="intel-table-wrap">
        <table className="intel-table">
          <thead>
            <tr>
              <th>{isRTL ? 'العميل' : 'Customer'}</th>
              <th>{isRTL ? 'التواصل' : 'Contact'}</th>
              <th>{isRTL ? 'اللغة' : 'Lang'}</th>
              <th>{isRTL ? 'الطلبات' : 'Requests'}</th>
              <th>{isRTL ? 'الرسائل' : 'Messages'}</th>
              <th>{isRTL ? 'آخر طلب' : 'Last Activity'}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td>
                  <Link href={`/${locale}/staff/intelligence/customers/${c.id}`} className="c-name">
                    {c.full_name}
                  </Link>
                  <span className="c-badge">{c.customer_code}</span>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>{c.phone_number_normalized || '-'}</div>
                  <div className="c-meta">{c.email || '-'}</div>
                </td>
                <td>
                   <span className="c-badge" style={{ textTransform: 'uppercase' }}>{c.preferred_language || 'en'}</span>
                </td>
                <td>
                   <div style={{ fontWeight: 700 }}>{c.requestsCount} {isRTL ? 'إجمالي' : 'Total'}</div>
                   <div className="c-meta" style={{ color: '#10b981' }}>{c.completedRequestsCount} {isRTL ? 'مكتمل' : 'Completed'}</div>
                </td>
                <td>
                   <div style={{ fontWeight: 700 }}>{c.outboundMessagesCount} {isRTL ? 'رسالة' : 'Messages'}</div>
                </td>
                <td>
                   <div style={{ fontSize: '0.85rem' }}>{c.lastRequestDate ? new Date(c.lastRequestDate).toLocaleDateString(locale) : '-'}</div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  {isRTL ? 'لا يوجد عملاء يطابقون البحث.' : 'No customers found matching your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
