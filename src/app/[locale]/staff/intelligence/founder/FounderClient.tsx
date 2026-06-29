'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  saveFounderWeeklyReviewAction,
  saveFounderAccountabilityItemAction,
  deleteFounderAccountabilityItemAction
} from '../customers/actions';

interface FounderLog {
  id: string;
  week_start_date: string;
  hours_built: number;
  customers_contacted: number;
  merchants_contacted: number;
  biggest_achievement?: string;
  blockers?: string;
  distraction_score: number;
  progress_comparison?: string;
  top_achievements?: string;
  not_done?: string;
  distracted_from_phase?: string;
  next_week_focus?: string;
  progress_rating?: number;
  created_at: string;
  staff_members?: {
    full_name: string;
  };
}

interface AccountabilityItem {
  id: string;
  category: string;
  title_en: string;
  title_ar: string;
  details_en?: string;
  details_ar?: string;
  meta_tag?: string;
}

interface FounderClientProps {
  locale: string;
  monthlyMetrics: {
    customerInterviews: number;
    merchantStudies: number;
    totalRequests: number;
    activeScouts: number;
    totalSnapshots: number;
  };
  pastLogs: FounderLog[];
  accountabilityItems: AccountabilityItem[];
  activePhase: {
    phase_number: number;
    title_en: string;
    title_ar: string;
  };
}

type TabType = 'categories' | 'learnings' | 'data_moat' | 'lifecycle' | 'growth' | 'north_star' | 'review' | 'prompts' | 'risks' | 'ideas';

export default function FounderClient({
  locale,
  monthlyMetrics,
  pastLogs: initialLogs,
  accountabilityItems: initialItems,
  activePhase
}: FounderClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [pastLogs, setPastLogs] = useState<FounderLog[]>(initialLogs);
  const [items, setItems] = useState<AccountabilityItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [isPending, startTransition] = useTransition();

  // Tab Labels mapping
  const tabsList: { id: TabType; label_en: string; label_ar: string; icon: string }[] = [
    { id: 'categories', label_en: 'Categories', label_ar: 'الاقسام', icon: '📁' },
    { id: 'learnings', label_en: 'Learnings', label_ar: 'Learnings 📚', icon: '📚' },
    { id: 'data_moat', label_en: 'Data Moat', label_ar: 'Data Moat 🌐', icon: '🌐' },
    { id: 'lifecycle', label_en: 'Lifecycle', label_ar: 'Lifecycle 🔄', icon: '🔄' },
    { id: 'growth', label_en: 'Growth', label_ar: 'Growth 🚀', icon: '🚀' },
    { id: 'north_star', label_en: 'North Star', label_ar: 'North Star ⭐️', icon: '⭐️' },
    { id: 'review', label_en: 'Review 📓', label_ar: 'Review 📓', icon: '📓' },
    { id: 'prompts', label_en: 'Prompts', label_ar: 'Prompts 💬', icon: '💬' },
    { id: 'risks', label_en: 'Risks ⚠️', label_ar: 'Risks ⚠️', icon: '⚠️' },
    { id: 'ideas', label_en: 'Ideas 💡', label_ar: 'Ideas 💡', icon: '💡' }
  ];

  // Forms States
  const [reviewForm, setReviewForm] = useState({
    hours_built: 0,
    customers_contacted: 0,
    merchants_contacted: 0,
    biggest_achievement: '',
    blockers: '',
    distraction_score: 1,
    progress_comparison: 'yes_better',
    top_achievements: '',
    not_done: '',
    distracted_from_phase: '',
    next_week_focus: '',
    progress_rating: 5
  });

  const [itemForm, setItemForm] = useState({
    title_en: '',
    title_ar: '',
    details_en: '',
    details_ar: '',
    meta_tag: ''
  });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);

  // Submit Weekly Review Log
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveFounderWeeklyReviewAction(reviewForm, locale);
        const newLog: FounderLog = {
          id: Math.random().toString(),
          week_start_date: new Date().toISOString().split('T')[0],
          ...reviewForm,
          created_at: new Date().toISOString()
        };
        setPastLogs([newLog, ...pastLogs]);
        setReviewForm({
          hours_built: 0,
          customers_contacted: 0,
          merchants_contacted: 0,
          biggest_achievement: '',
          blockers: '',
          distraction_score: 1,
          progress_comparison: 'yes_better',
          top_achievements: '',
          not_done: '',
          distracted_from_phase: '',
          next_week_focus: '',
          progress_rating: 5
        });
        toast(isRTL ? 'تم حفظ مراجعتك الأسبوعية بنجاح!' : 'Weekly Review saved!', { type: 'success', title: '💾' });
      } catch (err: any) {
        toast(err.message || 'Error saving review', { type: 'error' });
      }
    });
  };

  // Submit accountability item (Category/Risk/Idea/Learning/etc.)
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          id: editingItemId || undefined,
          category: activeTab,
          ...itemForm
        };
        await saveFounderAccountabilityItemAction(payload, locale);

        if (editingItemId) {
          setItems(prev => prev.map(it => it.id === editingItemId ? { ...it, ...itemForm } : it));
          setEditingItemId(null);
        } else {
          setItems([...items, { id: Math.random().toString(), category: activeTab, ...itemForm }]);
          setShowItemForm(false);
        }

        setItemForm({
          title_en: '',
          title_ar: '',
          details_en: '',
          details_ar: '',
          meta_tag: ''
        });
        toast(isRTL ? 'تم حفظ البند بنجاح' : 'Item saved successfully!', { type: 'success', title: '✨' });
      } catch (err: any) {
        toast(err.message || 'Error saving item', { type: 'error' });
      }
    });
  };

  // Delete Accountability Item
  const handleDeleteItem = async (id: string) => {
    startTransition(async () => {
      try {
        await deleteFounderAccountabilityItemAction(id, locale);
        setItems(items.filter(it => it.id !== id));
        toast(isRTL ? 'تم حذف البند' : 'Item deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error deleting item', { type: 'error' });
      }
    });
  };

  const openEditItem = (it: AccountabilityItem) => {
    setEditingItemId(it.id);
    setItemForm({
      title_en: it.title_en,
      title_ar: it.title_ar,
      details_en: it.details_en || '',
      details_ar: it.details_ar || '',
      meta_tag: it.meta_tag || ''
    });
  };

  const activeTabItems = items.filter(it => it.category === activeTab);
  const activePhaseTitle = isRTL 
    ? `Phase ${activePhase.phase_number}: ${activePhase.title_ar}` 
    : `Phase ${activePhase.phase_number}: ${activePhase.title_en}`;

  return (
    <div className="founder-dashboard" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .founder-dashboard { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Navigation Tabs matching mockup style */
        .tabs-header { display: flex; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 15px; margin-bottom: 30px; }
        .tab-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.55); font-weight: 800; font-size: 0.85rem; cursor: pointer; border-radius: 10px; transition: all 0.2s; }
        .tab-btn:hover { background: rgba(255,255,255,0.02); color: white; }
        .tab-btn.active { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        
        /* Card Panels */
        .founder-card { background: rgba(255, 255, 255, 0.015); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 24px; padding: 30px; margin-bottom: 30px; }
        .card-heading { font-size: 1.25rem; font-weight: 900; color: white; margin: 0 0 20px; display: flex; justify-content: space-between; align-items: center; }

        /* Form groups */
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.85rem; font-weight: 850; color: rgba(255,255,255,0.7); }
        .form-group input, .form-group textarea, .form-group select { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px; color: white; font-size: 0.92rem; }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #3b82f6; outline: none; }
        
        .submit-btn { width: 100%; padding: 16px; background: #3b82f6; color: white; border: none; border-radius: 16px; font-weight: 950; font-size: 1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.2); }
        .submit-btn:hover { background: #2563eb; transform: translateY(-1px); }

        /* List Items Cards styling */
        .items-list { display: flex; flex-direction: column; gap: 15px; }
        .item-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 18px; padding: 20px; position: relative; }
        .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .item-title { font-size: 1.1rem; font-weight: 900; color: white; margin: 0; }
        .item-meta { font-size: 0.75rem; font-weight: 850; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 3px 8px; border-radius: 6px; }
        .item-details { font-size: 0.88rem; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.5; }

        /* Rating indicator */
        .progress-indicator { display: flex; gap: 4px; margin-top: 10px; }
        .rating-bar { flex: 1; height: 10px; border-radius: 3px; background: rgba(255,255,255,0.05); }
        .rating-bar.filled { background: #10b981; }

        /* Review History logs styling */
        .logs-wrapper { margin-top: 40px; }
        .log-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 20px; padding: 25px; margin-bottom: 20px; }
        .log-meta { display: flex; justify-content: space-between; font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 15px; }
        .log-question { font-size: 0.9rem; font-weight: 850; color: rgba(255,255,255,0.55); margin: 0 0 4px; }
        .log-answer { font-size: 0.95rem; color: white; margin: 0 0 15px; font-weight: 700; }
        
        .stat-badge { font-size: 0.75rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'لوحة تحكم المؤسس 👤' : "Founder's accountability"}</h1>
          <p className="subtitle">
            {isRTL ? 'متابعة الخطط الإستراتيجية والأسبوعية والمحاسبة الذاتية للمشروع.' : 'Strategic planning, weekly accountability logs, and focus index.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Tabs Header navigation menu */}
      <nav className="tabs-header flex overflow-x-auto scrollbar-hide whitespace-nowrap">
        {tabsList.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn shrink-0 ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setShowItemForm(false); setEditingItemId(null); }}
          >
            <span>{tab.icon}</span>
            <span>{isRTL ? tab.label_ar : tab.label_en}</span>
          </button>
        ))}
      </nav>

      {/* ── REVIEW TAB 📓 ─────────────────────────────────────── */}
      {activeTab === 'review' && (
        <div className="tab-pane">
          {/* Live Operational Metrics Grid */}
          <div className="founder-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(15, 23, 42, 0.6) 100%)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
            <h3 className="card-heading">📈 {isRTL ? 'مؤشرات الأداء التشغيلية الفورية' : 'Live Operational KPIs'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginTop: '15px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#60a5fa' }}>{monthlyMetrics.totalRequests}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 800 }}>{isRTL ? 'إجمالي الطلبات' : 'Total Requests'}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#a78bfa' }}>{monthlyMetrics.activeScouts}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 800 }}>{isRTL ? 'المناديب النشطين' : 'Active Scouts'}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#f59e0b' }}>{monthlyMetrics.totalSnapshots}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 800 }}>{isRTL ? 'العروض المرشحة' : 'Sourced Options'}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#10b981' }}>{monthlyMetrics.customerInterviews}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 800 }}>{isRTL ? 'مقابلات العملاء' : 'Interviews'}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#ec4899' }}>{monthlyMetrics.merchantStudies}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 800 }}>{isRTL ? 'دراسات التجار' : 'Merchant Studies'}</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleReviewSubmit} className="founder-card">
            <h3 className="card-heading">{isRTL ? 'المراجعة الأسبوعية 📓' : 'Weekly Review 📓'}</h3>
            
            <div className="form-grid">
              {/* Question 1 */}
              <div className="form-group">
                <label>1. {isRTL ? 'ما هي أهم 3 أشياء حققتها هذا الأسبوع؟' : 'What are the top 3 things you achieved this week?'}</label>
                <textarea rows={3} required value={reviewForm.top_achievements} onChange={e => setReviewForm({ ...reviewForm, top_achievements: e.target.value })} placeholder="..." />
              </div>

              {/* Question 2 */}
              <div className="form-group">
                <label>2. {isRTL ? 'ما الذي لم تفعله؟ ولماذا؟' : 'What did you NOT do? and why?'}</label>
                <textarea rows={3} required value={reviewForm.not_done} onChange={e => setReviewForm({ ...reviewForm, not_done: e.target.value })} placeholder="..." />
              </div>

              {/* Question 3 */}
              <div className="form-group">
                <label>3. {isRTL ? `هل تشتت عن ${activePhaseTitle}؟` : `Were you distracted from ${activePhaseTitle}?`}</label>
                <textarea rows={2} required value={reviewForm.distracted_from_phase} onChange={e => setReviewForm({ ...reviewForm, distracted_from_phase: e.target.value })} placeholder="..." />
              </div>

              {/* Question 4 */}
              <div className="form-group">
                <label>4. {isRTL ? 'ما هو أهم شيء الأسبوع القادم؟' : 'What is the most important focus for next week?'}</label>
                <textarea rows={2} required value={reviewForm.next_week_focus} onChange={e => setReviewForm({ ...reviewForm, next_week_focus: e.target.value })} placeholder="..." />
              </div>

              {/* Question 5 */}
              <div className="form-group">
                <label>5. {isRTL ? 'من 1 إلى 10 – كيف تقيّم تقدمك الإجمالي؟' : 'From 1 to 10 – Rate your overall progress?'}</label>
                <select value={reviewForm.progress_rating} onChange={e => setReviewForm({ ...reviewForm, progress_rating: Number(e.target.value) })}>
                  {[1,2,3,4,5,6,7,8,9,10].map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              {/* Optional metrics to remain functional with legacy data structures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '10px' }}>
                <div className="form-group">
                  <label>{isRTL ? 'ساعات البناء' : 'Building Hours'}</label>
                  <input type="number" min={0} value={reviewForm.hours_built} onChange={e => setReviewForm({ ...reviewForm, hours_built: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'مقابلات عملاء' : 'Customer Spoken'}</label>
                  <input type="number" min={0} value={reviewForm.customers_contacted} onChange={e => setReviewForm({ ...reviewForm, customers_contacted: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'مقابلات تجار' : 'Merchant Spoken'}</label>
                  <input type="number" min={0} value={reviewForm.merchants_contacted} onChange={e => setReviewForm({ ...reviewForm, merchants_contacted: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isPending} className="submit-btn" style={{ marginTop: '25px' }}>
              {isPending ? 'Saving...' : (isRTL ? 'حفظ 💾' : 'Save Review 💾')}
            </button>
          </form>

          {/* Past logs list */}
          <div className="logs-wrapper">
            <h3 className="card-heading">{isRTL ? 'آخر المراجعات والأداء' : 'Past Reviews & Logs'}</h3>
            {pastLogs.length === 0 ? (
              <p style={{ fontStyle: 'italic', textAlign: 'center', opacity: 0.4, margin: '30px 0' }}>
                {isRTL ? 'لا توجد مراجعات بعد' : 'No reviews saved yet.'}
              </p>
            ) : (
              <div className="logs-list">
                {pastLogs.map(log => (
                  <div key={log.id} className="log-card">
                    <div className="log-meta">
                      <span>📆 {log.week_start_date}</span>
                      <span className="stat-badge">🛠️ {log.hours_built}h | 👥 {log.customers_contacted} | 🏪 {log.merchants_contacted}</span>
                      <span>⭐️ Progress: {log.progress_rating || 5}/10</span>
                    </div>

                    <p className="log-question">1. {isRTL ? 'أهم 3 إنجازات:' : 'Top 3 Achievements:'}</p>
                    <p className="log-answer">{log.top_achievements || log.biggest_achievement}</p>

                    <p className="log-question">2. {isRTL ? 'ما لم يتم إنجازه:' : 'Not Done:'}</p>
                    <p className="log-answer">{log.not_done || log.blockers}</p>

                    <p className="log-question">3. {isRTL ? 'التشتت عن الخطة والمرحلة:' : 'Distraction from phase:'}</p>
                    <p className="log-answer">{log.distracted_from_phase || `Distraction Level: ${log.distraction_score}/10`}</p>

                    <p className="log-question">4. {isRTL ? 'تركيز الأسبوع القادم:' : 'Next week focus:'}</p>
                    <p className="log-answer">{log.next_week_focus || '...'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STRATEGY / METADATA TABS (Categories, Learnings, Moats, Lifecycle, Growth, North star, etc) ── */}
      {activeTab !== 'review' && (
        <div className="tab-pane">
          <div className="founder-card">
            <div className="card-heading">
              <span>{isRTL ? tabsList.find(t => t.id === activeTab)?.label_ar : tabsList.find(t => t.id === activeTab)?.label_en}</span>
              {!showItemForm && !editingItemId && (
                <button className="btn-mini" style={{ padding: '6px 12px' }} onClick={() => setShowItemForm(true)}>+ Add Note</button>
              )}
            </div>

            {/* Form Add/Edit */}
            {(showItemForm || editingItemId) && (
              <form onSubmit={handleItemSubmit} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '25px', marginBottom: '25px' }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{isRTL ? 'العنوان بالإنجليزية' : 'Title (English)'}</label>
                    <input type="text" required value={itemForm.title_en} onChange={e => setItemForm({ ...itemForm, title_en: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'العنوان بالعربية' : 'Title (Arabic)'}</label>
                    <input type="text" required value={itemForm.title_ar} onChange={e => setItemForm({ ...itemForm, title_ar: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'التفاصيل بالإنجليزية' : 'Details (English)'}</label>
                    <textarea rows={3} value={itemForm.details_en} onChange={e => setItemForm({ ...itemForm, details_en: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'التفاصيل بالعربية' : 'Details (Arabic)'}</label>
                    <textarea rows={3} value={itemForm.details_ar} onChange={e => setItemForm({ ...itemForm, details_ar: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'وسم تعريفي / حالة' : 'Meta Tag / Status (e.g. high, pending, solved)'}</label>
                    <input type="text" value={itemForm.meta_tag} onChange={e => setItemForm({ ...itemForm, meta_tag: e.target.value })} />
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '15px' }}>
                  <button type="submit" disabled={isPending} className="btn-mini" style={{ background: '#3b82f6', color: 'white', padding: '8px 16px' }}>
                    {isPending ? 'Saving...' : 'Save 💾'}
                  </button>
                  <button type="button" className="btn-mini" onClick={() => { setShowItemForm(false); setEditingItemId(null); setItemForm({ title_en: '', title_ar: '', details_en: '', details_ar: '', meta_tag: '' }); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="items-list">
              {activeTabItems.map(item => (
                <div key={item.id} className="item-card">
                  <div className="card-actions">
                    <button className="btn-mini" onClick={() => openEditItem(item)}>✏️</button>
                    <button className="btn-mini delete" onClick={() => handleDeleteItem(item.id)}>🗑️</button>
                  </div>

                  <div className="item-header">
                    <h4 className="item-title">{isRTL ? item.title_ar : item.title_en}</h4>
                    {item.meta_tag && <span className="item-meta">{item.meta_tag}</span>}
                  </div>

                  <p className="item-details">{isRTL ? item.details_ar : item.details_en}</p>
                </div>
              ))}

              {activeTabItems.length === 0 && (
                <p style={{ fontStyle: 'italic', textAlign: 'center', opacity: 0.4, padding: '20px 0' }}>
                  {isRTL ? 'لا توجد ملاحظات بعد في هذا القسم.' : 'No notes registered in this section yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
