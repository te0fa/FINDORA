'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { saveDataMoatMetricsAction } from '../../customers/actions';

interface RecordedMetrics {
  id?: string;
  recorded_date: string;
  collected_prices: number;
  unique_products: number;
  verified_merchants: number;
  real_reviews: number;
  completed_deals: number;
  negotiation_data: number;
}

interface FutureIdea {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  target_phase: string;
  icon: string;
}

interface TrackerClientProps {
  locale: string;
  initialRecordedMetrics: RecordedMetrics;
  actualMetrics: {
    collected_prices: number;
    unique_products: number;
    verified_merchants: number;
    real_reviews: number;
    completed_deals: number;
    negotiation_data: number;
  };
  futureIdeas: FutureIdea[];
}

export default function TrackerClient({
  locale,
  initialRecordedMetrics,
  actualMetrics,
  futureIdeas
}: TrackerClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [recorded, setRecorded] = useState<RecordedMetrics>(initialRecordedMetrics);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formData, setFormData] = useState({
    recorded_date: recorded.recorded_date,
    collected_prices: recorded.collected_prices,
    unique_products: recorded.unique_products,
    verified_merchants: recorded.verified_merchants,
    real_reviews: recorded.real_reviews,
    completed_deals: recorded.completed_deals,
    negotiation_data: recorded.negotiation_data
  });

  // Target metrics defined in mockup
  const targets = {
    collected_prices: 1000,
    unique_products: 500,
    verified_merchants: 100,
    real_reviews: 200,
    completed_deals: 50,
    negotiation_data: 100
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveDataMoatMetricsAction(formData, locale);
        setRecorded(formData);
        toast(isRTL ? 'تم حفظ مؤشرات خندق البيانات بنجاح 🧠' : 'Data moat metrics updated successfully! 🧠', {
          type: 'success',
          title: '💾'
        });
      } catch (err: any) {
        toast(err.message || 'Error saving metrics', { type: 'error' });
      }
    });
  };

  // Helper to calculate progress percentage towards target
  const getProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Filter future ideas for data-related ones
  const dataRelatedIdeas = futureIdeas.filter(idea => {
    const title = idea.title_en.toLowerCase();
    const desc = idea.description_en.toLowerCase();
    return (
      title.includes('data') ||
      title.includes('intelligence') ||
      title.includes('ai') ||
      title.includes('score') ||
      title.includes('price') ||
      title.includes('warranty') ||
      desc.includes('data') ||
      desc.includes('intelligence') ||
      desc.includes('pricing')
    );
  });

  return (
    <div className="tracker-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .tracker-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 950px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Banner styling */
        .tracker-banner {
          background: radial-gradient(circle at top, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0) 75%);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 24px;
          padding: 30px;
          text-align: center;
          margin-bottom: 35px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
        .tracker-banner-title { font-size: 1.8rem; font-weight: 950; color: #10b981; margin: 0 0 10px; }
        .tracker-banner-flow { font-size: 1.1rem; color: #f7d46b; font-weight: 850; margin: 0; }
        .tracker-banner-sub { font-size: 0.9rem; color: rgba(255,255,255,0.5); font-weight: 700; margin-top: 8px; }

        /* Indicators Grid */
        .section-title { font-size: 1.25rem; font-weight: 900; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; color: white; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
        .indicators-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
        
        .indicator-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .indicator-card:hover {
          border-color: rgba(16,185,129,0.25);
          background: rgba(255,255,255,0.03);
          transform: translateY(-2px);
        }
        .indicator-icon-wrap { font-size: 2rem; margin-bottom: 12px; }
        .indicator-val { font-size: 2.2rem; font-weight: 950; color: #ffffff; line-height: 1.2; margin-bottom: 4px; }
        .indicator-label { font-size: 1rem; font-weight: 800; color: rgba(255,255,255,0.85); margin-bottom: 2px; }
        .indicator-target { font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        
        /* Progress Bar */
        .progress-bar-container { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; margin-top: 15px; overflow: hidden; }
        .progress-bar-fill { height: 100%; border-radius: 3px; background: #10b981; transition: width 0.5s ease; }

        /* Compare Sub-label (Weekly vs Live) */
        .indicator-compare { display: flex; justify-content: space-between; font-size: 0.75rem; color: rgba(255,255,255,0.35); font-weight: 700; margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.05); }
        .compare-item span { color: rgba(255,255,255,0.6); font-weight: 800; }

        /* Update Form */
        .form-section {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 40px;
        }
        .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-size: 0.85rem; font-weight: 800; color: rgba(255,255,255,0.55); display: flex; align-items: center; gap: 6px; }
        .form-input {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 14px;
          color: white;
          font-family: inherit;
          font-weight: 800;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .form-input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,0.15); }
        
        .btn-submit {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #ffffff;
          font-weight: 900;
          font-size: 0.95rem;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(16,185,129,0.3); }

        /* Timeline growth */
        .timeline-container { display: flex; flex-direction: column; gap: 15px; margin-bottom: 40px; }
        .timeline-item {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 16px;
          padding: 15px 20px;
        }
        .timeline-badge { min-width: 100px; font-weight: 900; font-size: 0.9rem; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 4px 12px; border-radius: 8px; text-align: center; margin-right: 20px; }
        [dir="rtl"] .timeline-badge { margin-right: 0; margin-left: 20px; }
        .timeline-info { flex: 1; display: flex; align-items: center; justify-content: space-between; }
        .timeline-text { font-size: 1rem; font-weight: 800; color: #ffffff; }
        .timeline-outcome { font-size: 0.95rem; color: #f7d46b; font-weight: 750; }

        /* Future Ideas Cards */
        .ideas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .idea-card {
          background: rgba(16, 185, 129, 0.02);
          border: 1px solid rgba(16, 185, 129, 0.1);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          gap: 15px;
        }
        .idea-icon { font-size: 1.8rem; }
        .idea-content { flex: 1; }
        .idea-title { font-size: 1.15rem; font-weight: 900; color: #ffffff; margin: 0 0 6px; }
        .idea-desc { font-size: 0.9rem; color: rgba(255,255,255,0.65); line-height: 1.45; margin: 0 0 12px; }
        .idea-tag { font-size: 0.75rem; font-weight: 850; color: #10b981; background: rgba(16,185,129,0.1); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(16,185,129,0.2); display: inline-block; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'متتبع خندق البيانات' : 'Data Moat Tracker'}</h1>
          <p className="subtitle">
            {isRTL 
              ? 'تتبع أقوى أصل للمنصة وتطوير المعرفة المتراكمة بقرارات الشراء.' 
              : 'Track the platform\'s ultimate asset and build strategic purchase knowledge.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← لوحة الذكاء' : '← Intelligence'}
        </Link>
      </header>

      {/* Tracker Banner */}
      <section className="tracker-banner">
        <h2 className="tracker-banner-title">
          {isRTL ? 'أقوى أصل في الشركة — قِسه كل أسبوع 🧠' : 'The Ultimate Asset — Measure Weekly 🧠'}
        </h2>
        <p className="tracker-banner-flow">
          {isRTL 
            ? 'أمازون تملك منتجات. أنت ستملك معرفة قرارات الشراء.' 
            : 'Amazon owns products. Findora owns the purchase decision data.'}
        </p>
        <p className="tracker-banner-sub">
          {isRTL 
            ? `آخر تحديث مؤشرات: ${recorded.recorded_date}` 
            : `Last indicators update: ${recorded.recorded_date}`}
        </p>
      </section>

      {/* Indicators Grid */}
      <section style={{ marginBottom: '45px' }}>
        <h2 className="section-title">📊 {isRTL ? 'مؤشرات قاعدة البيانات' : 'Database Indicators'}</h2>
        
        <div className="indicators-grid">
          {/* Card 1: Collected Prices */}
          <div className="indicator-card">
            <div className="indicator-icon-wrap">⏱️</div>
            <div className="indicator-val">{Math.max(recorded.collected_prices, actualMetrics.collected_prices).toLocaleString()}</div>
            <div className="indicator-label">{isRTL ? 'أسعار مجمعة' : 'Collected Prices'}</div>
            <div className="indicator-target">{isRTL ? 'الهدف:' : 'Target:'} {targets.collected_prices.toLocaleString()}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getProgress(Math.max(recorded.collected_prices, actualMetrics.collected_prices), targets.collected_prices)}%` }}></div>
            </div>
            <div className="indicator-compare">
              <div className="compare-item">{isRTL ? 'مسجل أسبوعياً:' : 'Weekly Recorded:'} <span>{recorded.collected_prices.toLocaleString()}</span></div>
              <div className="compare-item">{isRTL ? 'النظام التلقائي:' : 'Live System:'} <span>{actualMetrics.collected_prices.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Card 2: Unique Products */}
          <div className="indicator-card">
            <div className="indicator-icon-wrap">📦</div>
            <div className="indicator-val">{Math.max(recorded.unique_products, actualMetrics.unique_products).toLocaleString()}</div>
            <div className="indicator-label">{isRTL ? 'منتجات فريدة' : 'Unique Products'}</div>
            <div className="indicator-target">{isRTL ? 'الهدف:' : 'Target:'} {targets.unique_products.toLocaleString()}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getProgress(Math.max(recorded.unique_products, actualMetrics.unique_products), targets.unique_products)}%` }}></div>
            </div>
            <div className="indicator-compare">
              <div className="compare-item">{isRTL ? 'مسجل أسبوعياً:' : 'Weekly Recorded:'} <span>{recorded.unique_products.toLocaleString()}</span></div>
              <div className="compare-item">{isRTL ? 'النظام التلقائي:' : 'Live System:'} <span>{actualMetrics.unique_products.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Card 3: Verified Merchants */}
          <div className="indicator-card">
            <div className="indicator-icon-wrap">🏪</div>
            <div className="indicator-val">{Math.max(recorded.verified_merchants, actualMetrics.verified_merchants).toLocaleString()}</div>
            <div className="indicator-label">{isRTL ? 'موردون موثوقون' : 'Verified Merchants'}</div>
            <div className="indicator-target">{isRTL ? 'الهدف:' : 'Target:'} {targets.verified_merchants.toLocaleString()}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getProgress(Math.max(recorded.verified_merchants, actualMetrics.verified_merchants), targets.verified_merchants)}%` }}></div>
            </div>
            <div className="indicator-compare">
              <div className="compare-item">{isRTL ? 'مسجل أسبوعياً:' : 'Weekly Recorded:'} <span>{recorded.verified_merchants.toLocaleString()}</span></div>
              <div className="compare-item">{isRTL ? 'النظام التلقائي:' : 'Live System:'} <span>{actualMetrics.verified_merchants.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Card 4: Real Reviews */}
          <div className="indicator-card">
            <div className="indicator-icon-wrap">⭐</div>
            <div className="indicator-val">{Math.max(recorded.real_reviews, actualMetrics.real_reviews).toLocaleString()}</div>
            <div className="indicator-label">{isRTL ? 'تقييمات حقيقية' : 'Real Reviews'}</div>
            <div className="indicator-target">{isRTL ? 'الهدف:' : 'Target:'} {targets.real_reviews.toLocaleString()}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getProgress(Math.max(recorded.real_reviews, actualMetrics.real_reviews), targets.real_reviews)}%` }}></div>
            </div>
            <div className="indicator-compare">
              <div className="compare-item">{isRTL ? 'مسجل أسبوعياً:' : 'Weekly Recorded:'} <span>{recorded.real_reviews.toLocaleString()}</span></div>
              <div className="compare-item">{isRTL ? 'النظام التلقائي:' : 'Live System:'} <span>{actualMetrics.real_reviews.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Card 5: Completed Deals */}
          <div className="indicator-card">
            <div className="indicator-icon-wrap">🟩</div>
            <div className="indicator-val">{Math.max(recorded.completed_deals, actualMetrics.completed_deals).toLocaleString()}</div>
            <div className="indicator-label">{isRTL ? 'صفقات مكتملة' : 'Completed Deals'}</div>
            <div className="indicator-target">{isRTL ? 'الهدف:' : 'Target:'} {targets.completed_deals.toLocaleString()}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getProgress(Math.max(recorded.completed_deals, actualMetrics.completed_deals), targets.completed_deals)}%` }}></div>
            </div>
            <div className="indicator-compare">
              <div className="compare-item">{isRTL ? 'مسجل أسبوعياً:' : 'Weekly Recorded:'} <span>{recorded.completed_deals.toLocaleString()}</span></div>
              <div className="compare-item">{isRTL ? 'النظام التلقائي:' : 'Live System:'} <span>{actualMetrics.completed_deals.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Card 6: Negotiation Data */}
          <div className="indicator-card">
            <div className="indicator-icon-wrap">💛</div>
            <div className="indicator-val">{Math.max(recorded.negotiation_data, actualMetrics.negotiation_data).toLocaleString()}</div>
            <div className="indicator-label">{isRTL ? 'بيانات تفاوض' : 'Negotiation Data'}</div>
            <div className="indicator-target">{isRTL ? 'الهدف:' : 'Target:'} {targets.negotiation_data.toLocaleString()}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${getProgress(Math.max(recorded.negotiation_data, actualMetrics.negotiation_data), targets.negotiation_data)}%` }}></div>
            </div>
            <div className="indicator-compare">
              <div className="compare-item">{isRTL ? 'مسجل أسبوعياً:' : 'Weekly Recorded:'} <span>{recorded.negotiation_data.toLocaleString()}</span></div>
              <div className="compare-item">{isRTL ? 'النظام التلقائي:' : 'Live System:'} <span>{actualMetrics.negotiation_data.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Update form */}
      <section className="form-section">
        <h2 className="section-title">✍️ {isRTL ? 'تحديث المؤشرات' : 'Update Indicators'}</h2>
        
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>⏱️ {isRTL ? 'أسعار مجمعة' : 'Collected Prices'}</label>
              <input
                className="form-input"
                type="number"
                value={formData.collected_prices}
                onChange={e => setFormData({ ...formData, collected_prices: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>📦 {isRTL ? 'منتجات فريدة' : 'Unique Products'}</label>
              <input
                className="form-input"
                type="number"
                value={formData.unique_products}
                onChange={e => setFormData({ ...formData, unique_products: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>🏪 {isRTL ? 'موردون موثوقون' : 'Verified Merchants'}</label>
              <input
                className="form-input"
                type="number"
                value={formData.verified_merchants}
                onChange={e => setFormData({ ...formData, verified_merchants: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>⭐ {isRTL ? 'تقييمات حقيقية' : 'Real Reviews'}</label>
              <input
                className="form-input"
                type="number"
                value={formData.real_reviews}
                onChange={e => setFormData({ ...formData, real_reviews: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>🟩 {isRTL ? 'صفقات مكتملة' : 'Completed Deals'}</label>
              <input
                className="form-input"
                type="number"
                value={formData.completed_deals}
                onChange={e => setFormData({ ...formData, completed_deals: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>💛 {isRTL ? 'بيانات تفاوض' : 'Negotiation Data'}</label>
              <input
                className="form-input"
                type="number"
                value={formData.negotiation_data}
                onChange={e => setFormData({ ...formData, negotiation_data: Number(e.target.value) })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>📆 {isRTL ? 'تاريخ القياس' : 'Recorded Date'}</label>
              <input
                className="form-input"
                type="date"
                required
                value={formData.recorded_date}
                onChange={e => setFormData({ ...formData, recorded_date: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-submit" disabled={isPending}>
                {isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'تحديث البيانات 💾' : 'Update Metrics 💾')}
              </button>
            </div>
          </div>
        </form>
        <p style={{ margin: '15px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
          💡 {isRTL ? 'هذه الأرقام تتزايد تلقائياً مع كل صفقة في النظام الحقيقي' : 'These numbers increase automatically with each transaction in the real system.'}
        </p>
      </section>

      {/* Growth stages */}
      <section style={{ marginBottom: '45px' }}>
        <h2 className="section-title">📈 {isRTL ? 'نمو الـ DATA MOAT' : 'Data Moat Growth'}</h2>
        
        <div className="timeline-container">
          <div className="timeline-item">
            <span className="timeline-badge">{isRTL ? '٦ أشهر' : '6 Months'}</span>
            <div className="timeline-info">
              <span className="timeline-text">{isRTL ? '١،٠٠٠+ سعر مجمع' : '1,000+ Prices'}</span>
              <span className="timeline-outcome">➔ {isRTL ? 'بداية Price Intelligence' : 'Start of Price Intelligence'}</span>
            </div>
          </div>

          <div className="timeline-item">
            <span className="timeline-badge">{isRTL ? '١٢ شهر' : '12 Months'}</span>
            <div className="timeline-info">
              <span className="timeline-text">{isRTL ? '١٠،٠٠٠+ سعر مجمع' : '10,000+ Prices'}</span>
              <span className="timeline-outcome">➔ {isRTL ? 'بيع تقارير للشركات' : 'Sell corporate intelligence reports'}</span>
            </div>
          </div>

          <div className="timeline-item">
            <span className="timeline-badge">{isRTL ? '٢٤ شهر' : '24 Months'}</span>
            <div className="timeline-info">
              <span className="timeline-text">{isRTL ? '١٠٠،٠٠٠+ سعر مجمع' : '100,000+ Prices'}</span>
              <span className="timeline-outcome">➔ {isRTL ? 'أكبر قاعدة أسعار في مصر' : 'Largest price database in Egypt'}</span>
            </div>
          </div>

          <div className="timeline-item">
            <span className="timeline-badge">{isRTL ? '٥ سنوات' : '5 Years'}</span>
            <div className="timeline-info">
              <span className="timeline-text">{isRTL ? 'Universal Product Graph' : 'Universal Product Graph'}</span>
              <span className="timeline-outcome">➔ {isRTL ? 'طبقة معرفة للشراء' : 'Purchase Knowledge Layer'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Future Ideas Related to Data */}
      <section>
        <h2 className="section-title">💡 {isRTL ? 'أفكار مستقبلية مرتبطة بالـ DATA' : 'Future Ideas Related to DATA'}</h2>
        
        <div className="ideas-grid">
          {dataRelatedIdeas.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', gridColumn: 'span 2' }}>
              {isRTL ? 'لا توجد أفكار مستقبلية متعلقة بالبيانات حالياً.' : 'No future ideas related to data found.'}
            </p>
          ) : (
            dataRelatedIdeas.map(idea => (
              <div key={idea.id} className="idea-card">
                <span className="idea-icon">{idea.icon}</span>
                <div className="idea-content">
                  <h3 className="idea-title">{isRTL ? idea.title_ar : idea.title_en}</h3>
                  <p className="idea-desc">{isRTL ? idea.description_ar : idea.description_en}</p>
                  <span className="idea-tag">{idea.target_phase}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
