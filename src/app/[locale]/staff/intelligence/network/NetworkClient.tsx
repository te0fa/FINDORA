'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveMarketHealthGoalAction } from '../customers/actions';

interface IndicatorConfig {
  specialization: string;
  goal_quotes_per_request?: number;
  goal_response_time_hours?: number;
  goal_merchant_win_rate_pct?: number;
  goal_active_merchants_week?: number;
  goal_request_conversion_rate_pct?: number;
  goal_avg_deal_value_egp?: number;
  shortfalls_comments?: string;
  strength_merchants_comments?: string;
}

interface CategoryMetrics {
  category: string;
  avg_quotes: number;
  avg_response_time: number;
  win_rate: number;
  active_merchants: number;
  conversion_rate: number;
  avg_deal_value: number;
}

interface NetworkClientProps {
  locale: string;
  globalMetrics: {
    avg_quotes: number;
    avg_response_time: number;
    win_rate: number;
    active_merchants: number;
    conversion_rate: number;
    avg_deal_value: number;
  };
  categoriesMetrics: CategoryMetrics[];
  indicators: IndicatorConfig[];
}

export default function NetworkClient({
  locale,
  globalMetrics,
  categoriesMetrics,
  indicators
}: NetworkClientProps) {
  const isRTL = locale === 'ar';
  const [configs, setConfigs] = useState<IndicatorConfig[]>(indicators);
  const [selectedSpec, setSelectedSpec] = useState('global');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Find active config
  const activeConfig = configs.find(c => c.specialization === selectedSpec) || {
    specialization: selectedSpec,
    goal_quotes_per_request: 3.0,
    goal_response_time_hours: 4.0,
    goal_merchant_win_rate_pct: 30.0,
    goal_active_merchants_week: 8,
    goal_request_conversion_rate_pct: 25.0,
    goal_avg_deal_value_egp: 5000.0,
    shortfalls_comments: '',
    strength_merchants_comments: ''
  };

  const [formData, setFormData] = useState({
    goal_quotes_per_request: activeConfig.goal_quotes_per_request || 3.0,
    goal_response_time_hours: activeConfig.goal_response_time_hours || 4.0,
    goal_merchant_win_rate_pct: activeConfig.goal_merchant_win_rate_pct || 30.0,
    goal_active_merchants_week: activeConfig.goal_active_merchants_week || 8,
    goal_request_conversion_rate_pct: activeConfig.goal_request_conversion_rate_pct || 25.0,
    goal_avg_deal_value_egp: activeConfig.goal_avg_deal_value_egp || 5000.0,
    shortfalls_comments: activeConfig.shortfalls_comments || '',
    strength_merchants_comments: activeConfig.strength_merchants_comments || ''
  });

  const handleSpecChange = (spec: string) => {
    setSelectedSpec(spec);
    const cfg = configs.find(c => c.specialization === spec) || {
      specialization: spec,
      goal_quotes_per_request: 3.0,
      goal_response_time_hours: 4.0,
      goal_merchant_win_rate_pct: 30.0,
      goal_active_merchants_week: 8,
      goal_request_conversion_rate_pct: 25.0,
      goal_avg_deal_value_egp: 5000.0,
      shortfalls_comments: '',
      strength_merchants_comments: ''
    };
    setFormData({
      goal_quotes_per_request: cfg.goal_quotes_per_request || 3.0,
      goal_response_time_hours: cfg.goal_response_time_hours || 4.0,
      goal_merchant_win_rate_pct: cfg.goal_merchant_win_rate_pct || 30.0,
      goal_active_merchants_week: cfg.goal_active_merchants_week || 8,
      goal_request_conversion_rate_pct: cfg.goal_request_conversion_rate_pct || 25.0,
      goal_avg_deal_value_egp: cfg.goal_avg_deal_value_egp || 5000.0,
      shortfalls_comments: cfg.shortfalls_comments || '',
      strength_merchants_comments: cfg.strength_merchants_comments || ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    startTransition(async () => {
      try {
        const payload = { specialization: selectedSpec, ...formData };
        await saveMarketHealthGoalAction(payload, locale);
        
        // Update local state
        const updatedConfigs = configs.some(c => c.specialization === selectedSpec)
          ? configs.map(c => c.specialization === selectedSpec ? { ...c, ...formData } : c)
          : [...configs, payload];
        setConfigs(updatedConfigs);
        setSuccessMsg(isRTL ? 'تم تحديث المؤشرات والأهداف بنجاح! 💾' : 'Indicators and goals saved successfully! 💾');
      } catch (err: any) {
        setErrorMsg(err.message || 'Error saving');
      }
    });
  };

  // Determine current active display metrics based on spec
  const currentMetrics = selectedSpec === 'global'
    ? globalMetrics
    : categoriesMetrics.find(c => c.category === selectedSpec) || {
        category: selectedSpec,
        avg_quotes: 0,
        avg_response_time: 0,
        win_rate: 0,
        active_merchants: 0,
        conversion_rate: 0,
        avg_deal_value: 0
      };

  const globalConfig = configs.find(c => c.specialization === 'global') || {
    goal_quotes_per_request: 3.0,
    goal_response_time_hours: 4.0,
    goal_merchant_win_rate_pct: 30.0,
    goal_active_merchants_week: 8,
    goal_request_conversion_rate_pct: 25.0,
    goal_avg_deal_value_egp: 5000.0
  };

  return (
    <div className="network-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .network-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }
        
        .spec-selector { margin-bottom: 25px; display: flex; gap: 10px; align-items: center; }
        .spec-select { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 16px; color: white; font-weight: 800; font-size: 0.9rem; }
        
        /* Stats Dashboard Row matching mockup */
        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
        @media (max-width: 768px) { .metrics-grid { grid-template-columns: 1fr; } }
        
        .metric-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 120px;
        }
        .metric-val { font-size: 2.2rem; font-weight: 900; color: white; margin-bottom: 4px; }
        .metric-lbl { font-size: 0.9rem; color: rgba(255, 255, 255, 0.8); font-weight: 800; }
        .metric-goal { font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); margin-top: 4px; }
        
        /* Form view styling matching update form */
        .config-card { background: linear-gradient(135deg, rgba(20, 25, 45, 0.3) 0%, rgba(10, 12, 25, 0.5) 100%); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 30px; margin-bottom: 40px; }
        .form-title { font-size: 1.15rem; font-weight: 900; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
        
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input, .form-group textarea { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        .form-group input:focus, .form-group textarea:focus { border-color: #3b82f6; outline: none; }
        
        .save-btn { padding: 12px 24px; background: #3b82f6; color: white; border: none; font-weight: 800; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
        .save-btn:hover { background: #2563eb; }
        
        /* Section detailing shortfalls and scale areas */
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-top: 30px; }
        @media (max-width: 800px) { .details-grid { grid-template-columns: 1fr; } }
        
        .detail-box { background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 22px; }
        .detail-box-title { font-size: 1.05rem; font-weight: 900; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .detail-box p { font-size: 0.9rem; line-height: 1.6; color: rgba(255,255,255,0.7); margin: 0; white-space: pre-wrap; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'مؤشر صحة تأثيرات الشبكة' : 'Network Effects Tracker'}</h1>
          <p className="subtitle">
            {isRTL ? 'مؤشرات صحة السوق نفسه - هذه الأرقام تقول هل Findora تنمو أم لا.' : 'Market health and liquidity statistics.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Filter by Specialization/Category */}
      <div className="spec-selector">
        <label style={{ fontWeight: 800, fontSize: '0.9rem' }}>🔍 {isRTL ? 'عرض قطاع السوق:' : 'View Segment:'}</label>
        <select 
          className="spec-select"
          value={selectedSpec}
          onChange={e => handleSpecChange(e.target.value)}
        >
          <option value="global">{isRTL ? 'السوق ككل (عالمي)' : 'Global Market'}</option>
          {categoriesMetrics.map(cat => (
            <option key={cat.category} value={cat.category}>
              {cat.category.replace('_', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Six stats cards grid */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeft: '4px solid #60a5fa' }}>
          <div className="metric-val">{currentMetrics.avg_response_time || '-'}</div>
          <div className="metric-lbl">{isRTL ? 'متوسط وقت الرد (ساعة)' : 'Avg Response Time (hours)'}</div>
          <div className="metric-goal">{isRTL ? `هدف: ${activeConfig.goal_response_time_hours || 4} ساعة` : `Goal: ${activeConfig.goal_response_time_hours || 4}h`}</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="metric-val">{currentMetrics.avg_quotes || '-'}</div>
          <div className="metric-lbl">{isRTL ? 'متوسط عروض لكل طلب' : 'Avg Quotes per Request'}</div>
          <div className="metric-goal">{isRTL ? `هدف: ${activeConfig.goal_quotes_per_request || 3} عروض` : `Goal: ${activeConfig.goal_quotes_per_request || 3}`}</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="metric-val">{currentMetrics.active_merchants || '0'}</div>
          <div className="metric-lbl">{isRTL ? 'التجار النشطين هذا الأسبوع' : 'Active Merchants This Week'}</div>
          <div className="metric-goal">{isRTL ? `هدف: ${activeConfig.goal_active_merchants_week || 8} تاجر` : `Goal: ${activeConfig.goal_active_merchants_week || 8}`}</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div className="metric-val">{currentMetrics.win_rate || '0'}%</div>
          <div className="metric-lbl">{isRTL ? 'نسبة فوز التاجر %' : 'Merchant Win Rate %'}</div>
          <div className="metric-goal">{isRTL ? `هدف: ${activeConfig.goal_merchant_win_rate_pct || 30}%` : `Goal: ${activeConfig.goal_merchant_win_rate_pct || 30}%`}</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="metric-val">{currentMetrics.avg_deal_value ? currentMetrics.avg_deal_value.toLocaleString() : '-'}</div>
          <div className="metric-lbl">{isRTL ? 'متوسط قيمة الصفقة (جنيه)' : 'Avg Deal Value (EGP)'}</div>
          <div className="metric-goal">{isRTL ? `هدف: ${activeConfig.goal_avg_deal_value_egp || 5000} ج` : `Goal: ${activeConfig.goal_avg_deal_value_egp || 5000} EGP`}</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #14b8a6' }}>
          <div className="metric-val">{currentMetrics.conversion_rate || '0'}%</div>
          <div className="metric-lbl">{isRTL ? 'نسبة تحويل الطلبات %' : 'Request Conversion Rate %'}</div>
          <div className="metric-goal">{isRTL ? `هدف: ${activeConfig.goal_request_conversion_rate_pct || 25}%` : `Goal: ${activeConfig.goal_request_conversion_rate_pct || 25}%`}</div>
        </div>
      </div>

      {/* Shortfalls and Strong elements */}
      <div className="details-grid" style={{ marginBottom: '40px' }}>
        <div className="detail-box" style={{ borderTop: '4px solid #ef4444' }}>
          <h3 className="detail-box-title" style={{ color: '#ef4444' }}>⚠️ {isRTL ? 'عوامل التقصير في هذا المجال' : 'Segment Shortfalls & Gaps'}</h3>
          <p>{activeConfig.shortfalls_comments || (isRTL ? 'لا توجد ملاحظات تقصير مسجلة.' : 'No shortfalls registered.')}</p>
        </div>

        <div className="detail-box" style={{ borderTop: '4px solid #10b981' }}>
          <h3 className="detail-box-title" style={{ color: '#10b981' }}>🚀 {isRTL ? 'البنود والتجار الأقوياء القابلة للتكبير' : 'Scale Areas & Strong Merchants'}</h3>
          <p>{activeConfig.strength_merchants_comments || (isRTL ? 'لا توجد ملاحظات قوة مسجلة.' : 'No scale factors registered.')}</p>
        </div>
      </div>

      {/* Goal configuration form matching update form */}
      <section className="config-card">
        <h3 className="form-title">⚙️ {isRTL ? 'تعديل المؤشرات والأهداف الاستراتيجية' : 'Configure Health Goals & Gaps'}</h3>
        
        {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px' }}>⚠️ {errorMsg}</div>}
        {successMsg && <div style={{ color: '#10b981', marginBottom: '15px' }}>✅ {successMsg}</div>}

        <form onSubmit={handleSave} className="form-grid">
          <div className="form-group">
            <label>{isRTL ? 'متوسط عروض لكل طلب (هدف)' : 'Avg Quotes per Request (Goal)'}</label>
            <input 
              type="number" 
              step="0.1"
              value={formData.goal_quotes_per_request} 
              onChange={e => setFormData({ ...formData, goal_quotes_per_request: Number(e.target.value) })} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'متوسط وقت الرد بالساعة (هدف)' : 'Avg Response Time Hours (Goal)'}</label>
            <input 
              type="number" 
              step="0.1"
              value={formData.goal_response_time_hours} 
              onChange={e => setFormData({ ...formData, goal_response_time_hours: Number(e.target.value) })} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'نسبة فوز التاجر % (هدف)' : 'Merchant Win Rate % (Goal)'}</label>
            <input 
              type="number" 
              step="0.1"
              value={formData.goal_merchant_win_rate_pct} 
              onChange={e => setFormData({ ...formData, goal_merchant_win_rate_pct: Number(e.target.value) })} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'التجار النشطين أسبوعياً (هدف)' : 'Active Merchants per Week (Goal)'}</label>
            <input 
              type="number" 
              value={formData.goal_active_merchants_week} 
              onChange={e => setFormData({ ...formData, goal_active_merchants_week: Number(e.target.value) })} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'نسبة تحويل الطلبات % (هدف)' : 'Request Conversion Rate % (Goal)'}</label>
            <input 
              type="number" 
              step="0.1"
              value={formData.goal_request_conversion_rate_pct} 
              onChange={e => setFormData({ ...formData, goal_request_conversion_rate_pct: Number(e.target.value) })} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'متوسط قيمة الصفقة جنيه (هدف)' : 'Avg Deal Value EGP (Goal)'}</label>
            <input 
              type="number" 
              value={formData.goal_avg_deal_value_egp} 
              onChange={e => setFormData({ ...formData, goal_avg_deal_value_egp: Number(e.target.value) })} 
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>{isRTL ? 'ملاحظات عوامل التقصير والاحتياجات في هذا القطاع:' : 'Analyze Shortfalls & What this segment needs:'}</label>
            <textarea 
              rows={3}
              value={formData.shortfalls_comments} 
              onChange={e => setFormData({ ...formData, shortfalls_comments: e.target.value })} 
              placeholder={isRTL ? 'سجل هنا عوامل القصور مثل نقص التجار، أوقات الاستجابة البطيئة للطلبات...' : 'Describe gaps like supplier shortages, slow response times...'}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>{isRTL ? 'البنود الناجحة والتجار الأقوياء للتطوير والتوسيع:' : 'Describe strong suppliers / items to scale in this segment:'}</label>
            <textarea 
              rows={3}
              value={formData.strength_merchants_comments} 
              onChange={e => setFormData({ ...formData, strength_merchants_comments: e.target.value })} 
              placeholder={isRTL ? 'سجل هنا التجار الأقوياء والبضائع المطلوبة بكثرة ولدينا فيها ميزة لتوسيعها...' : 'Identify strong suppliers or hot items that can be scaled...'}
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={isPending} className="save-btn">
              {isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'تحديث المؤشرات والأهداف 💾' : 'Update Metrics & Goals 💾')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
