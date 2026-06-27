'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  saveGrowthChannelAction,
  deleteGrowthChannelAction,
  saveCrmAdPerformanceAction,
  saveGrowthContentPlanAction,
  deleteGrowthContentPlanAction
} from '../customers/actions';

interface GrowthChannel {
  id: string;
  name_en: string;
  name_ar: string;
  status: string; // 'running', 'planned', 'idea'
  cac_en: string;
  cac_ar: string;
  reach_en: string;
  reach_ar: string;
  tip_en: string;
  tip_ar: string;
}

interface CrmAdPerformance {
  id: string;
  platform: string; // 'Facebook', 'Instagram', 'Google', 'TikTok', 'WhatsApp'
  reach: number;
  spend: number;
  leads: number;
  clicks: number;
  best_post_desc?: string;
  deals: number;
  status: string; // 'active', 'paused', 'not_started'
}

interface ContentPlanPost {
  id: string;
  day_number: number;
  platform: string;
  hook_en: string;
  hook_ar: string;
  body_en: string;
  body_ar: string;
  image_prompt_en?: string;
  image_prompt_ar?: string;
  is_published: boolean;
}

interface GrowthClientProps {
  locale: string;
  initialChannels: GrowthChannel[];
  initialPerformances: CrmAdPerformance[];
  initialPlans: ContentPlanPost[];
  systemStats: {
    totalRequests: number;
    totalDeals: number;
  };
}

export default function GrowthClient({
  locale,
  initialChannels,
  initialPerformances,
  initialPlans,
  systemStats
}: GrowthClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [channels, setChannels] = useState<GrowthChannel[]>(initialChannels);
  const [performances, setPerformances] = useState<CrmAdPerformance[]>(initialPerformances);
  const [plans, setPlans] = useState<ContentPlanPost[]>(initialPlans);
  const [isPending, startTransition] = useTransition();

  // Active platform for update form
  const [selectedPlatform, setSelectedPlatform] = useState('Facebook');

  // Override / Form States
  const [adForm, setAdForm] = useState({
    reach: 0,
    spend: 0,
    leads: 0,
    clicks: 0,
    best_post_desc: '',
    deals: 0,
    status: 'active'
  });

  const [showAddChannel, setShowAddChannel] = useState(false);
  const [channelForm, setChannelForm] = useState({
    name_en: '',
    name_ar: '',
    status: 'planned',
    cac_en: '',
    cac_ar: '',
    reach_en: '',
    reach_ar: '',
    tip_en: '',
    tip_ar: ''
  });

  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    day_number: 1,
    platform: 'facebook',
    hook_en: '',
    hook_ar: '',
    body_en: '',
    body_ar: '',
    image_prompt_en: '',
    image_prompt_ar: '',
    is_published: false
  });

  // Calculate CRM aggregate stats
  const totalSpend = performances.reduce((acc, p) => acc + Number(p.spend), 0);
  const totalLeads = performances.reduce((acc, p) => acc + p.leads, 0);
  const totalAdDeals = performances.reduce((acc, p) => acc + p.deals, 0);
  const averageCac = totalAdDeals > 0 ? Math.round(totalSpend / totalAdDeals) : 0;

  // Handle updates to CRM metrics
  const handleSaveAdPerformance = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          platform: selectedPlatform,
          ...adForm
        };
        await saveCrmAdPerformanceAction(payload, locale);
        setPerformances(prev =>
          prev.map(p =>
            p.platform === selectedPlatform ? { ...p, ...adForm } : p
          )
        );
        toast(isRTL ? 'تم حفظ أرقام الإعلان بنجاح' : 'CRM ad metrics saved!', { type: 'success', title: '📊' });
      } catch (err: any) {
        toast(err.message || 'Error saving metrics', { type: 'error' });
      }
    });
  };

  const handleSelectPlatformChange = (platformName: string) => {
    setSelectedPlatform(platformName);
    const existing = performances.find(p => p.platform === platformName);
    if (existing) {
      setAdForm({
        reach: existing.reach,
        spend: existing.spend,
        leads: existing.leads,
        clicks: existing.clicks,
        best_post_desc: existing.best_post_desc || '',
        deals: existing.deals,
        status: existing.status
      });
    } else {
      setAdForm({ reach: 0, spend: 0, leads: 0, clicks: 0, best_post_desc: '', deals: 0, status: 'active' });
    }
  };

  // Add Growth Channel
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveGrowthChannelAction(channelForm, locale);
        setChannels([...channels, { id: Math.random().toString(), ...channelForm }]);
        setShowAddChannel(false);
        setChannelForm({ name_en: '', name_ar: '', status: 'planned', cac_en: '', cac_ar: '', reach_en: '', reach_ar: '', tip_en: '', tip_ar: '' });
        toast(isRTL ? 'تم إضافة القناة بنجاح' : 'Channel added!', { type: 'success' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  const handleDeleteChannel = async (id: string) => {
    startTransition(async () => {
      try {
        await deleteGrowthChannelAction(id, locale);
        setChannels(channels.filter(c => c.id !== id));
        toast(isRTL ? 'تم حذف القناة' : 'Channel deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  // Save Content Post
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveGrowthContentPlanAction(planForm, locale);
        setPlans([...plans, { id: Math.random().toString(), ...planForm }]);
        setShowAddPlan(false);
        setPlanForm({ day_number: 1, platform: 'facebook', hook_en: '', hook_ar: '', body_en: '', body_ar: '', image_prompt_en: '', image_prompt_ar: '', is_published: false });
        toast(isRTL ? 'تم إضافة المنشور بنجاح' : 'Post added to plan!', { type: 'success' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  const handleDeletePlan = async (id: string) => {
    startTransition(async () => {
      try {
        await deleteGrowthContentPlanAction(id, locale);
        setPlans(plans.filter(p => p.id !== id));
        toast(isRTL ? 'تم حذف المنشور' : 'Post deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  return (
    <div className="growth-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .growth-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Growth Engine Card Panel */
        .panel-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 30px;
        }

        .growth-banner {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(20, 30, 20, 0.4) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 30px;
          text-align: center;
        }
        .banner-tag { font-size: 0.75rem; font-weight: 900; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 4px 12px; border-radius: 8px; display: inline-block; margin-bottom: 10px; }
        .banner-title { font-size: 1.4rem; font-weight: 900; color: white; margin: 0 0 6px; }
        .banner-desc { font-size: 0.9rem; color: rgba(255,255,255,0.6); margin: 0; }

        /* Channels List */
        .channels-list { display: flex; flex-direction: column; gap: 15px; }
        .channel-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 18px;
          padding: 20px;
          position: relative;
        }
        .channel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .channel-name { font-size: 1.15rem; font-weight: 900; color: white; margin: 0; }
        .channel-tag { font-size: 0.72rem; font-weight: 900; color: #10b981; background: rgba(16,185,129,0.1); padding: 3px 8px; border-radius: 6px; text-transform: uppercase; }
        .channel-tag.planned { color: #3b82f6; background: rgba(59,130,246,0.1); }
        .channel-tag.idea { color: #fbbf24; background: rgba(251,191,36,0.1); }
        
        .channel-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem; color: rgba(255,255,255,0.45); margin-bottom: 12px; }
        .channel-tip { font-size: 0.88rem; color: #10b981; font-weight: 700; margin: 0; display: flex; gap: 6px; align-items: flex-start; }

        /* CRM Section */
        .crm-banner {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(20, 20, 30, 0.4) 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 30px;
          text-align: center;
        }
        .crm-banner-title { font-size: 1.4rem; font-weight: 900; color: white; margin: 0 0 6px; }

        /* KPI Row */
        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .kpi-card { background: rgba(255, 255, 255, 0.015); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 16px; padding: 15px; text-align: center; }
        .kpi-val { font-size: 1.6rem; font-weight: 900; color: #6366f1; }
        .kpi-lbl { font-size: 0.72rem; color: rgba(255,255,255,0.45); margin-top: 4px; text-transform: uppercase; font-weight: 800; }

        /* Platform metrics grids */
        .platform-cards-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 35px; }
        .platform-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 20px; padding: 25px; }
        .platform-title-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 15px; }
        .platform-title { font-size: 1.25rem; font-weight: 950; color: white; margin: 0; }
        .platform-status-badge { font-size: 0.72rem; font-weight: 850; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .platform-status-badge.active { color: #10b981; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); }
        
        .metrics-subgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 15px; }
        .metric-subcard { background: rgba(255,255,255,0.015); padding: 10px 15px; border-radius: 12px; text-align: center; }
        .metric-subcard-val { font-size: 1.15rem; font-weight: 900; color: white; }
        .metric-subcard-lbl { font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 2px; }

        .best-post-box { background: rgba(99, 102, 241, 0.03); border: 1px solid rgba(99, 102, 241, 0.08); border-radius: 12px; padding: 12px 16px; font-size: 0.85rem; }
        .best-post-title { font-weight: 850; color: #818cf8; margin-bottom: 4px; }
        .best-post-text { color: rgba(255,255,255,0.7); margin: 0; line-height: 1.4; }

        /* Form Updates */
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input, .form-group select, .form-group textarea { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        
        .submit-btn { width: 100%; padding: 14px; background: #6366f1; color: white; border: none; font-weight: 950; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover { background: #4f46e5; }

        /* Content Plan Table list */
        .content-plan-list { display: flex; flex-direction: column; gap: 12px; }
        .plan-item { display: flex; gap: 20px; align-items: flex-start; padding: 16px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; position: relative; }
        .plan-day { font-size: 0.85rem; font-weight: 900; color: #10b981; background: rgba(16,185,129,0.1); padding: 4px 10px; border-radius: 8px; }
        .plan-info { flex: 1; }
        .plan-hook { font-size: 1rem; font-weight: 900; color: white; margin: 0 0 6px; }
        .plan-body { font-size: 0.88rem; color: rgba(255,255,255,0.6); margin: 0 0 8px; line-height: 1.4; }
        .plan-prompt { font-size: 0.8rem; color: #fbbf24; background: rgba(251,191,36,0.05); padding: 6px 12px; border-radius: 8px; margin: 0; }

        .btn-mini { padding: 4px 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 0.7rem; font-weight: 800; border-radius: 6px; cursor: pointer; }
        .btn-mini.delete { color: #ef4444; border-color: rgba(239,68,68,0.25); }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { width: 100%; max-width: 550px; background: #080c14; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 30px; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? '📢 قنوات النمو وإعلانات الـ CRM' : '📢 Growth Channels & CRM Ads'}</h1>
          <p className="subtitle">
            {isRTL ? 'إدارة قنوات الاستحواذ وتتبع أداء الإعلانات وحساب تكلفة العميل (CAC).' : 'Track user acquisition channels, CRM ad platform spend, and customer acquisition costs (CAC).'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* ── SECTION 1: GROWTH CHANNELS ─────────────────────────── */}
      <section className="panel-card">
        <div className="growth-banner">
          <span className="banner-tag">Growth Engine</span>
          <h2 className="banner-title">{isRTL ? 'كيف يأتي العملاء؟' : 'How Do Customers Arrive?'}</h2>
          <p className="banner-desc">
            {isRTL ? 'اختبر القنوات — ابنِ على ما يشتغل فقط.' : 'Test channels — build on what works.'}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button className="btn-mini" style={{ padding: '6px 12px' }} onClick={() => setShowAddChannel(true)}>+ Add Channel</button>
        </div>

        <div className="channels-list">
          {channels.map(ch => (
            <div key={ch.id} className="channel-card">
              <div className="card-actions" style={{ position: 'absolute', top: '20px', right: '20px' }}>
                <button className="btn-mini delete" onClick={() => handleDeleteChannel(ch.id)}>🗑️</button>
              </div>

              <div className="channel-header">
                <h3 className="channel-name">{isRTL ? ch.name_ar : ch.name_en}</h3>
                <span className={`channel-tag ${ch.status}`}>{ch.status}</span>
              </div>

              <div className="channel-meta-grid">
                <span>Reach: <strong>{isRTL ? ch.reach_ar : ch.reach_en}</strong></span>
                <span>CAC: <strong>{isRTL ? ch.cac_ar : ch.cac_en}</strong></span>
              </div>

              <p className="channel-tip">
                <span>💡</span>
                <span>{isRTL ? ch.tip_ar : ch.tip_en}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 2: CRM ADS ─────────────────────────────────── */}
      <section className="panel-card">
        <div className="crm-banner">
          <h2 className="crm-banner-title">{isRTL ? 'CRM الإعلانات 📊' : 'CRM Ads Platform 📊'}</h2>
          <p className="banner-desc">
            {isRTL ? 'قياس كل منصة — كل إعلان — كل جنيه.' : 'Measure every platform — every ad — every EGP.'}
          </p>
        </div>

        {/* KPI Panel */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-val">{totalSpend.toLocaleString()}</div>
            <div className="kpi-lbl">{isRTL ? 'إجمالي الإنفاق ج' : 'Total Spend EGP'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: '#10b981' }}>{totalLeads}</div>
            <div className="kpi-lbl">{isRTL ? 'إجمالي Leads' : 'Total Leads'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: '#fbbf24' }}>{totalAdDeals}</div>
            <div className="kpi-lbl">{isRTL ? 'صفقات الإعلانات' : 'Deals from Ads'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: '#ef4444' }}>{averageCac}</div>
            <div className="kpi-lbl">{isRTL ? 'متوسط CAC ج' : 'Avg CAC EGP'}</div>
          </div>
        </div>

        {/* Channels Cards */}
        <div className="platform-cards-grid">
          {performances.map(perf => {
            const conversionRate = perf.leads > 0 ? Math.round((perf.deals / perf.leads) * 100) : 0;
            const singleCac = perf.deals > 0 ? Math.round(perf.spend / perf.deals) : 0;
            const ctrRate = perf.reach > 0 ? ((perf.clicks / perf.reach) * 100).toFixed(1) : '0';

            return (
              <div key={perf.id} className="platform-card">
                <header className="platform-title-row">
                  <h3 className="platform-title">{perf.platform}</h3>
                  <span className={`platform-status-badge ${perf.status === 'active' ? 'active' : ''}`}>
                    {perf.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'لم يبدأ' : 'Not Started')}
                  </span>
                </header>

                <div className="metrics-subgrid">
                  <div className="metric-subcard">
                    <div className="metric-subcard-val">{perf.reach.toLocaleString()}</div>
                    <div className="metric-subcard-lbl">Reach</div>
                  </div>
                  <div className="metric-subcard">
                    <div className="metric-subcard-val">{perf.spend.toLocaleString()} ج</div>
                    <div className="metric-subcard-lbl">{isRTL ? 'الإنفاق' : 'Spend'}</div>
                  </div>
                  <div className="metric-subcard">
                    <div className="metric-subcard-val">{perf.leads}</div>
                    <div className="metric-subcard-lbl">Leads</div>
                  </div>
                  <div className="metric-subcard">
                    <div className="metric-subcard-val">{perf.clicks}</div>
                    <div className="metric-subcard-lbl">Clicks</div>
                  </div>
                </div>

                <div className="metrics-subgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '12px', marginBottom: '15px' }}>
                  <div className="metric-subcard" style={{ background: 'transparent' }}>
                    <div className="metric-subcard-val" style={{ color: '#10b981' }}>{conversionRate}%</div>
                    <div className="metric-subcard-lbl">{isRTL ? 'تحويل' : 'Conversion'}</div>
                  </div>
                  <div className="metric-subcard" style={{ background: 'transparent' }}>
                    <div className="metric-subcard-val" style={{ color: '#ef4444' }}>{singleCac > 0 ? `${singleCac} ج` : '-'}</div>
                    <div className="metric-subcard-lbl">CAC</div>
                  </div>
                  <div className="metric-subcard" style={{ background: 'transparent' }}>
                    <div className="metric-subcard-val" style={{ color: '#fbbf24' }}>{perf.deals}</div>
                    <div className="metric-subcard-lbl">{isRTL ? 'صفقات' : 'Deals'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '12px', padding: '0 5px' }}>
                  <span>CTR: {ctrRate}%</span>
                  <span>AI Autopilot ready: 🤖 (Phase 13)</span>
                </div>

                {perf.best_post_desc && (
                  <div className="best-post-box">
                    <div className="best-post-title">⭐️ {isRTL ? 'أفضل منشور إعلاني:' : 'Top Performing Post:'}</div>
                    <p className="best-post-text">{perf.best_post_desc}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Updateplatform metrics form */}
        <div className="config-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
            ✏️ {isRTL ? 'إضافة / تحديث بيانات منصة إعلانية' : 'Add / Update Platform Ad Data'}
          </h3>
          <form onSubmit={handleSaveAdPerformance}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>{isRTL ? 'اختر المنصة' : 'Select Platform'}</label>
              <select value={selectedPlatform} onChange={e => handleSelectPlatformChange(e.target.value)}>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="Google Ads">Google Ads</option>
                <option value="TikTok">TikTok</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Reach</label>
                <input type="number" min={0} value={adForm.reach} onChange={e => setAdForm({ ...adForm, reach: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>{isRTL ? 'الإنفاق (جنيه مصري)' : 'Spend (EGP)'}</label>
                <input type="number" min={0} value={adForm.spend} onChange={e => setAdForm({ ...adForm, spend: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Leads</label>
                <input type="number" min={0} value={adForm.leads} onChange={e => setAdForm({ ...adForm, leads: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Clicks</label>
                <input type="number" min={0} value={adForm.clicks} onChange={e => setAdForm({ ...adForm, clicks: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>{isRTL ? 'الصفقات المكتملة من الإعلان' : 'Deals Achieved'}</label>
                <input type="number" min={0} value={adForm.deals} onChange={e => setAdForm({ ...adForm, deals: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>{isRTL ? 'حالة الحملة' : 'Ad Status'}</label>
                <select value={adForm.status} onChange={e => setAdForm({ ...adForm, status: e.target.value })}>
                  <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                  <option value="paused">{isRTL ? 'موقوف مؤقتاً' : 'Paused'}</option>
                  <option value="not_started">{isRTL ? 'لم تبدأ' : 'Not Started'}</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>{isRTL ? 'وصف أفضل بوست / محتوى أداءً' : 'Best Performing Post Copy/Description'}</label>
              <textarea rows={2} value={adForm.best_post_desc} onChange={e => setAdForm({ ...adForm, best_post_desc: e.target.value })} placeholder="..." />
            </div>

            <button type="submit" disabled={isPending} className="submit-btn">{isPending ? 'Saving...' : (isRTL ? 'حفظ الأرقام 💾' : 'Save Metrics 💾')}</button>
          </form>
        </div>
      </section>

      {/* ── SECTION 3: CONTENT PLAN ───────────────────────────── */}
      <section className="panel-card">
        <div className="crm-banner" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.04) 0%, rgba(20,20,10,0.4) 100%)', borderColor: 'rgba(251,191,36,0.15)' }}>
          <h2 className="crm-banner-title" style={{ color: '#fbbf24' }}>📅 {isRTL ? 'خطة المحتوى — 6 أشهر يوم بيوم' : 'Content Plan — 6 Months Day by Day'}</h2>
          <p className="banner-desc">
            {isRTL ? 'كل منشور: Hook + نص + Prompt للصورة + المنصة واليوم.' : 'Every post: Hook + Copy + image/video Prompt + platform and Day.'}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button className="btn-mini" style={{ padding: '6px 12px' }} onClick={() => setShowAddPlan(true)}>+ Add Post Day</button>
        </div>

        <div className="content-plan-list">
          {plans.map(p => (
            <div key={p.id} className="plan-item">
              <div className="card-actions" style={{ position: 'absolute', top: '16px', right: '16px' }}>
                <button className="btn-mini delete" onClick={() => handleDeletePlan(p.id)}>🗑️</button>
              </div>

              <span className="plan-day">{isRTL ? `اليوم ${p.day_number}` : `Day ${p.day_number}`}</span>
              
              <div className="plan-info">
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#6366f1' }}>{p.platform}</span>
                <h4 className="plan-hook">🪝 {isRTL ? p.hook_ar : p.hook_en}</h4>
                <p className="plan-body">{isRTL ? p.body_ar : p.body_en}</p>
                {p.image_prompt_en && (
                  <p className="plan-prompt">
                    🎨 <strong>Prompt:</strong> {isRTL ? p.image_prompt_ar : p.image_prompt_en}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal Add Channel */}
      {showAddChannel && (
        <div className="modal-overlay" onClick={() => setShowAddChannel(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              🚀 {isRTL ? 'إضافة قناة نمو جديدة' : 'Add Growth Channel'}
            </h3>
            <form onSubmit={handleSaveChannel}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
                  <input type="text" required value={channelForm.name_en} onChange={e => setChannelForm({ ...channelForm, name_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                  <input type="text" required value={channelForm.name_ar} onChange={e => setChannelForm({ ...channelForm, name_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الحالة' : 'Status'}</label>
                  <select value={channelForm.status} onChange={e => setChannelForm({ ...channelForm, status: e.target.value })}>
                    <option value="running">Running</option>
                    <option value="planned">Planned</option>
                    <option value="idea">Idea</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'تكلفة الاكتساب بالإنجليزية' : 'CAC (English)'}</label>
                  <input type="text" required value={channelForm.cac_en} onChange={e => setChannelForm({ ...channelForm, cac_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'تكلفة الاكتساب بالعربية' : 'CAC (Arabic)'}</label>
                  <input type="text" required value={channelForm.cac_ar} onChange={e => setChannelForm({ ...channelForm, cac_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصول بالإنجليزية' : 'Reach (English)'}</label>
                  <input type="text" required value={channelForm.reach_en} onChange={e => setChannelForm({ ...channelForm, reach_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصول بالعربية' : 'Reach (Arabic)'}</label>
                  <input type="text" required value={channelForm.reach_ar} onChange={e => setChannelForm({ ...channelForm, reach_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'النصيحة بالإنجليزية' : 'Tip/Strategy (English)'}</label>
                  <input type="text" required value={channelForm.tip_en} onChange={e => setChannelForm({ ...channelForm, tip_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'النصيحة بالعربية' : 'Tip/Strategy (Arabic)'}</label>
                  <input type="text" required value={channelForm.tip_ar} onChange={e => setChannelForm({ ...channelForm, tip_ar: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button type="submit" className="submit-btn" style={{ flex: 1 }}>Save 💾</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', flex: 1 }} onClick={() => setShowAddChannel(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Plan Post */}
      {showAddPlan && (
        <div className="modal-overlay" onClick={() => setShowAddPlan(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              📅 {isRTL ? 'إضافة يوم منشور جديد' : 'Add Content Plan Day'}
            </h3>
            <form onSubmit={handleSavePlan}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'رقم اليوم' : 'Day Number'}</label>
                  <input type="number" required min={1} value={planForm.day_number} onChange={e => setPlanForm({ ...planForm, day_number: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'المنصة' : 'Platform'}</label>
                  <select value={planForm.platform} onChange={e => setPlanForm({ ...planForm, platform: e.target.value })}>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الـ Hook بالإنجليزية' : 'Hook (English)'}</label>
                  <input type="text" required value={planForm.hook_en} onChange={e => setPlanForm({ ...planForm, hook_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الـ Hook بالعربية' : 'Hook (Arabic)'}</label>
                  <input type="text" required value={planForm.hook_ar} onChange={e => setPlanForm({ ...planForm, hook_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'محتوى المنشور بالإنجليزية' : 'Body Copy (English)'}</label>
                  <textarea rows={3} required value={planForm.body_en} onChange={e => setPlanForm({ ...planForm, body_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'محتوى المنشور بالعربية' : 'Body Copy (Arabic)'}</label>
                  <textarea rows={3} required value={planForm.body_ar} onChange={e => setPlanForm({ ...planForm, body_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'وصف صورة الـ Prompt بالإنجليزية' : 'Image Prompt (English)'}</label>
                  <input type="text" value={planForm.image_prompt_en} onChange={e => setPlanForm({ ...planForm, image_prompt_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'وصف صورة الـ Prompt بالعربية' : 'Image Prompt (Arabic)'}</label>
                  <input type="text" value={planForm.image_prompt_ar} onChange={e => setPlanForm({ ...planForm, image_prompt_ar: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button type="submit" className="submit-btn" style={{ flex: 1 }}>Save 💾</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', flex: 1 }} onClick={() => setShowAddPlan(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
