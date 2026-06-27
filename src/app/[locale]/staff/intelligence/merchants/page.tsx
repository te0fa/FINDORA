import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { getMerchantIntelligenceList } from '@/lib/dal/intelligence-dashboard';

export default async function MerchantIntelligenceListPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; type?: string; city?: string; active?: string }>;
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

  const merchants = await getMerchantIntelligenceList({
    search: sParams.search,
    type: sParams.type,
    city: sParams.city,
    isActive: sParams.active === 'true' ? true : sParams.active === 'false' ? false : undefined
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

        .m-name { font-weight: 800; color: #f7d46b; display: block; margin-bottom: 4px; }
        .m-meta { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
        .m-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .score-pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 0.85rem;
          background: rgba(255,255,255,0.08);
        }

        .score-high { color: #22c55e; }
        .score-mid { color: #f59e0b; }
        .score-low { color: #ef4444; }

        .actions-cell { text-align: right; }
        [dir="rtl"] .actions-cell { text-align: left; }

        .view-btn {
          padding: 8px 16px;
          background: rgba(212,166,60,0.1);
          border: 1px solid rgba(212,166,60,0.2);
          border-radius: 10px;
          color: #f7d46b;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 800;
          transition: all 0.2s ease;
        }

        .view-btn:hover { background: rgba(212,166,60,0.2); border-color: #f7d46b; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'دليل الموردين الذكي' : 'Merchant Intelligence Directory'}</h1>
          <p className="m-meta" style={{ marginTop: '5px' }}>{merchants.length} {isRTL ? 'مورد مسجل' : 'Merchants Found'}</p>
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
        <select name="type" defaultValue={sParams.type} className="filter-select">
          <option value="">{isRTL ? 'كل الأنواع' : 'All Types'}</option>
          <option value="supplier">Supplier</option>
          <option value="manufacturer">Manufacturer</option>
          <option value="retailer">Retailer</option>
        </select>
        <select name="active" defaultValue={sParams.active} className="filter-select">
          <option value="">{isRTL ? 'كل الحالات' : 'All Status'}</option>
          <option value="true">{isRTL ? 'نشط' : 'Active'}</option>
          <option value="false">{isRTL ? 'غير نشط' : 'Inactive'}</option>
        </select>
        <button type="submit" className="view-btn">{isRTL ? 'تصفية' : 'Filter'}</button>
      </form>

      <div className="intel-table-wrap">
        <table className="intel-table">
          <thead>
            <tr>
              <th>{isRTL ? 'المورد' : 'Merchant'}</th>
              <th>{isRTL ? 'الموقع' : 'Location'}</th>
              <th>{isRTL ? 'التواصل' : 'Contact'}</th>
              <th>{isRTL ? 'النشاط' : 'Activity'}</th>
              <th>{isRTL ? 'التقييم' : 'Score'}</th>
              <th className="actions-cell">{isRTL ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map(m => (
              <tr key={m.id}>
                <td>
                  <span className="m-name">{m.displayName}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="m-badge">{m.merchant_code}</span>
                    {m.merchant_type && <span className="m-badge" style={{ opacity: 0.7 }}>{m.merchant_type}</span>}
                  </div>
                </td>
                <td>
                  <div>{m.city || '-'}</div>
                  <div className="m-meta">{m.area || '-'}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>{m.primary_phone || m.phone_number_primary || '-'}</div>
                  <div className="m-meta">{m.email || '-'}</div>
                </td>
                <td>
                   <div style={{ fontWeight: 700 }}>{m.quotesCount} {isRTL ? 'عروض أسعار' : 'Quotes'}</div>
                   <div className="m-meta">{m.performanceEventsCount} {isRTL ? 'أحداث أداء' : 'Events'}</div>
                </td>
                <td>
                   <span className={`score-pill ${
                     (m.overall_score || 0) >= 80 ? 'score-high' : (m.overall_score || 0) >= 50 ? 'score-mid' : 'score-low'
                   }`}>
                     {m.overall_score || '-'}
                   </span>
                </td>
                <td className="actions-cell">
                  <Link href={`/${locale}/staff/intelligence/merchants/${m.id}`} className="view-btn">
                    {isRTL ? 'عرض التفاصيل' : 'View Detail'}
                  </Link>
                </td>
              </tr>
            ))}
            {merchants.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  {isRTL ? 'لا يوجد موردين يطابقون البحث.' : 'No merchants found matching your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
