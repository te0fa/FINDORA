import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/config';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { getMerchantIntelligenceDetail } from '@/lib/dal/intelligence-dashboard';
import { createAdminClient } from '@/lib/dal/customers';
import MerchantDiscoveryClient from './MerchantDiscoveryClient';

export default async function MerchantDetailPage({ 
  params 
}: { 
  params: Promise<{ locale: string; merchant_id: string }> 
}) {
  const { locale, merchant_id } = await params;
  const dict = await getDictionary(locale as Locale);
  const isRTL = locale === 'ar';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin) redirect(`/${locale}/staff/dashboard`);

  const detail = await getMerchantIntelligenceDetail(merchant_id).catch(() => null);
  if (!detail) notFound();

  const client = await createAdminClient() as any;
  const studiesRes = await client.from('merchant_discovery_studies').select('*').eq('merchant_id', merchant_id).order('created_at', { ascending: false });
  const studies = studiesRes?.data || [];

  const m = detail.merchant;
  const displayName = m.business_name_en || m.business_name_ar || m.name || 'Unknown Merchant';

  return (
    <div className="intel-detail-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .intel-detail-page { width: 100%; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.5); text-decoration: none; margin-bottom: 24px; font-weight: 700; transition: color 0.2s; }
        .back-link:hover { color: #f7d46b; }

        .profile-header {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 32px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .m-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 12px; }
        .m-badges { display: flex; gap: 10px; }
        .m-badge { padding: 4px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.6); }

        .scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-top: 24px; }
        .score-box { background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); }
        .score-val { font-size: 1.5rem; font-weight: 900; color: #f7d46b; }
        .score-lab { font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 4px; }

        .detail-sections { display: grid; grid-template-columns: 1fr 400px; gap: 30px; }
        .card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 24px; margin-bottom: 30px; }
        .card-title { font-size: 1.1rem; font-weight: 900; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }

        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .info-label { color: rgba(255,255,255,0.4); font-size: 0.9rem; font-weight: 700; }
        .info-value { font-weight: 700; }

        .event-item { padding: 12px; border-left: 3px solid #f7d46b; background: rgba(255,255,255,0.02); border-radius: 0 8px 8px 0; margin-bottom: 10px; }
        [dir="rtl"] .event-item { border-left: none; border-right: 3px solid #f7d46b; border-radius: 8px 0 0 8px; }
        .event-type { font-size: 0.85rem; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
        .event-date { font-size: 0.75rem; color: rgba(255,255,255,0.4); }

        .quote-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .quote-link { color: #f7d46b; text-decoration: none; font-weight: 700; font-size: 0.9rem; }
        .quote-price { font-weight: 900; color: #10b981; }
      ` }} />

      <Link href={`/${locale}/staff/intelligence/merchants`} className="back-link">
        {isRTL ? '← العودة للقائمة' : '← Back to List'}
      </Link>

      <header className="profile-header">
        <div>
          <div className="m-badges">
            <span className="m-badge">{m.merchant_code}</span>
            <span className="m-badge">{m.merchant_type || 'Supplier'}</span>
          </div>
          <h1 className="m-title">{displayName}</h1>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
             📍 {m.city || '-'}, {m.area || '-'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div className="score-val" style={{ fontSize: '3rem' }}>{m.overall_score || '-'}</div>
           <div className="score-lab">{isRTL ? 'التقييم العام' : 'Overall Score'}</div>
        </div>
      </header>

      <div className="scores-grid" style={{ marginBottom: '30px' }}>
         <div className="score-box">
            <div className="score-val">{m.reliability_score || '-'}</div>
            <div className="score-lab">{isRTL ? 'الموثوقية' : 'Reliability'}</div>
         </div>
         <div className="score-box">
            <div className="score-val">{m.quality_score || '-'}</div>
            <div className="score-lab">{isRTL ? 'الجودة' : 'Quality'}</div>
         </div>
         <div className="score-box">
            <div className="score-val">{m.price_competitiveness_score || '-'}</div>
            <div className="score-lab">{isRTL ? 'تنافسية السعر' : 'Price Competitiveness'}</div>
         </div>
         <div className="score-box">
            <div className="score-val">{m.service_score || '-'}</div>
            <div className="score-lab">{isRTL ? 'الخدمة' : 'Service'}</div>
         </div>
      </div>

      <div className="detail-sections">
        <div className="main-col">
           <MerchantDiscoveryClient
             merchantId={merchant_id}
             initialStudies={studies}
             locale={locale}
           />

           <section className="card">
              <h2 className="card-title">📜 {isRTL ? 'عروض الأسعار التاريخية' : 'Quote History'}</h2>
              {detail.quotes.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>{isRTL ? 'لا يوجد عروض أسعار مسجلة.' : 'No quotes recorded yet.'}</p>
              ) : (
                <div className="quote-list">
                   {detail.quotes.map(q => (
                     <div key={q.id} className="quote-item">
                        <div>
                           <div style={{ fontWeight: 800 }}>{q.product_title}</div>
                           <div className="m-meta">{new Date(q.created_at).toISOString().split('T')[0] + ' UTC'}</div>
                        </div>
                        <div className="quote-price">{q.price_amount} {q.currency_code}</div>
                     </div>
                   ))}
                </div>
              )}
           </section>

           <section className="card">
              <h2 className="card-title">⭐ {isRTL ? 'ملاحظات العملاء' : 'Customer Feedback'}</h2>
              {detail.feedback.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>{isRTL ? 'لا يوجد ملاحظات من العملاء بعد.' : 'No customer feedback yet.'}</p>
              ) : (
                <div className="feedback-list">
                    {detail.feedback.map(f => (
                      <div key={f.id} className="event-item" style={{ borderLeftColor: '#3b82f6' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="score-pill score-high">{f.rating}/5</span>
                              {f.is_verified_purchase && (
                                <span className="m-badge" style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', fontSize: '0.7rem', padding: '2px 8px', width: 'auto', display: 'inline-block' }}>
                                  🛡️ {isRTL ? 'شراء مؤكد' : 'Verified Purchase'}
                                </span>
                              )}
                            </div>
                            <span className="event-date">{new Date(f.created_at).toISOString().split('T')[0] + ' UTC'}</span>
                         </div>
                         <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{f.comment}</div>
                      </div>
                    ))}
                </div>
              )}
           </section>
        </div>

        <aside className="side-col">
           <section className="card">
              <h2 className="card-title">ℹ️ {isRTL ? 'معلومات التواصل' : 'Contact Info'}</h2>
              <div className="info-row">
                 <span className="info-label">{isRTL ? 'الهاتف' : 'Phone'}</span>
                 <span className="info-value">{m.primary_phone || m.phone_number_primary || '-'}</span>
              </div>
              <div className="info-row">
                 <span className="info-label">WhatsApp</span>
                 <span className="info-value">{m.whatsapp || '-'}</span>
              </div>
              <div className="info-row">
                 <span className="info-label">{isRTL ? 'البريد' : 'Email'}</span>
                 <span className="info-value">{m.email || '-'}</span>
              </div>
              <div className="info-row" style={{ borderBottom: 'none' }}>
                 <span className="info-label">{isRTL ? 'الموقع' : 'Website'}</span>
                 <span className="info-value">{m.website_url ? <a href={m.website_url} target="_blank" className="quote-link">Link</a> : '-'}</span>
              </div>
           </section>

           <section className="card">
              <h2 className="card-title">⚡ {isRTL ? 'أحداث الأداء' : 'Performance Events'}</h2>
              {detail.performanceEvents.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>{isRTL ? 'لا يوجد أحداث مسجلة.' : 'No events recorded.'}</p>
              ) : (
                <div className="event-list">
                   {detail.performanceEvents.map(e => (
                     <div key={e.id} className="event-item">
                        <div className="event-type">{e.event_type.replace('_', ' ')}</div>
                        <div className="event-date">{new Date(e.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'}</div>
                     </div>
                   ))}
                </div>
              )}
           </section>
        </aside>
      </div>
    </div>
  );
}
