'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveMoatCompetitorThreatAction, deleteMoatCompetitorThreatAction } from '../customers/actions';

interface Moat {
  id: string;
  moat_number: number;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  moat_type: string;
}

interface CompetitorThreat {
  id: string;
  moat_id: string;
  competitor_name: string;
  threat_description_ar: string;
  threat_description_en: string;
  counter_strategy_ar: string;
  counter_strategy_en: string;
  severity_level: string;
  logged_at: string;
  platform_moats?: {
    title_en: string;
    title_ar: string;
  };
}

interface MoatClientProps {
  locale: string;
  moats: Moat[];
  threats: CompetitorThreat[];
}

export default function MoatClient({
  locale,
  moats,
  threats: initialThreats
}: MoatClientProps) {
  const isRTL = locale === 'ar';
  const [threats, setThreats] = useState<CompetitorThreat[]>(initialThreats);
  const [activeTab, setActiveTab] = useState<'moats' | 'threats'>('moats');
  const [isPending, startTransition] = useTransition();

  // Form states
  const [formData, setFormData] = useState({
    moat_id: '',
    competitor_name: '',
    threat_description_en: '',
    threat_description_ar: '',
    counter_strategy_en: '',
    counter_strategy_ar: '',
    severity_level: 'medium'
  });

  const getMoatBadge = (type: string) => {
    switch (type) {
      case 'network_effects':
        return isRTL ? 'Network Effects ✍️' : 'Network Effects ✍️';
      case 'data_moat':
        return isRTL ? 'Data Moat ✍️' : 'Data Moat ✍️';
      case 'algorithmic':
        return isRTL ? 'Algorithmic Moat ✍️' : 'Algorithmic Moat ✍️';
      case 'switching_cost':
        return isRTL ? 'Switching Cost ✍️' : 'Switching Cost ✍️';
      case 'asset_lockin':
        return isRTL ? 'Asset Lock-in ✍️' : 'Asset Lock-in ✍️';
      case 'brand':
        return isRTL ? 'Brand Moat ✍️' : 'Brand Moat ✍️';
      case 'insight':
        return isRTL ? 'Insight Moat ✍️' : 'Insight Moat ✍️';
      case 'scout_network':
        return isRTL ? 'Sourcing Moat ✍️' : 'Sourcing Moat ✍️';
      default:
        return 'Defensive Moat';
    }
  };

  const handleSaveThreat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.moat_id) {
      alert(isRTL ? 'الرجاء اختيار الخندق الدفاعي المتأثر' : 'Please select the affected moat');
      return;
    }

    startTransition(async () => {
      try {
        await saveMoatCompetitorThreatAction(formData, locale);
        
        const selectedMoat = moats.find(m => m.id === formData.moat_id);
        const newThreat: CompetitorThreat = {
          id: Math.random().toString(),
          moat_id: formData.moat_id,
          competitor_name: formData.competitor_name,
          threat_description_ar: formData.threat_description_ar,
          threat_description_en: formData.threat_description_en,
          counter_strategy_ar: formData.counter_strategy_ar,
          counter_strategy_en: formData.counter_strategy_en,
          severity_level: formData.severity_level,
          logged_at: new Date().toISOString(),
          platform_moats: selectedMoat ? { title_en: selectedMoat.title_en, title_ar: selectedMoat.title_ar } : undefined
        };

        setThreats([newThreat, ...threats]);
        setFormData({
          moat_id: '',
          competitor_name: '',
          threat_description_en: '',
          threat_description_ar: '',
          counter_strategy_en: '',
          counter_strategy_ar: '',
          severity_level: 'medium'
        });
        alert(isRTL ? 'تم تسجيل التهديد بنجاح 🛡️' : 'Competitor threat registered! 🛡️');
      } catch (err: any) {
        alert(err.message || 'Error saving threat');
      }
    });
  };

  const handleDeleteThreat = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this threat log?')) return;
    startTransition(async () => {
      try {
        await deleteMoatCompetitorThreatAction(id, locale);
        setThreats(threats.filter(t => t.id !== id));
      } catch (err: any) {
        alert(err.message || 'Error deleting');
      }
    });
  };

  return (
    <div className="moat-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .moat-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Tabs bar */
        .tabs-bar { display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; }
        .tab-btn { background: transparent; border: none; font-size: 1rem; font-weight: 850; color: rgba(255,255,255,0.4); cursor: pointer; padding: 8px 16px; transition: all 0.2s; border-radius: 8px; }
        .tab-btn.active { color: #8b5cf6; background: rgba(139,92,246,0.08); }

        /* Focus Hero Section matching mockup style */
        .focus-hero {
          background: linear-gradient(135deg, rgba(76, 29, 149, 0.2) 0%, rgba(10, 10, 25, 0.5) 100%);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 30px;
          position: relative;
          text-align: center;
        }
        .focus-tag {
          font-size: 0.75rem;
          font-weight: 900;
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.15);
          padding: 4px 12px;
          border-radius: 8px;
          display: inline-block;
          margin-bottom: 12px;
        }
        .focus-title { font-size: 1.6rem; font-weight: 900; color: white; margin: 0; }

        /* Moat list items matching mockup */
        .moat-container { display: flex; flex-direction: column; gap: 18px; }
        
        .moat-card {
          background: rgba(255, 255, 255, 0.012);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          transition: all 0.2s;
        }
        .moat-card:hover {
          background: rgba(255, 255, 255, 0.025);
          border-color: rgba(139, 92, 246, 0.15);
          transform: translateY(-2px);
        }
        
        .moat-number { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 850; letter-spacing: 0.05em; }
        .moat-title { font-size: 1.25rem; font-weight: 900; color: white; margin: 4px 0 10px; }
        .moat-desc { font-size: 0.9rem; color: rgba(255,255,255,0.65); line-height: 1.5; margin-bottom: 12px; }
        
        .moat-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 900;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }

        /* Threats view */
        .threat-form { background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.04); border-radius: 24px; padding: 25px; margin-bottom: 30px; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full-width { grid-column: span 2; }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input, .form-group select, .form-group textarea { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #8b5cf6; outline: none; }
        
        .submit-btn { padding: 12px 24px; background: #8b5cf6; color: white; border: none; font-weight: 850; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover { background: #7c3aed; }

        .threat-list { display: flex; flex-direction: column; gap: 15px; }
        .threat-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); border-radius: 18px; padding: 20px; position: relative; }
        .threat-meta { display: flex; justify-content: space-between; font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 800; margin-bottom: 10px; }
        .threat-title { font-weight: 900; font-size: 1.05rem; color: white; margin: 0 0 6px; }
        .threat-desc { font-size: 0.9rem; color: rgba(255,255,255,0.6); line-height: 1.4; margin-bottom: 12px; }
        .strategy-box { background: rgba(16, 185, 129, 0.03); border: 1px solid rgba(16, 185, 129, 0.08); border-radius: 12px; padding: 12px 16px; }
        .strategy-text { font-size: 0.85rem; color: #10b981; margin: 0; line-height: 1.4; }

        .severity-badge { font-size: 0.7rem; font-weight: 900; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
        .severity-badge.low { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .severity-badge.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .severity-badge.high { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .severity-badge.critical { background: #ef4444; color: white; }

        .delete-btn { position: absolute; top: 20px; right: 20px; background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; font-size: 0.95rem; }
        [dir="rtl"] .delete-btn { right: auto; left: 20px; }
        .delete-btn:hover { opacity: 1; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'الخندق الدفاعي ومزايا المشروع 🏯' : 'Defensive Moats 🏯'}</h1>
          <p className="subtitle">
            {isRTL ? 'توضيح نقاط القوة التنافسية لـ Findora التي تجعل من المستحيل تقليدها بمرور الوقت.' : 'Detailing competitor advantages that prevent competitors from copying Findora over time.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href={`/${locale}/staff/intelligence/moat/tracker`} className="back-link" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981' }}>
            🧠 {isRTL ? 'متتبع خندق البيانات' : 'Data Moat Tracker'}
          </Link>
          <Link href={`/${locale}/staff/intelligence`} className="back-link">
            {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
          </Link>
        </div>
      </header>

      {/* Warning Focus Hero */}
      <section className="focus-hero">
        <span className="focus-tag">{isRTL ? '🏯 الخندق الدفاعي للمشروع' : '🏯 Defensive Protection'}</span>
        <h2 className="focus-title">
          {isRTL ? 'لماذا لن يستطيع أي منافس تقليد Findora؟' : 'Why can no competitor copy Findora?'}
        </h2>
      </section>

      {/* Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab === 'moats' ? 'active' : ''}`} onClick={() => setActiveTab('moats')}>
          🏰 {isRTL ? 'مزايا الخندق الدفاعي الـ 8' : 'The 8 Defensive Moats'}
        </button>
        <button className={`tab-btn ${activeTab === 'threats' ? 'active' : ''}`} onClick={() => setActiveTab('threats')}>
          🛡️ {isRTL ? 'سجل المخاطر وخطة الرد' : 'Competitor Threats & Counter-Plans'}
        </button>
      </div>

      {activeTab === 'moats' ? (
        <div className="moat-container">
          {moats.map(mt => (
            <div key={mt.id} className="moat-card">
              <div className="moat-number">Moat {mt.moat_number}</div>
              <h3 className="moat-title">{isRTL ? mt.title_ar : mt.title_en}</h3>
              <p className="moat-desc">{isRTL ? mt.description_ar : mt.description_en}</p>
              <span className="moat-badge">
                {getMoatBadge(mt.moat_type)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        /* Threats management view */
        <div>
          {/* Form */}
          <form className="threat-form" onSubmit={handleSaveThreat}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#8b5cf6', marginBottom: '20px' }}>
              ⚠️ {isRTL ? 'تسجيل تهديد تنافسي جديد' : 'Log Competitor Threat & Risk'}
            </h3>

            <div className="form-grid">
              <div className="form-group">
                <label>{isRTL ? 'الخندق المستهدف للتقليد' : 'Targeted Moat'}</label>
                <select required value={formData.moat_id} onChange={e => setFormData({ ...formData, moat_id: e.target.value })}>
                  <option value="">{isRTL ? 'اختر الخندق...' : 'Select moat...'}</option>
                  {moats.map(m => (
                    <option key={m.id} value={m.id}>Moat {m.moat_number}: {isRTL ? m.title_ar : m.title_en}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'اسم المنافس' : 'Competitor Name'}</label>
                <input type="text" required value={formData.competitor_name} onChange={e => setFormData({ ...formData, competitor_name: e.target.value })} />
              </div>

              <div className="form-group">
                <label>{isRTL ? 'خطورة التهديد' : 'Severity Level'}</label>
                <select value={formData.severity_level} onChange={e => setFormData({ ...formData, severity_level: e.target.value })}>
                  <option value="low">{isRTL ? 'منخفضة' : 'Low'}</option>
                  <option value="medium">{isRTL ? 'متوسطة' : 'Medium'}</option>
                  <option value="high">{isRTL ? 'عالية' : 'High'}</option>
                  <option value="critical">{isRTL ? 'حرجة جداً 🚨' : 'Critical 🚨'}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'تفاصيل التهديد والتقليد (بالعربية)' : 'Threat Description (Arabic)'}</label>
                <textarea rows={2} required value={formData.threat_description_ar} onChange={e => setFormData({ ...formData, threat_description_ar: e.target.value })} />
              </div>

              <div className="form-group">
                <label>{isRTL ? 'تفاصيل التهديد والتقليد (بالإنجليزية)' : 'Threat Description (English)'}</label>
                <textarea rows={2} required value={formData.threat_description_en} onChange={e => setFormData({ ...formData, threat_description_en: e.target.value })} />
              </div>

              <div className="form-group">
                <label>{isRTL ? 'خطة الرد والحل لتجاوز التهديد (بالعربية)' : 'Counter-Strategy (Arabic)'}</label>
                <textarea rows={2} required value={formData.counter_strategy_ar} onChange={e => setFormData({ ...formData, counter_strategy_ar: e.target.value })} />
              </div>

              <div className="form-group">
                <label>{isRTL ? 'خطة الرد والحل لتجاوز التهديد (بالإنجليزية)' : 'Counter-Strategy (English)'}</label>
                <textarea rows={2} required value={formData.counter_strategy_en} onChange={e => setFormData({ ...formData, counter_strategy_en: e.target.value })} />
              </div>
            </div>

            <button type="submit" disabled={isPending} className="submit-btn" style={{ marginTop: '20px' }}>
              {isPending ? (isRTL ? 'جاري التسجيل...' : 'Registering...') : (isRTL ? 'تسجيل التهديد خطة الرد 💾' : 'Register Threat & Counter-Plan 💾')}
            </button>
          </form>

          {/* List */}
          <div className="threat-list">
            {threats.map(th => {
              const moatTitle = isRTL ? th.platform_moats?.title_ar : th.platform_moats?.title_en;
              return (
                <div key={th.id} className="threat-card">
                  <button className="delete-btn" onClick={() => handleDeleteThreat(th.id)}>🗑️</button>
                  <div className="threat-meta">
                    <span>Target: Moat - {moatTitle || 'Custom'}</span>
                    <span className={`severity-badge ${th.severity_level}`}>{th.severity_level}</span>
                  </div>
                  <h4 className="threat-title">⚠️ {isRTL ? 'تهديد من:' : 'Threat from:'} {th.competitor_name}</h4>
                  <p className="threat-desc">{isRTL ? th.threat_description_ar : th.threat_description_en}</p>
                  
                  <div className="strategy-box">
                    <span style={{ fontSize: '1rem' }}>🟢</span>
                    <p className="strategy-text">
                      <strong>{isRTL ? 'خطة الحل والرد:' : 'Counter-Plan:'}</strong> {isRTL ? th.counter_strategy_ar : th.counter_strategy_en}
                    </p>
                  </div>
                </div>
              );
            })}

            {threats.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '30px 0', fontWeight: 800 }}>
                {isRTL ? 'لا توجد تهديدات مسجلة بعد' : 'No logged competitor threats yet'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
