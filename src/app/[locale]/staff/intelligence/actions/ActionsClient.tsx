'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { toggleActionStepAction } from '../customers/actions';

interface ActionStep {
  id: string;
  step_number: number;
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  metric_type: string;
  target_count: number;
  xp_reward: number;
  is_completed_manual: boolean;
}

interface ActionsClientProps {
  locale: string;
  initialSteps: ActionStep[];
  actualMetrics: {
    merchants: number;
    discovery: number;
    requests: number;
    deals: number;
    merchant_discovery: number;
  };
}

export default function ActionsClient({
  locale,
  initialSteps,
  actualMetrics
}: ActionsClientProps) {
  const isRTL = locale === 'ar';
  const [steps, setSteps] = useState<ActionStep[]>(initialSteps);
  const [isPending, startTransition] = useTransition();

  // Helper to determine if step is completed (either manually or dynamically)
  const isStepCompleted = (step: ActionStep) => {
    if (step.metric_type === 'manual') {
      return step.is_completed_manual;
    }
    const currentCount = getStepCurrentCount(step);
    return currentCount >= step.target_count;
  };

  // Helper to get actual count for a step
  const getStepCurrentCount = (step: ActionStep) => {
    switch (step.metric_type) {
      case 'merchants_count':
        return actualMetrics.merchants;
      case 'discovery_count':
        return actualMetrics.discovery;
      case 'requests_count':
        return actualMetrics.requests;
      case 'deals_count':
        return actualMetrics.deals;
      case 'merchant_discovery_count':
        return actualMetrics.merchant_discovery;
      default:
        return 0;
    }
  };

  // Toggle manual task
  const handleToggleManual = (step: ActionStep) => {
    if (step.metric_type !== 'manual') return;

    const newStatus = !step.is_completed_manual;
    startTransition(async () => {
      try {
        await toggleActionStepAction(step.step_number, newStatus, locale);
        setSteps(prev =>
          prev.map(s =>
            s.step_number === step.step_number ? { ...s, is_completed_manual: newStatus } : s
          )
        );
      } catch (err: any) {
        alert(err.message || 'Error updating status');
      }
    });
  };

  // Calculate stats
  const completedSteps = steps.filter(isStepCompleted);
  const totalXp = completedSteps.reduce((acc, s) => acc + s.xp_reward, 0);
  const currentLevel = Math.floor(totalXp / 500) + 1;
  const xpInLevel = totalXp % 500;
  const levelProgressPct = (xpInLevel / 500) * 100;

  // Find the first incomplete step to display as the current focus step
  const currentFocusStep = steps.find(s => !isStepCompleted(s)) || steps[steps.length - 1];

  return (
    <div className="actions-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .actions-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 120px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Focus Hero Section matching mockup style */
        .focus-hero {
          background: linear-gradient(135deg, rgba(20, 35, 60, 0.4) 0%, rgba(10, 15, 30, 0.6) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 40px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .focus-hero::before {
          content: '';
          position: absolute;
          top: 0; right: 0; width: 150px; height: 150px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .focus-tag {
          font-size: 0.75rem;
          font-weight: 900;
          color: #60a5fa;
          background: rgba(59, 130, 246, 0.15);
          padding: 4px 12px;
          border-radius: 8px;
          display: inline-block;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .focus-title { font-size: 1.8rem; font-weight: 900; color: white; margin: 0 0 10px; }
        .focus-subtitle { font-size: 1.1rem; color: rgba(255,255,255,0.6); margin: 0; }

        /* List Title */
        .section-header { font-size: 1.1rem; font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.4); margin: 30px 0 15px; display: flex; align-items: center; justify-content: space-between; }
        .steps-count-badge { font-size: 0.8rem; background: rgba(255,255,255,0.04); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }

        /* Step List Item */
        .steps-container { display: flex; flex-direction: column; gap: 12px; }
        
        .step-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .step-item:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }
        .step-item.completed {
          background: rgba(16, 185, 129, 0.02);
          border-color: rgba(16, 185, 129, 0.12);
        }
        .step-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .step-title { font-size: 1.1rem; font-weight: 800; color: white; margin: 0; }
        .step-subtitle { font-size: 0.85rem; color: rgba(255,255,255,0.45); margin: 0; }

        .step-actions { display: flex; align-items: center; gap: 16px; }
        .step-xp { font-size: 0.8rem; font-weight: 850; color: #10b981; background: rgba(16, 185, 129, 0.08); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.12); }
        .step-progress-badge { font-size: 0.8rem; font-weight: 800; color: #60a5fa; background: rgba(59, 130, 246, 0.08); padding: 4px 8px; border-radius: 6px; }

        /* Checkbox wrapper matching mockup */
        .check-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }
        .check-circle.completed {
          background: #10b981;
          border-color: #10b981;
          color: white;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }
        .check-circle.manual:hover {
          border-color: #10b981;
          transform: scale(1.08);
        }
        .check-circle.dynamic {
          cursor: not-allowed;
          opacity: 0.85;
        }

        /* Fixed Level Bar at the bottom matching mockup */
        .level-progress-bar-fixed {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 72px;
          background: rgba(2, 6, 23, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.08);
          z-index: 1000;
          display: flex;
          align-items: center;
        }
        .level-bar-inner {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .level-xp-text {
          font-size: 0.9rem;
          font-weight: 900;
          color: white;
          white-space: nowrap;
        }
        .level-progress-track {
          flex: 1;
          height: 8px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .level-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%);
          border-radius: 4px;
          transition: width 0.4s ease;
        }
        .level-number-text {
          font-size: 0.9rem;
          font-weight: 900;
          color: #60a5fa;
          white-space: nowrap;
        }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'خطوات التنفيذ والتشغيل' : 'Execution Actions'}</h1>
          <p className="subtitle">
            {isRTL ? 'الخطوات التشغيلية البسيطة لبناء وانطلاق المشروع تدريجياً.' : 'Simple operational steps to execute and build the platform step by step.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Focus Step Hero */}
      {currentFocusStep && (
        <section className="focus-hero">
          <span className="focus-tag">
            {isRTL ? '🎯 الخطوة الحالية المستهدفة' : '🎯 Current Active Focus'}
          </span>
          <h2 className="focus-title">
            {isRTL ? currentFocusStep.title_ar : currentFocusStep.title_en}
          </h2>
          {currentFocusStep.subtitle_ar && (
            <p className="focus-subtitle">
              {isRTL ? currentFocusStep.subtitle_ar : currentFocusStep.subtitle_en}
            </p>
          )}
        </section>
      )}

      {/* Title */}
      <div className="section-header">
        <span>{isRTL ? 'الخطوات بالترتيب' : 'Steps in Order'}</span>
        <span className="steps-count-badge">
          {isRTL 
            ? `${completedSteps.length} / ${steps.length} مكتمل` 
            : `${completedSteps.length} / ${steps.length} Completed`}
        </span>
      </div>

      {/* List */}
      <div className="steps-container">
        {steps.map(st => {
          const completed = isStepCompleted(st);
          const currentCount = getStepCurrentCount(st);
          const isManual = st.metric_type === 'manual';

          return (
            <div key={st.id} className={`step-item ${completed ? 'completed' : ''}`}>
              <div className="step-info">
                <h3 className="step-title">
                  {st.step_number}. {isRTL ? st.title_ar : st.title_en}
                </h3>
                {st.subtitle_ar && (
                  <p className="step-subtitle">
                    {isRTL ? st.subtitle_ar : st.subtitle_en}
                  </p>
                )}
              </div>

              <div className="step-actions">
                {/* Reward XP */}
                <span className="step-xp">+{st.xp_reward} XP</span>

                {/* Progress Badge for Dynamic Tasks */}
                {!isManual && (
                  <span className="step-progress-badge">
                    {Math.min(st.target_count, currentCount)} / {st.target_count}
                  </span>
                )}

                {/* Circular checkbox matching mockup */}
                <div 
                  className={`check-circle ${completed ? 'completed' : ''} ${isManual ? 'manual' : 'dynamic'}`}
                  onClick={() => isManual && handleToggleManual(st)}
                >
                  {completed ? '✓' : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed bottom level and XP progress bar (Whale Progress Bar) */}
      <div className="level-progress-bar-fixed">
        <div className="level-bar-inner">
          <span className="level-xp-text">XP {totalXp}</span>
          <div className="level-progress-track">
            <div className="level-progress-fill" style={{ width: `${levelProgressPct}%` }} />
          </div>
          <span className="level-number-text">
            {isRTL ? `المستوى ${currentLevel}` : `Level ${currentLevel}`}
          </span>
        </div>
      </div>
    </div>
  );
}
