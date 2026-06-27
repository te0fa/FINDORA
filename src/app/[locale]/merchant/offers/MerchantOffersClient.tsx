'use client';
import React, { useState } from 'react';
import Link from 'next/link';

interface Request {
  id: string;
  product_name_ar?: string;
  product_name_en?: string;
  target_price_egp?: number;
  current_status: string;
  created_at: string;
  governorate?: string;
  notes?: string;
}

interface MerchantOffersClientProps {
  locale: string;
  merchantId: string;
  openRequests: Request[];
  myOffers: Array<{ request_id: string; price_offered_egp: number; status: string }>;
}

export default function MerchantOffersClient({
  locale, merchantId, openRequests, myOffers,
}: MerchantOffersClientProps) {
  const isAr = locale === 'ar';
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [offerForms, setOfferForms] = useState<Record<string, { price: string; notes: string; days: string }>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const myOfferMap = new Map(myOffers.map(o => [o.request_id, o]));

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmitOffer = async (requestId: string) => {
    const form = offerForms[requestId];
    if (!form?.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      return showToast(isAr ? 'أدخل سعرًا صحيحًا' : 'Enter a valid price', 'error');
    }
    setSubmitting(requestId);
    try {
      const res = await fetch('/api/merchants/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          requestId,
          priceOfferedEgp: Number(form.price),
          notes: form.notes || null,
          estimatedDays: form.days ? Number(form.days) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Error', 'error');
      showToast(isAr ? 'تم تقديم عرضك بنجاح! ✅' : 'Offer submitted successfully! ✅');
      setOfferForms(p => ({ ...p, [requestId]: { price: '', notes: '', days: '' } }));
      window.location.reload();
    } catch {
      showToast(isAr ? 'حدث خطأ، حاول مرة أخرى' : 'Error, please try again', 'error');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220,25%,8%)', color: 'white', fontFamily: "'Outfit','Cairo',sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '14px 20px', borderRadius: 12, background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, color: 'white', fontWeight: 600, backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>FINDORA MERCHANT</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{isAr ? '📬 الطلبات المتاحة' : '📬 Available Requests'}</h1>
        </div>
        <Link href={`/${locale}/merchant/dashboard`} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
          {isAr ? '← لوحة التحكم' : '← Dashboard'}
        </Link>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: isAr ? 'طلبات مفتوحة' : 'Open Requests', val: openRequests.length, color: '#6366f1' },
            { label: isAr ? 'عروضي المقدمة' : 'My Offers', val: myOffers.length, color: '#f59e0b' },
            { label: isAr ? 'تم قبولها' : 'Accepted', val: myOffers.filter(o => o.status === 'accepted').length, color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}25`, borderRadius: 12, padding: '16px 18px', borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Request Cards */}
        {openRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: '1.1rem' }}>{isAr ? 'لا توجد طلبات مفتوحة حاليًا' : 'No open requests right now'}</div>
            <div style={{ fontSize: '0.85rem', marginTop: 8 }}>{isAr ? 'ارجع لاحقًا — تُضاف طلبات جديدة يوميًا' : 'Check back later — new requests added daily'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {openRequests.map(req => {
              const myOffer = myOfferMap.get(req.id);
              const form = offerForms[req.id] || { price: '', notes: '', days: '' };
              const setForm = (f: Partial<typeof form>) => setOfferForms(p => ({ ...p, [req.id]: { ...form, ...f } }));

              return (
                <div key={req.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
                  {/* Request Info */}
                  <div style={{ padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800 }}>
                          {isAr ? req.product_name_ar : req.product_name_en}
                        </h3>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {req.governorate && (
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>📍 {req.governorate}</span>
                          )}
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                            {new Date(req.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>
                      </div>
                      {req.target_price_egp && (
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{isAr ? 'السعر المستهدف' : 'Target Price'}</div>
                          <div style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>{req.target_price_egp.toLocaleString()} EGP</div>
                        </div>
                      )}
                    </div>
                    {req.notes && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
                        💬 {req.notes}
                      </div>
                    )}
                  </div>

                  {/* Offer Section */}
                  <div style={{ padding: '18px 22px' }}>
                    {myOffer ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: myOffer.status === 'accepted' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${myOffer.status === 'accepted' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          {myOffer.status === 'accepted' ? '✅' : '⏳'} {isAr ? 'عرضي المقدم:' : 'My Offer:'} <strong>{myOffer.price_offered_egp.toLocaleString()} EGP</strong>
                        </span>
                        <span style={{ fontSize: '0.78rem', color: myOffer.status === 'accepted' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                          {myOffer.status === 'accepted' ? (isAr ? 'مقبول 🎉' : 'Accepted 🎉') : (isAr ? 'في الانتظار' : 'Pending')}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 5, fontWeight: 600 }}>{isAr ? 'السعر (EGP) *' : 'Price (EGP) *'}</label>
                            <input
                              type="number"
                              value={form.price}
                              onChange={e => setForm({ price: e.target.value })}
                              placeholder="0"
                              min="1"
                              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 5, fontWeight: 600 }}>{isAr ? 'مدة التوصيل (يوم)' : 'Delivery (days)'}</label>
                            <input
                              type="number"
                              value={form.days}
                              onChange={e => setForm({ days: e.target.value })}
                              placeholder="3"
                              min="1"
                              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 5, fontWeight: 600 }}>{isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</label>
                          <input
                            value={form.notes}
                            onChange={e => setForm({ notes: e.target.value })}
                            placeholder={isAr ? 'مثال: متوفر جاهز للشحن الفوري' : 'e.g. Ready for immediate shipping'}
                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                        <button
                          onClick={() => handleSubmitOffer(req.id)}
                          disabled={submitting === req.id}
                          style={{ padding: '12px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', opacity: submitting === req.id ? 0.7 : 1, transition: 'opacity 0.2s' }}
                        >
                          {submitting === req.id ? '...' : (isAr ? '📤 تقديم العرض' : '📤 Submit Offer')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
