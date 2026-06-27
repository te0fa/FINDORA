'use client';

import React, { useState } from 'react';
import { saveMerchantDiscoveryStudyAction } from '../../customers/actions';

interface MerchantDiscoveryClientProps {
  merchantId: string;
  initialStudies: any[];
  locale: string;
}

export default function MerchantDiscoveryClient({
  merchantId,
  initialStudies = [],
  locale
}: MerchantDiscoveryClientProps) {
  const isRTL = locale === 'ar';
  const [studies, setStudies] = useState<any[]>(initialStudies);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    specialization: '',
    estimated_daily_customers: 0,
    biggest_selling_challenge: '',
    accepts_commission: false,
    accepts_bidding: false,
    conversion_hook: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totalStudies = studies.length;
  const acceptsCommissionCount = studies.filter(s => s.accepts_commission).length;
  const acceptsBiddingCount = studies.filter(s => s.accepts_bidding).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await saveMerchantDiscoveryStudyAction(merchantId, formData, locale);
      setStudies([{
        id: Math.random().toString(),
        created_at: new Date().toISOString(),
        ...formData
      }, ...studies]);
      setShowAddForm(false);
      setFormData({
        specialization: '',
        estimated_daily_customers: 0,
        biggest_selling_challenge: '',
        accepts_commission: false,
        accepts_bidding: false,
        conversion_hook: ''
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving study');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card discovery-card" style={{ border: '1px solid rgba(245, 158, 11, 0.15)', background: 'linear-gradient(135deg, rgba(30, 20, 10, 0.4) 0%, rgba(15, 10, 5, 0.6) 100%)' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .discovery-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 15px; }
        .discovery-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
        .discovery-stat-box { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px; padding: 14px; text-align: center; }
        .discovery-stat-val { font-size: 1.6rem; font-weight: 900; color: #f59e0b; }
        .discovery-stat-lbl { font-size: 0.75rem; color: rgba(255, 255, 255, 0.45); font-weight: 850; }
        
        .add-discovery-btn { width: 100%; padding: 14px; background: rgba(245, 158, 11, 0.1); border: 1px dashed rgba(245, 158, 11, 0.4); border-radius: 12px; color: #f59e0b; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .add-discovery-btn:hover { background: rgba(245, 158, 11, 0.18); border-color: #f59e0b; }
        
        .discovery-form { background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-bottom: 6px; font-weight: 800; }
        .form-group input[type="text"], .form-group input[type="number"], .form-group textarea { width: 100%; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 10px 14px; color: white; font-size: 0.9rem; }
        .form-group input:focus, .form-group textarea:focus { border-color: #f59e0b; outline: none; }
        
        .form-actions { display: flex; gap: 10px; margin-top: 20px; }
        .save-btn { padding: 10px 20px; background: #f59e0b; border: none; color: black; font-weight: 900; border-radius: 10px; cursor: pointer; }
        .cancel-btn { padding: 10px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-weight: 800; border-radius: 10px; cursor: pointer; }
        
        .empty-discovery { text-align: center; padding: 30px; color: rgba(255,255,255,0.4); font-size: 0.95rem; }
        .empty-discovery span { font-size: 2rem; margin-bottom: 10px; display: block; }
        
        .interviews-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .interview-item-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px; padding: 18px; }
        .interview-item-header { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.8rem; }
        .interview-date { color: rgba(255,255,255,0.4); }
        .pay-badge { padding: 2px 8px; border-radius: 6px; font-weight: 800; background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.6); }
        .pay-badge.active { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
      ` }} />

      <div className="discovery-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🏪</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>
              {isRTL ? 'Merchant Discovery — دراسات التجار' : 'Merchant Discovery'}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '3px 0 0' }}>
              {isRTL ? 'نجاح المنصة يعتمد على الطرفين - افهم التاجر قبل ما تطلب منه يشارك' : 'Understand the supplier before asking them to participate.'}
            </p>
          </div>
        </div>
      </div>

      {/* Discovery Stats Row */}
      <div className="discovery-stats-row">
        <div className="discovery-stat-box">
          <div className="discovery-stat-val">{totalStudies}</div>
          <div className="discovery-stat-lbl">{isRTL ? 'تاجر درسته' : 'Merchant Studies'}</div>
        </div>
        <div className="discovery-stat-box">
          <div className="discovery-stat-val">{acceptsCommissionCount}</div>
          <div className="discovery-stat-lbl">{isRTL ? 'يقبل عمولة' : 'Accepts Commission'}</div>
        </div>
        <div className="discovery-stat-box">
          <div className="discovery-stat-val">{acceptsBiddingCount}</div>
          <div className="discovery-stat-lbl">{isRTL ? 'يقبل المزايدة' : 'Accepts Bidding'}</div>
        </div>
      </div>

      {!showAddForm ? (
        <button className="add-discovery-btn" onClick={() => setShowAddForm(true)}>
          + {isRTL ? 'إضافة تاجر مدروس' : 'Add Merchant Study'}
        </button>
      ) : (
        <form className="discovery-form" onSubmit={handleSave}>
          <h4 style={{ margin: '0 0 20px', fontWeight: 900, color: '#f59e0b' }}>
            {isRTL ? 'دراسة تاجر جديدة' : 'New Merchant Study'}
          </h4>

          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px' }}>⚠️ {errorMsg}</div>}

          <div className="form-group">
            <label>{isRTL ? 'التخصص' : 'Specialization'}</label>
            <input 
              type="text" 
              required
              value={formData.specialization} 
              onChange={e => setFormData({ ...formData, specialization: e.target.value })} 
              placeholder={isRTL ? 'مثال: أدوات صحية، أجهزة منزلية...' : 'e.g. sanitary ware, home appliances...'} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'كم عميل يدخل يومياً (تقريباً)؟' : 'Estimated daily customers?'}</label>
            <input 
              type="number" 
              value={formData.estimated_daily_customers} 
              onChange={e => setFormData({ ...formData, estimated_daily_customers: Number(e.target.value) })} 
              placeholder="0" 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'ما أكبر مشكلة لديه في البيع الحالي؟' : 'What is their biggest selling challenge?'}</label>
            <textarea 
              required
              rows={3}
              value={formData.biggest_selling_challenge} 
              onChange={e => setFormData({ ...formData, biggest_selling_challenge: e.target.value })} 
              placeholder={isRTL ? 'مثال: ركود السوق، صعوبة الوصول لعملاء خارج منطقته...' : 'e.g. market stagnation, customer reach...'} 
            />
          </div>

          <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="checkbox" 
                id="accepts_commission" 
                checked={formData.accepts_commission} 
                onChange={e => setFormData({ ...formData, accepts_commission: e.target.checked })} 
              />
              <label htmlFor="accepts_commission" style={{ cursor: 'pointer', fontWeight: 800 }}>{isRTL ? 'يقبل عمولة' : 'Accepts Commission'}</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="checkbox" 
                id="accepts_bidding" 
                checked={formData.accepts_bidding} 
                onChange={e => setFormData({ ...formData, accepts_bidding: e.target.checked })} 
              />
              <label htmlFor="accepts_bidding" style={{ cursor: 'pointer', fontWeight: 800 }}>{isRTL ? 'يقبل المزايدة' : 'Accepts Bidding'}</label>
            </div>
          </div>

          <div className="form-group">
            <label>{isRTL ? 'ما الذي سيجعله يستخدم Findora؟' : 'What will make them use Findora?'}</label>
            <textarea 
              rows={3}
              value={formData.conversion_hook} 
              onChange={e => setFormData({ ...formData, conversion_hook: e.target.value })} 
              placeholder={isRTL ? 'مثال: زيادة المبيعات بنسبة 20%، توفير تكاليف التسويق...' : 'e.g. increase sales by 20%...'} 
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving} className="save-btn">
              {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ 💾' : 'Save 💾')}
            </button>
            <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Studies List */}
      <div className="interviews-list" style={{ marginTop: '25px' }}>
        <h4 style={{ margin: '0 0 15px', fontWeight: 800 }}>
          {isRTL ? `الدراسات المسجلة (${totalStudies})` : `Logged Studies (${totalStudies})`}
        </h4>
        {studies.length === 0 ? (
          <div className="empty-discovery">
            <span>🏪</span>
            <p>{isRTL ? 'لا توجد دراسات تجار بعد 🏪' : 'No merchant studies logged yet.'}</p>
          </div>
        ) : (
          <div className="interviews-grid">
            {studies.map((item: any) => (
              <div key={item.id} className="interview-item-card">
                <div className="interview-item-header">
                  <span className="interview-date">{new Date(item.created_at).toLocaleString(locale)}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {item.accepts_commission && (
                      <span className="pay-badge active">{isRTL ? 'يقبل عمولة' : 'Accepts Comm'}</span>
                    )}
                    {item.accepts_bidding && (
                      <span className="pay-badge active" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.1)' }}>{isRTL ? 'يقبل المزايدة' : 'Accepts Bid'}</span>
                    )}
                  </div>
                </div>
                <div className="interview-item-body">
                  <p><strong>{isRTL ? 'التخصص:' : 'Specialization:'}</strong> {item.specialization}</p>
                  <p><strong>{isRTL ? 'العملاء اليوميون المتوقعون:' : 'Estimated daily customers:'}</strong> {item.estimated_daily_customers}</p>
                  <p><strong>{isRTL ? 'المشكلة الكبرى في البيع:' : 'Biggest challenge:'}</strong> {item.biggest_selling_challenge}</p>
                  {item.conversion_hook && (
                    <p><strong>{isRTL ? 'دافع الاستخدام:' : 'Conversion Hook:'}</strong> {item.conversion_hook}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
