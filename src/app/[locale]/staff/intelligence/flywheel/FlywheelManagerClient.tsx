'use client';

import React, { useState, useTransition } from 'react';
import {
  createFlywheelStageAction,
  updateFlywheelStageAction,
  deleteFlywheelStageAction,
  reorderFlywheelStagesAction
} from './actions';

interface FlywheelStage {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  metric_key: string;
  current_value: number;
  target_value: number;
  display_order: number;
  live_value?: number;
}

interface FlywheelManagerClientProps {
  locale: string;
  isAdmin: boolean;
  initialStages: FlywheelStage[];
}

export default function FlywheelManagerClient({
  locale,
  isAdmin,
  initialStages
}: FlywheelManagerClientProps) {
  const isRTL = locale === 'ar';
  const [stages, setStages] = useState<FlywheelStage[]>(initialStages);
  const [isPending, startTransition] = useTransition();

  // Create form states
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newMetricKey, setNewMetricKey] = useState('');
  const [newTargetValue, setNewTargetValue] = useState(100);

  // Edit target states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTargetValue, setEditTargetValue] = useState(100);

  // Calculate live average progress
  const totalProgress = stages.reduce((acc, stage) => {
    const liveVal = stage.live_value ?? stage.current_value;
    const progress = Math.min(100, Math.round((liveVal / (stage.target_value || 1)) * 100));
    return acc + progress;
  }, 0);

  const averageProgress = stages.length > 0 ? Math.round(totalProgress / stages.length) : 0;

  // Determine current phase & recommendations
  let currentPhase = 'Phase 0';
  let phaseLabel = isRTL ? 'تهيئة الاستحواذ والانتشار' : 'Acquisition Warmup';
  let tips: string[] = [];

  if (averageProgress < 30) {
    tips = isRTL
      ? [
          'ركز على جذب المناديب (Scouts) لتسجيل عملاء جدد وتثبيت الحضور.',
          'تواصل مع تجار السلع الأساسية المضمونة لتوفير العروض الأولى.'
        ]
      : [
          'Focus on recruiting scouts to onboard early customers and establish trust.',
          'Partner with basic grocery/appliance merchants to offer initial deals.'
        ];
  } else if (averageProgress >= 30 && averageProgress < 50) {
    currentPhase = 'Phase 1';
    phaseLabel = isRTL ? 'الانطلاق الفعلي وتثبيت الطلب' : 'Initial Traction';
    tips = isRTL
      ? [
          'تفعيل محرك الألعاب (Gamification) لزيادة نشاط المناديب والمشترين.',
          'مراجعة شروط التسعير ونسب هامش منصة Findora لضمان استقرار العروض.'
        ]
      : [
          'Activate the gamification engine to boost scout submissions and repeat purchases.',
          'Review transaction markups and commissions to sustain high-margin offers.'
        ];
  } else if (averageProgress >= 50 && averageProgress < 70) {
    currentPhase = 'Phase 3';
    phaseLabel = isRTL ? 'نمو التشغيل وتسريع المطابقة' : 'Operational Scale';
    tips = isRTL
      ? [
          'تحسين سرعة ردود الموردين على عروض الأسعار.',
          'إطلاق باقات اشتراك مخصصة للتجار المتميزين لتقديم عروض حصرية.'
        ]
      : [
          'Optimize merchant quote response times to reduce sourcing latency.',
          'Introduce premium merchant plans to highlight exclusive bulk deals.'
        ];
  } else if (averageProgress >= 70 && averageProgress < 85) {
    currentPhase = 'Phase 5';
    phaseLabel = isRTL ? 'السيطرة الكاملة والتحليل المالي' : 'Market Domination';
    tips = isRTL
      ? [
          'تقديم أدوات التنبؤ بالأسعار بالذكاء الاصطناعي للمشترين الدائمين.',
          'تطبيق الرقابة المالية الصارمة وإدارة السيولة النقدية والتسويات.'
        ]
      : [
          'Launch AI pricing forecasting tools for frequent purchasers.',
          'Enforce strict ERP payment auditing and quick payouts to trusted merchants.'
        ];
  } else {
    currentPhase = 'B2B & Expansion';
    phaseLabel = isRTL ? 'جاهز لتجارة الجملة والتوسع الدولي' : 'B2B Sourcing & Expansion';
    tips = isRTL
      ? [
          'العجلة تدور الآن تلقائياً! ركز على عقود المؤسسات الكبيرة وطلبات B2B الضخمة.',
          'البدء في دراسة التوسع الجغرافي لمدن ومحافظات إضافية.'
        ]
      : [
          'The growth engine is self-sustaining! Pivot resources to corporate accounts.',
          'Conduct feasibility studies for geographical expansion and cross-border logistics.'
        ];
  }

  // Calculate CSS rotation speed based on progress
  // 0% -> no rotation, 100% -> fast rotation
  const animationDuration = averageProgress === 0
    ? '0s' 
    : `${Math.max(1.5, 30 - (averageProgress / 100) * 28.5)}s`;

  const handleToggleEdit = (stage: FlywheelStage) => {
    setEditingId(stage.id);
    setEditTargetValue(stage.target_value);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    startTransition(async () => {
      setStages(prev =>
        prev.map(s => (s.id === editingId ? { ...s, target_value: editTargetValue } : s))
      );
      await updateFlywheelStageAction(editingId, { target_value: editTargetValue }, locale);
      setEditingId(null);
    });
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const list = [...stages];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    const updates = list.map((s, idx) => ({ id: s.id, display_order: idx + 1 }));
    setStages(list.map((s, idx) => ({ ...s, display_order: idx + 1 })));

    startTransition(async () => {
      await reorderFlywheelStagesAction(updates, locale);
    });
  };

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameEn || !newNameAr || !newMetricKey) {
      alert('Please fill out all fields');
      return;
    }

    startTransition(async () => {
      const nextOrder = stages.length > 0 ? Math.max(...stages.map(s => s.display_order)) + 1 : 1;
      await createFlywheelStageAction({
        nameEn: newNameEn,
        nameAr: newNameAr,
        metricKey: newMetricKey,
        targetValue: newTargetValue,
        displayOrder: nextOrder
      }, locale);

      setNewNameEn('');
      setNewNameAr('');
      setNewMetricKey('');
      setNewTargetValue(100);

      window.location.reload();
    });
  };

  const handleDeleteStage = (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المرحلة من عجلة النمو؟' : 'Are you sure you want to delete this stage?')) {
      return;
    }

    startTransition(async () => {
      setStages(prev => prev.filter(s => s.id !== id));
      await deleteFlywheelStageAction(id, locale);
    });
  };

  return (
    <div className="flywheel-dashboard" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .flywheel-dashboard {
          color: #e2e8f0;
          font-family: 'Outfit', 'Inter', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .header-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .title-badge {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, 0.2);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: inline-block;
          margin-bottom: 15px;
        }

        .header-title {
          font-size: 2.2rem;
          font-weight: 900;
          background: linear-gradient(135deg, #ffffff 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 10px;
        }

        /* Interactive Wheel Container */
        .flywheel-hero-card {
          background: linear-gradient(135deg, rgba(16, 35, 30, 0.4) 0%, rgba(10, 15, 25, 0.7) 100%);
          border: 1px solid rgba(52, 211, 153, 0.15);
          border-radius: 28px;
          padding: 40px;
          margin-bottom: 40px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }

        @media (max-width: 900px) {
          .flywheel-hero-card { grid-template-columns: 1fr; }
        }

        /* SVG Wheel Graphics */
        .wheel-svg-wrap {
          position: relative;
          width: 380px;
          height: 380px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wheel-svg {
          width: 100%;
          height: 100%;
          animation: spinWheel ${animationDuration} linear infinite;
          transform-origin: center;
        }

        @keyframes spinWheel {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .wheel-center-badge {
          position: absolute;
          width: 110px;
          height: 110px;
          background: #090d16;
          border: 2px dashed rgba(52, 211, 153, 0.3);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(52, 211, 153, 0.15);
          z-index: 10;
        }

        .center-pct {
          font-size: 1.8rem;
          font-weight: 950;
          color: #34d399;
          font-family: monospace;
          line-height: 1;
        }

        .center-lbl {
          font-size: 0.65rem;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          margin-top: 4px;
        }

        /* Stage labels orbiting */
        .stage-orbit-node {
          position: absolute;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(52, 211, 153, 0.25);
          padding: 8px 14px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 800;
          white-space: nowrap;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 5;
          transform: translate(-50%, -50%);
        }

        /* Info Panel */
        .phase-info-wrap {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .phase-header-badge {
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: #34d399;
          font-weight: 900;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 0.85rem;
          display: inline-block;
          align-self: flex-start;
        }

        .phase-title {
          font-size: 1.6rem;
          font-weight: 900;
          margin: 0;
          color: #ffffff;
        }

        .tips-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 15px;
        }

        .tip-item {
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .tip-icon {
          color: #34d399;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        /* Sliders / Target management */
        .sliders-section-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 40px;
        }

        .sliders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
        }

        .slider-row {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 18px;
          padding: 20px;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          font-size: 0.9rem;
          margin-bottom: 12px;
        }

        .slider-progress-bar {
          height: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 15px;
        }

        .slider-progress-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
          transition: width 0.6s ease;
        }

        .slider-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 700;
          font-size: 0.75rem;
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-primary {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .btn-primary:hover {
          background: #059669;
          border-color: #059669;
        }

        /* Order buttons */
        .order-btn-wrap {
          display: flex;
          gap: 4px;
        }

        .order-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4);
          background: transparent;
          cursor: pointer;
          font-size: 0.65rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .order-btn:hover {
          color: #34d399;
          border-color: #34d399;
        }

        /* Phase Targets indicators */
        .phases-bar-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 40px;
        }

        .phases-bar-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 15px;
        }

        .phase-bar-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
        }

        .phase-bar-item.active {
          border-color: rgba(52, 211, 153, 0.3);
          background: rgba(52, 211, 153, 0.04);
        }

        .phase-target-val {
          font-weight: 900;
          font-size: 0.9rem;
          color: #34d399;
        }

        /* Add Stage Form */
        .add-form-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 30px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.5);
        }

        .form-input {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 16px;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .form-input:focus {
          border-color: #34d399;
          outline: none;
        }

        /* Overlay modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .edit-modal {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 24px;
          padding: 30px;
          width: 420px;
          max-width: 90vw;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
      ` }} />

      <header className="header-section">
        <span className="title-badge">🔄 {isRTL ? 'محرك عجلة النمو' : 'Growth Engine Matrix'}</span>
        <h1 className="header-title">{isRTL ? 'عجلة النمو — Flywheel' : 'The Flywheel Growth Engine'}</h1>
        <p className="header-subtitle">
          {isRTL
            ? 'حين تدور العجلة، المشروع ينمو بمفرده. تتبع حالة الدوران ومقاييس نضج المراحل.'
            : 'When the wheel spins, the platform grows on its own. Track rotation rates and growth phases.'}
        </p>
      </header>

      {/* Hero Wheel Panel */}
      <section className="flywheel-hero-card">
        {/* Animated circular SVG */}
        <div className="wheel-svg-wrap">
          <div className="wheel-center-badge">
            <span className="center-pct">{averageProgress}%</span>
            <span className="center-lbl">Flywheel</span>
          </div>

          <svg className="wheel-svg" viewBox="0 0 200 200">
            {/* Outer track */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="url(#flywheelGradient)"
              strokeWidth="6"
              strokeDasharray="502"
              strokeDashoffset={502 - (502 * averageProgress) / 100}
              strokeLinecap="round"
            />
            {/* Center track dashed */}
            <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(52, 211, 153, 0.1)" strokeWidth="1" strokeDasharray="5, 5" />

            <defs>
              <linearGradient id="flywheelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>

          {/* Node text anchors placed mathematically around the circle */}
          {stages.map((stage, idx) => {
            const angle = (idx * 360) / stages.length - 90; // offset by -90 to start top center
            const radius = 80;
            // Coordinate points
            const x = 190 + radius * Math.cos((angle * Math.PI) / 180);
            const y = 190 + radius * Math.sin((angle * Math.PI) / 180);

            return (
              <div
                key={stage.id}
                className="stage-orbit-node"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  borderColor: (stage.live_value ?? stage.current_value) >= stage.target_value ? '#10b981' : undefined
                }}
              >
                {isRTL ? stage.name_ar : stage.name_en}
              </div>
            );
          })}
        </div>

        {/* Phase Info & Recommendations */}
        <div className="phase-info-wrap">
          <span className="phase-header-badge">{currentPhase}</span>
          <h2 className="phase-title">{phaseLabel}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            {isRTL
              ? 'توصيات استشارية لتحسين مؤشرات الدوران الحالية للعجلة وتجنب نقاط الاحتكاك:'
              : 'Consultative optimization advice to accelerate the flywheel speed and eliminate friction points:'}
          </p>

          <div className="tips-list">
            {tips.map((tip, idx) => (
              <div key={idx} className="tip-item">
                <span className="tip-icon">💡</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sliders checklist */}
      <section className="sliders-section-card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
          📊 {isRTL ? 'مؤشرات أداء المحرك المستهدفة' : 'Flywheel Metric Controls'}
        </h2>

        <div className="sliders-grid">
          {stages.map((stage, idx) => {
            const liveVal = stage.live_value ?? stage.current_value;
            const progress = Math.min(100, Math.round((liveVal / (stage.target_value || 1)) * 100));

            return (
              <div key={stage.id} className="slider-row">
                <div className="slider-header">
                  <span>{isRTL ? stage.name_ar : stage.name_en}</span>
                  <span className="slider-value">
                    {progress}% ({liveVal} / {stage.target_value})
                  </span>
                </div>

                <div className="slider-progress-bar">
                  <div className="slider-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="slider-actions">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" onClick={() => handleToggleEdit(stage)}>
                      ⚙️ {isRTL ? 'ضبط الهدف' : 'Target'}
                    </button>
                    {isAdmin && (
                      <button className="btn btn-danger" style={{ borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleDeleteStage(stage.id)}>
                        🗑️
                      </button>
                    )}
                  </div>

                  <div className="order-btn-wrap">
                    <button className="order-btn" onClick={() => handleMoveOrder(idx, 'up')}>▲</button>
                    <button className="order-btn" onClick={() => handleMoveOrder(idx, 'down')}>▼</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Phase Targets Info */}
      <section className="phases-bar-card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>
          🏁 {isRTL ? 'شروط الانتقال بين مراحل النمو' : 'Phase Transition Checklist'}
        </h2>
        <div className="phases-bar-list">
          {[
            { limit: 30, text_ar: 'Phase 1 - الجاهزية للانطلاق المبدئي وتثبيت الجذور', text_en: 'Phase 1 - Initial Traction Readiness' },
            { limit: 50, text_ar: 'Phase 3 - الجاهزية للنمو التشغيلي المتسارع', text_en: 'Phase 3 - Scale & Match Operations' },
            { limit: 70, text_ar: 'Phase 5 - الجاهزية للسيطرة الكاملة وإحكام الرقابة المالية', text_en: 'Phase 5 - Market Domination & ERP controls' },
            { limit: 85, text_ar: 'Phase B2B - الجاهزية التامة لتجارة الجملة والتوسع الإقليمي', text_en: 'Phase B2B - Wholesale & Enterprise expansion' }
          ].map((ph, idx) => {
            const isActive = averageProgress >= ph.limit;
            return (
              <div key={idx} className={`phase-bar-item ${isActive ? 'active' : ''}`}>
                <span style={{ fontWeight: 800, color: isActive ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                  {isActive ? '✅' : '🔒'} {isRTL ? ph.text_ar : ph.text_en}
                </span>
                <span className="phase-target-val">
                  {isRTL ? `أكبر من أو يساوي ${ph.limit}%` : `>= ${ph.limit}%`}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add New Stage form */}
      {isAdmin && (
        <section className="add-form-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
            ➕ {isRTL ? 'إضافة مرحلة جديدة لعجلة النمو' : 'Add New Flywheel Stage'}
          </h2>
          <form onSubmit={handleCreateStage}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{isRTL ? 'الاسم بالإنجليزية' : 'Stage Name (English)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={newNameEn}
                  onChange={e => setNewNameEn(e.target.value)}
                  placeholder="e.g. Higher Conversions"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'الاسم بالعربية' : 'Stage Name (Arabic)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={newNameAr}
                  onChange={e => setNewNameAr(e.target.value)}
                  placeholder="مثال: معدلات تحويل أعلى"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'المفتاح البرمي للمقاييس' : 'Metric Database Key'}</label>
                <select
                  className="form-input"
                  value={newMetricKey}
                  onChange={e => setNewMetricKey(e.target.value)}
                >
                  <option value="">{isRTL ? 'اختر مفتاحاً...' : 'Select database key...'}</option>
                  <option value="new_customers">{isRTL ? 'عدد العملاء الإجمالي' : 'Total Customer Count'}</option>
                  <option value="more_orders">{isRTL ? 'عدد الطلبات الإجمالي' : 'Total Sourcing Requests'}</option>
                  <option value="more_merchants">{isRTL ? 'عدد التجار النشطين' : 'Active Merchants count'}</option>
                  <option value="better_deals">{isRTL ? 'عدد العروض المتاحة' : 'Published Products Deals'}</option>
                  <option value="higher_satisfaction">{isRTL ? 'متوسط تقييمات المنصة' : 'Average Platform Review Rating'}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'الهدف المستهدف' : 'Target Value'}</label>
                <input
                  type="number"
                  className="form-input"
                  value={newTargetValue}
                  onChange={e => setNewTargetValue(Number(e.target.value))}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 800 }}>
              ➕ {isRTL ? 'إضافة المرحلة' : 'Add Stage'}
            </button>
          </form>
        </section>
      )}

      {/* Target Edit Modal */}
      {editingId && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3 style={{ margin: '0 0 20px', fontSize: '1.15rem', fontWeight: 900 }}>
              ⚙️ {isRTL ? 'ضبط القيمة المستهدفة للمرحلة' : 'Adjust Growth Stage Target'}
            </h3>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">{isRTL ? 'القيمة المستهدفة (Target Value)' : 'Target Value'}</label>
              <input
                type="number"
                className="form-input"
                value={editTargetValue}
                onChange={e => setEditTargetValue(Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                💾 {isRTL ? 'حفظ' : 'Save'}
              </button>
              <button className="btn" onClick={() => setEditingId(null)}>
                ❌ {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
