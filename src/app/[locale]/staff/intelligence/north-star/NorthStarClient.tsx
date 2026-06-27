'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  saveNorthStarConfigAction,
  saveNorthStarGoalAction,
  deleteNorthStarGoalAction,
  toggleNorthStarGoalStatusAction
} from '../customers/actions';

interface NorthStarGoal {
  id: string;
  month_number: number;
  title_en: string;
  title_ar: string;
  target_deals: number;
  status: string; // 'achieved', 'pending'
}

interface ActionStep {
  id: string;
  step_number: number;
  title_en: string;
  title_ar: string;
  metric_type: string;
  target_count: number;
  xp_reward: number;
  is_completed_manual: boolean;
}

interface NorthStarClientProps {
  locale: string;
  actualMetrics: {
    requests: number;
    offers: number;
    accepted: number;
    completed: number;
  };
  overrides: {
    requests: number;
    offers: number;
    accepted: number;
    completed: number;
  };
  goals: NorthStarGoal[];
  actionSteps: ActionStep[];
}

export default function NorthStarClient({
  locale,
  actualMetrics,
  overrides,
  goals: initialGoals,
  actionSteps
}: NorthStarClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [goals, setGoals] = useState<NorthStarGoal[]>(initialGoals);
  const [isPending, startTransition] = useTransition();

  // Dialog & Form States
  const [overrideForm, setOverrideForm] = useState({
    requests: overrides.requests || 0,
    offers: overrides.offers || 0,
    accepted: overrides.accepted || 0,
    completed: overrides.completed || 0
  });

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    month_number: 1,
    title_en: '',
    title_ar: '',
    target_deals: 5,
    status: 'pending'
  });

  // Calculate values (use override if > 0, otherwise dynamic counts)
  const requestsVal = overrideForm.requests > 0 ? overrideForm.requests : actualMetrics.requests;
  const offersVal = overrideForm.offers > 0 ? overrideForm.offers : actualMetrics.offers;
  const acceptedVal = overrideForm.accepted > 0 ? overrideForm.accepted : actualMetrics.accepted;
  const completedVal = overrideForm.completed > 0 ? overrideForm.completed : actualMetrics.completed;

  // Conversion rates
  const offersPct = requestsVal > 0 ? Math.round((offersVal / requestsVal) * 100) : 0;
  const acceptedPct = offersVal > 0 ? Math.round((acceptedVal / offersVal) * 100) : 0;
  const completedPct = acceptedVal > 0 ? Math.round((completedVal / acceptedVal) * 100) : 0;

  // WHALE Progress Logic (tied to actionSteps)
  const getStepCurrentCount = (step: ActionStep) => {
    switch (step.metric_type) {
      case 'merchants_count':
        return actualMetrics.completed * 3; // Mocking or scaling
      case 'requests_count':
        return requestsVal;
      case 'deals_count':
        return completedVal;
      default:
        return 0;
    }
  };

  const isStepCompleted = (step: ActionStep) => {
    if (step.metric_type === 'manual') return step.is_completed_manual;
    return getStepCurrentCount(step) >= step.target_count;
  };

  const completedSteps = actionSteps.filter(isStepCompleted);
  const totalXp = completedSteps.reduce((acc, s) => acc + s.xp_reward, 0) || 350; // Fallback to mockup XP
  const currentLevel = Math.floor(totalXp / 500) + 1;
  const xpInLevel = totalXp % 500;
  const levelProgressPct = (xpInLevel / 500) * 100;

  // Handle saving overrides
  const handleSaveOverrides = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveNorthStarConfigAction({
          override_requests: overrideForm.requests,
          override_offers: overrideForm.offers,
          override_accepted: overrideForm.accepted,
          override_completed: overrideForm.completed
        }, locale);
        toast(isRTL ? 'تم حفظ الأرقام والمقاييس المستهدفة!' : 'North Star overrides saved!', { type: 'success', title: isRTL ? 'تم الحفظ 💾' : 'Saved 💾' });
      } catch (err: any) {
        toast(err.message || 'Error saving overrides', { type: 'error', title: 'Error' });
      }
    });
  };

  // Toggle goal status between achieved & pending
  const handleToggleGoalStatus = async (goal: NorthStarGoal) => {
    startTransition(async () => {
      try {
        await toggleNorthStarGoalStatusAction(goal.id, goal.status, locale);
        setGoals(prev =>
          prev.map(g =>
            g.id === goal.id
              ? { ...g, status: g.status === 'achieved' ? 'pending' : 'achieved' }
              : g
          )
        );
        toast(isRTL ? 'تم تحديث حالة الهدف' : 'Goal status updated', { type: 'success' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  // Save Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveNorthStarGoalAction(goalForm, locale);
        setGoals([...goals, { id: Math.random().toString(), ...goalForm }]);
        setShowAddGoal(false);
        setGoalForm({ month_number: 1, title_en: '', title_ar: '', target_deals: 5, status: 'pending' });
        toast(isRTL ? 'تم إضافة الهدف الشهري بنجاح' : 'Monthly goal added!', { type: 'success', title: '🎯' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  // Delete Goal
  const handleDeleteGoal = async (id: string) => {
    startTransition(async () => {
      try {
        await deleteNorthStarGoalAction(id, locale);
        setGoals(goals.filter(g => g.id !== id));
        toast(isRTL ? 'تم حذف الهدف' : 'Goal deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  return (
    <div className="north-star-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .north-star-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 120px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Metric Hero matching mockup */
        .metric-hero {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.06) 0%, rgba(20, 15, 10, 0.4) 100%);
          border: 1px solid rgba(251, 191, 36, 0.25);
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 35px;
          text-align: center;
        }
        .hero-label { font-size: 0.75rem; font-weight: 900; color: #fbbf24; text-transform: uppercase; background: rgba(251, 191, 36, 0.12); padding: 4px 12px; border-radius: 8px; display: inline-block; margin-bottom: 12px; }
        .hero-value { font-size: 2.8rem; font-weight: 950; color: white; margin: 0 0 8px; }
        .hero-value span { color: #fbbf24; }
        .hero-desc { font-size: 0.95rem; color: rgba(255, 255, 255, 0.6); margin: 0; font-weight: 700; }

        /* Conversion Funnel */
        .sec-title { font-size: 1.1rem; font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.45); margin: 30px 0 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; }
        
        .funnel-container { display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 20px; padding: 24px; }
        
        .funnel-row { display: grid; grid-template-columns: 2fr 1.5fr 3fr; gap: 15px; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.01); border-radius: 12px; }
        .funnel-lbl { font-weight: 900; font-size: 0.95rem; color: white; }
        .funnel-val { font-size: 1.5rem; font-weight: 950; color: #60a5fa; }
        .funnel-val.gold { color: #fbbf24; }
        .funnel-pct { font-size: 0.82rem; color: #10b981; font-weight: 800; background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 6px; display: inline-block; }

        /* Form Updates */
        .config-card { background: rgba(255,255,255,0.012); border: 1px solid rgba(255,255,255,0.04); border-radius: 20px; padding: 24px; }
        .inputs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        
        .submit-btn { width: 100%; padding: 14px; background: #fbbf24; color: #1e1b4b; border: none; font-weight: 950; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover { background: #f59e0b; }

        /* Monthly Goals */
        .goals-list { display: flex; flex-direction: column; gap: 10px; }
        .goal-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; transition: all 0.2s; }
        .goal-item:hover { border-color: rgba(255,255,255,0.08); }
        .goal-info { display: flex; flex-direction: column; }
        .goal-month { font-size: 0.75rem; font-weight: 900; color: #fbbf24; text-transform: uppercase; }
        .goal-title { font-size: 1.05rem; font-weight: 900; color: white; margin: 2px 0; }
        .goal-target { font-size: 0.85rem; color: rgba(255,255,255,0.5); }
        
        .status-badge { padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 850; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .status-badge.achieved { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.25); color: #10b981; }
        .status-badge.pending { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }

        .btn-mini { padding: 4px 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 0.7rem; font-weight: 800; border-radius: 6px; cursor: pointer; }
        .btn-mini.delete { color: #ef4444; border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.02); }

        /* Fixed bottom level progress bar (Whale Style) */
        .level-progress-bar-fixed {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(2, 6, 23, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 20px;
          z-index: 1000;
        }
        .level-bar-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .level-xp-text { font-size: 0.85rem; font-weight: 900; color: #10b981; min-width: 60px; }
        .level-progress-track { flex: 1; height: 10px; background: rgba(255, 255, 255, 0.08); border-radius: 5px; overflow: hidden; }
        .level-progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #3b82f6); border-radius: 5px; transition: width 0.4s ease; }
        .level-number-text { font-size: 0.85rem; font-weight: 900; color: white; min-width: 80px; text-align: right; }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-card { width: 100%; max-width: 500px; background: #080c14; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 30px; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? '⭐️ مؤشر الشمال والتحويل' : '⭐️ North Star Metric'}</h1>
          <p className="subtitle">
            {isRTL ? 'متابعة الصفقات المكتملة، ونسب نجاح قمع العمليات والأهداف الشهرية.' : 'Track completed deals, conversion funnel metrics, and monthly growth milestones.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Main Metric Hero */}
      <section className="metric-hero">
        <span className="hero-label">{isRTL ? 'مؤشر النجاح الأول' : 'NORTH STAR METRIC'}</span>
        <h2 className="hero-value">{isRTL ? 'العمليات المكتملة شهرياً:' : 'Completed Deals Monthly:'} <span>{completedVal}</span></h2>
        <p className="hero-desc">
          {isRTL ? 'الرقم الوحيد الذي لو ارتفع تعرف أن Findora تنجح.' : 'The single number that, if it goes up, guarantees Findora is winning.'}
        </p>
      </section>

      {/* Conversion Funnel */}
      <section className="timeline-section">
        <h3 className="sec-title">📊 {isRTL ? 'قمع التحويل' : 'Conversion Funnel'}</h3>
        <div className="funnel-container">
          <div className="funnel-row">
            <span className="funnel-lbl">{isRTL ? 'إجمالي الطلبات' : 'Requests Submitted'}</span>
            <span className="funnel-val">{requestsVal}</span>
            <span className="funnel-pct" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>Base (100%)</span>
          </div>

          <div className="funnel-row">
            <span className="funnel-lbl">{isRTL ? 'طلبات وصلها عروض' : 'Requests with Offers'}</span>
            <span className="funnel-val">{offersVal}</span>
            <span className="funnel-pct">⇅ {offersPct}% {isRTL ? 'تحويل' : 'Conversion'}</span>
          </div>

          <div className="funnel-row">
            <span className="funnel-lbl">{isRTL ? 'عروض مقبولة' : 'Accepted Offers'}</span>
            <span className="funnel-val">{acceptedVal}</span>
            <span className="funnel-pct">⇅ {acceptedPct}% {isRTL ? 'تحويل' : 'Conversion'}</span>
          </div>

          <div className="funnel-row">
            <span className="funnel-lbl">{isRTL ? 'صفقات مكتملة ⭐️' : 'Completed Deals ⭐️'}</span>
            <span className="funnel-val gold">{completedVal}</span>
            <span className="funnel-pct">⇅ {completedPct}% {isRTL ? 'تحويل' : 'Conversion'}</span>
          </div>
        </div>
      </section>

      {/* Update Numbers override form */}
      <section className="timeline-section">
        <h3 className="sec-title">✏️ {isRTL ? 'تحديث الأرقام والأهداف' : 'Override & Update Figures'}</h3>
        <form onSubmit={handleSaveOverrides} className="config-card">
          <div className="inputs-grid">
            <div className="form-group">
              <label>{isRTL ? 'إجمالي الطلبات (0 لاستخدام البيانات الحية)' : 'Total Requests (0 for Live data)'}</label>
              <input type="number" min={0} value={overrideForm.requests} onChange={e => setOverrideForm({ ...overrideForm, requests: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>{isRTL ? 'طلبات وصلها عروض' : 'Requests with Offers'}</label>
              <input type="number" min={0} value={overrideForm.offers} onChange={e => setOverrideForm({ ...overrideForm, offers: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>{isRTL ? 'عروض مقبولة' : 'Accepted Offers'}</label>
              <input type="number" min={0} value={overrideForm.accepted} onChange={e => setOverrideForm({ ...overrideForm, accepted: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>{isRTL ? 'صفقات مكتملة' : 'Completed Deals'}</label>
              <input type="number" min={0} value={overrideForm.completed} onChange={e => setOverrideForm({ ...overrideForm, completed: Number(e.target.value) })} />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="submit-btn">{isPending ? 'Saving...' : (isRTL ? 'تحديث الأرقام 💾' : 'Update Numbers 💾')}</button>
        </form>
      </section>

      {/* Monthly Goals milestones */}
      <section className="timeline-section">
        <div className="sec-title">
          <span>🎯 {isRTL ? 'الأهداف الشهرية' : 'Monthly Milestones'}</span>
          <button className="btn-mini" onClick={() => setShowAddGoal(true)}>+ Add Goal</button>
        </div>
        <div className="goals-list">
          {goals.map(goal => (
            <div key={goal.id} className="goal-item">
              <div className="goal-info">
                <span className="goal-month">{isRTL ? `شهر ${goal.month_number}` : `Month ${goal.month_number}`}</span>
                <span className="goal-title">{isRTL ? goal.title_ar : goal.title_en}</span>
                <span className="goal-target">{goal.target_deals} {isRTL ? 'صفقة مطلوبة' : 'deals target'}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span
                  className={`status-badge ${goal.status === 'achieved' ? 'achieved' : 'pending'}`}
                  onClick={() => handleToggleGoalStatus(goal)}
                >
                  {goal.status === 'achieved' ? (isRTL ? 'تم التحقيق ✅' : 'Achieved ✅') : (isRTL ? 'لم يحقق بعد 🔒' : 'Pending 🔒')}
                </span>
                <button className="btn-mini delete" onClick={() => handleDeleteGoal(goal.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fixed bottom Whale Level Progress Bar */}
      <div className="level-progress-bar-fixed">
        <div className="level-bar-inner">
          <span className="level-xp-text">XP {totalXp}</span>
          <div className="level-progress-track">
            <div className="level-progress-fill" style={{ width: `${levelProgressPct}%` }} />
          </div>
          <span className="level-number-text">
            {isRTL ? `المستوى ${currentLevel} (Whale OS)` : `Level ${currentLevel} (Whale OS)`}
          </span>
        </div>
      </div>

      {/* Modal Add Goal */}
      {showAddGoal && (
        <div className="modal-overlay" onClick={() => setShowAddGoal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              🎯 {isRTL ? 'إضافة هدف شهري جديد' : 'Add Monthly Goal'}
            </h3>
            <form onSubmit={handleSaveGoal}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'رقم الشهر' : 'Month Number'}</label>
                  <input type="number" required min={1} value={goalForm.month_number} onChange={e => setGoalForm({ ...goalForm, month_number: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالإنجليزية' : 'Title (English)'}</label>
                  <input type="text" required value={goalForm.title_en} onChange={e => setGoalForm({ ...goalForm, title_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالعربية' : 'Title (Arabic)'}</label>
                  <input type="text" required value={goalForm.title_ar} onChange={e => setGoalForm({ ...goalForm, title_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'عدد الصفقات المستهدفة' : 'Target Deals'}</label>
                  <input type="number" required min={1} value={goalForm.target_deals} onChange={e => setGoalForm({ ...goalForm, target_deals: Number(e.target.value) })} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button type="submit" className="submit-btn" style={{ flex: 1 }}>Save 💾</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', flex: 1 }} onClick={() => setShowAddGoal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
