'use client';

import React, { useState, useTransition } from 'react';
import {
  activateBeachheadAction,
  updateBeachheadAction,
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction
} from './actions';

interface Specialization {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  display_order: number;
  is_beachhead?: boolean;
  priority_stars?: number;
  description_ar?: string | null;
  description_en?: string | null;
  target_merchants?: number;
  target_deals?: number;
  criteria_json?: any;
}

interface BeachheadMetrics {
  currentMerchants: number;
  targetMerchants: number;
  currentDeals: number;
  targetDeals: number;
  totalRequests: number;
  conversionRate: number;
  isReady: boolean;
}

interface BeachheadManagerClientProps {
  locale: string;
  isAdmin: boolean;
  initialCategories: Specialization[];
  metricsMap: Record<string, BeachheadMetrics>;
}

export default function BeachheadManagerClient({
  locale,
  isAdmin,
  initialCategories,
  metricsMap
}: BeachheadManagerClientProps) {
  const isRTL = locale === 'ar';
  const [categories, setCategories] = useState<Specialization[]>(initialCategories);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for creating a new category
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newDescEn, setNewDescEn] = useState('');
  const [newDescAr, setNewDescAr] = useState('');
  const [newStars, setNewStars] = useState(1);
  const [newTargetMerchants, setNewTargetMerchants] = useState(10);
  const [newTargetDeals, setNewTargetDeals] = useState(5);

  // Edit states
  const [editDescEn, setEditDescEn] = useState('');
  const [editDescAr, setEditDescAr] = useState('');
  const [editStars, setEditStars] = useState(1);
  const [editTargetMerchants, setEditTargetMerchants] = useState(10);
  const [editTargetDeals, setEditTargetDeals] = useState(5);

  // Find active beachhead
  const activeBeachhead = categories.find(c => c.is_beachhead);
  const activeMetrics = activeBeachhead ? metricsMap[activeBeachhead.id] : null;

  const handleToggleCriteria = async (activeId: string, criteriaIndex: number) => {
    const activeCat = categories.find(c => c.id === activeId);
    if (!activeCat) return;

    const currentCriteria = Array.isArray(activeCat.criteria_json) ? [...activeCat.criteria_json] : [];
    if (currentCriteria[criteriaIndex]) {
      currentCriteria[criteriaIndex].checked = !currentCriteria[criteriaIndex].checked;
    }

    startTransition(async () => {
      // Optimistic update
      setCategories(prev =>
        prev.map(c => (c.id === activeId ? { ...c, criteria_json: currentCriteria } : c))
      );
      await updateBeachheadAction(activeId, { criteria_json: currentCriteria }, locale);
    });
  };

  const handleActivate = (id: string) => {
    // Check if current active beachhead is ready
    if (activeBeachhead && activeMetrics && !activeMetrics.isReady) {
      alert(
        isRTL
          ? `عذراً! لا يمكنك الانتقال لتفعيل فئة أخرى حتى تكتمل شروط الجبهة الحالية (${activeBeachhead.name_ar}).`
          : `Sorry! You cannot transition to another category until the current beachhead (${activeBeachhead.name_en}) is completed.`
      );
      return;
    }

    if (!confirm(isRTL ? 'هل أنت متأكد من تفعيل هذه الفئة كـ Beachhead؟' : 'Are you sure you want to activate this category as Beachhead?')) {
      return;
    }

    startTransition(async () => {
      setCategories(prev =>
        prev.map(c => ({ ...c, is_beachhead: c.id === id }))
      );
      await activateBeachheadAction(id, locale);
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameEn || !newNameAr) {
      alert(isRTL ? 'يرجى إدخال اسم الفئة باللغتين' : 'Please input the category name in both languages');
      return;
    }

    startTransition(async () => {
      const nextDisplayOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) + 1 : 1;
      await createCategoryAction({
        nameEn: newNameEn,
        nameAr: newNameAr,
        descriptionEn: newDescEn,
        descriptionAr: newDescAr,
        stars: newStars,
        targetMerchants: newTargetMerchants,
        targetDeals: newTargetDeals,
        displayOrder: nextDisplayOrder
      }, locale);

      // Reset form
      setNewNameEn('');
      setNewNameAr('');
      setNewDescEn('');
      setNewDescAr('');
      setNewStars(1);
      setNewTargetMerchants(10);
      setNewTargetDeals(5);

      // Page revalidates, but let's refresh local state if needed
      window.location.reload();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الفئة بالكامل؟' : 'Are you sure you want to delete this category?')) {
      return;
    }

    startTransition(async () => {
      setCategories(prev => prev.filter(c => c.id !== id));
      await deleteCategoryAction(id, locale);
    });
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    // Recalculate display_order
    const updates = list.map((c, idx) => ({ id: c.id, display_order: idx + 1 }));
    
    setCategories(list.map((c, idx) => ({ ...c, display_order: idx + 1 })));

    startTransition(async () => {
      await reorderCategoriesAction(updates, locale);
    });
  };

  const startEdit = (cat: Specialization) => {
    setEditingId(cat.id);
    setEditDescEn(cat.description_en || '');
    setEditDescAr(cat.description_ar || '');
    setEditStars(cat.priority_stars || 1);
    setEditTargetMerchants(cat.target_merchants || 10);
    setEditTargetDeals(cat.target_deals || 5);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    startTransition(async () => {
      setCategories(prev =>
        prev.map(c =>
          c.id === editingId
            ? {
                ...c,
                description_en: editDescEn,
                description_ar: editDescAr,
                priority_stars: editStars,
                target_merchants: editTargetMerchants,
                target_deals: editTargetDeals
              }
            : c
        )
      );
      await updateBeachheadAction(editingId, {
        description_en: editDescEn,
        description_ar: editDescAr,
        priority_stars: editStars,
        target_merchants: editTargetMerchants,
        target_deals: editTargetDeals
      }, locale);
      setEditingId(null);
    });
  };

  return (
    <div className="beachhead-dashboard" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .beachhead-dashboard {
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
          background: rgba(247, 212, 107, 0.1);
          color: #f7d46b;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 999px;
          border: 1px solid rgba(247, 212, 107, 0.2);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: inline-block;
          margin-bottom: 15px;
        }

        .header-title {
          font-size: 2.2rem;
          font-weight: 900;
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 10px;
        }

        .header-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.05rem;
          margin: 0;
        }

        /* Active Beachhead Widget */
        .active-beachhead-card {
          background: linear-gradient(135deg, rgba(20, 30, 55, 0.6) 0%, rgba(10, 15, 30, 0.8) 100%);
          border: 1px solid rgba(247, 212, 107, 0.25);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05);
          position: relative;
          overflow: hidden;
        }

        .active-beachhead-card::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(247, 212, 107, 0.03) 0%, transparent 70%);
          pointer-events: none;
        }

        .beachhead-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 25px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }

        .hero-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .active-icon {
          font-size: 3rem;
          filter: drop-shadow(0 0 15px rgba(247, 212, 107, 0.4));
          animation: pulseIcon 3s infinite;
        }

        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        .active-title {
          font-size: 1.8rem;
          font-weight: 900;
          margin: 0 0 6px;
          color: #ffffff;
        }

        .active-desc {
          color: #f7d46b;
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0;
        }

        .transition-status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 8px 18px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.85rem;
        }

        .transition-status-badge.ready {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.2);
        }

        /* Criteria & Metrics Grid */
        .beachhead-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 30px;
        }

        @media (max-width: 850px) {
          .beachhead-grid { grid-template-columns: 1fr; }
        }

        .criteria-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .criteria-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 12px 18px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .criteria-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(247, 212, 107, 0.2);
        }

        .criteria-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .criteria-item.checked .criteria-checkbox {
          background: #10b981;
          border-color: #10b981;
        }

        .criteria-checkbox::after {
          content: '✓';
          color: white;
          font-size: 0.8rem;
          font-weight: 900;
          display: none;
        }

        .criteria-item.checked .criteria-checkbox::after {
          display: block;
        }

        .criteria-label {
          font-weight: 700;
          font-size: 0.9rem;
        }

        /* Metrics list */
        .metrics-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .metric-row {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 16px 20px;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          font-size: 0.9rem;
          margin-bottom: 8px;
        }

        .metric-value {
          color: #f7d46b;
          font-family: monospace;
          direction: ltr;
        }

        .progress-bar-bg {
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 99px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Warning alert banner */
        .warning-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.07);
          border: 1px solid rgba(239, 68, 68, 0.25);
          padding: 14px 20px;
          border-radius: 16px;
          color: #ef4444;
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 30px;
        }

        .warning-alert svg {
          flex-shrink: 0;
        }

        /* Target categories grid */
        .targets-section-title {
          font-size: 1.4rem;
          font-weight: 900;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .targets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 50px;
        }

        .target-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.3s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .target-card:hover {
          transform: translateY(-2px);
          border-color: rgba(247, 212, 107, 0.15);
          background: rgba(255, 255, 255, 0.03);
        }

        .target-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .stars-row {
          display: flex;
          gap: 3px;
          color: #f7d46b;
        }

        .star-icon {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }

        .star-icon.empty {
          color: rgba(255, 255, 255, 0.15);
        }

        .target-name {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0 0 4px;
          color: #ffffff;
        }

        .target-notes {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
          line-height: 1.4;
        }

        .mini-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 12px 6px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 20px;
        }

        .mini-metric {
          display: flex;
          flex-direction: column;
        }

        .mini-val {
          font-size: 1.05rem;
          font-weight: 900;
          color: #f7d46b;
          font-family: monospace;
          direction: ltr;
        }

        .mini-lbl {
          font-size: 0.65rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 3px;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          flex: 1;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 8px 12px;
          font-weight: 700;
          font-size: 0.78rem;
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-primary {
          background: #3b82f6;
          border-color: #3b82f6;
          color: #ffffff;
        }

        .btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          padding: 0;
          border-radius: 10px;
        }

        .btn-danger {
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        /* Sorting controls */
        .sorting-controls {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-left: 8px;
        }
        [dir="rtl"] .sorting-controls {
          margin-left: 0;
          margin-right: 8px;
        }

        .sort-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          font-size: 0.65rem;
          padding: 2px;
          line-height: 1;
        }

        .sort-btn:hover {
          color: #f7d46b;
        }

        /* Form section */
        .form-section-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 30px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.55);
        }

        .form-input {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 16px;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .form-input:focus {
          border-color: #3b82f6;
          outline: none;
          background: rgba(255, 255, 255, 0.05);
        }

        .star-select {
          display: flex;
          gap: 8px;
          align-items: center;
          height: 100%;
        }

        /* Edit Modal / Banner */
        .editing-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .edit-modal {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 30px;
          width: 500px;
          max-width: 90vw;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .loading-shimmer {
          opacity: 0.5;
          pointer-events: none;
        }
      ` }} />

      <header className="header-section">
        <span className="title-badge">🎯 {isRTL ? 'إدارة الأسواق المستهدفة' : 'Target Market Administration'}</span>
        <h1 className="header-title">{isRTL ? 'نظام Beachhead Market' : 'Beachhead Market System'}</h1>
        <p className="header-subtitle">
          {isRTL
            ? 'تحديد الفئات وتتبع معايير نضج السوق قبل الانتقال للمرحلة التالية.'
            : 'Define target categories and track metrics before transitioning to the next stage.'}
        </p>
      </header>

      {isPending && (
        <div style={{ textAlign: 'center', color: '#f7d46b', fontWeight: 'bold', marginBottom: '10px' }}>
          ⏳ {isRTL ? 'جاري تحديث البيانات...' : 'Updating data...'}
        </div>
      )}

      {/* Active Beachhead Display */}
      {activeBeachhead ? (
        <div>
          <div className={`active-beachhead-card ${isPending ? 'loading-shimmer' : ''}`}>
            <div className="beachhead-hero">
              <div className="hero-left">
                <span className="active-icon">🎯</span>
                <div>
                  <h2 className="active-title">{isRTL ? activeBeachhead.name_ar : activeBeachhead.name_en}</h2>
                  <p className="active-desc">{isRTL ? activeBeachhead.description_ar : activeBeachhead.description_en}</p>
                </div>
              </div>

              <div className={`transition-status-badge ${activeMetrics?.isReady ? 'ready' : ''}`}>
                <span>{activeMetrics?.isReady ? '🔓' : '🔒'}</span>
                <span>
                  {isRTL
                    ? `حالة الانتقال: ${activeMetrics?.isReady ? 'جاهز للانتفال' : 'غير جاهز'}`
                    : `Transition: ${activeMetrics?.isReady ? 'Ready' : 'Not Ready'}`}
                </span>
              </div>
            </div>

            <div className="beachhead-grid">
              {/* Checkbox Strategic Criteria */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '15px' }}>
                  📋 {isRTL ? 'المعايير الاستراتيجية' : 'Strategic Criteria'}
                </h3>
                <div className="criteria-list">
                  {Array.isArray(activeBeachhead.criteria_json) &&
                    activeBeachhead.criteria_json.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className={`criteria-item ${item.checked ? 'checked' : ''}`}
                        onClick={() => handleToggleCriteria(activeBeachhead.id, idx)}
                      >
                        <div className="criteria-checkbox" />
                        <span className="criteria-label">{isRTL ? item.label_ar : item.label_en}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Progress metrics */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '15px' }}>
                  📊 {isRTL ? 'مؤشرات الانتقال الحالية' : 'Live Transition Metrics'}
                </h3>
                <div className="metrics-list">
                  {/* Merchants */}
                  <div className="metric-row">
                    <div className="metric-header">
                      <span>{isRTL ? 'تجار الفئة المعتمدين' : 'Acquired Merchants'}</span>
                      <span className="metric-value">
                        {activeMetrics?.currentMerchants} / {activeMetrics?.targetMerchants}
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, ((activeMetrics?.currentMerchants || 0) / (activeMetrics?.targetMerchants || 1)) * 100)}%`,
                          background: '#3b82f6'
                        }}
                      />
                    </div>
                  </div>

                  {/* Deals */}
                  <div className="metric-row">
                    <div className="metric-header">
                      <span>{isRTL ? 'الصفقات المكتملة' : 'Completed Deals'}</span>
                      <span className="metric-value">
                        {activeMetrics?.currentDeals} / {activeMetrics?.targetDeals}
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, ((activeMetrics?.currentDeals || 0) / (activeMetrics?.targetDeals || 1)) * 100)}%`,
                          background: '#10b981'
                        }}
                      />
                    </div>
                  </div>

                  {/* Conversion rate */}
                  <div className="metric-row">
                    <div className="metric-header">
                      <span>{isRTL ? 'معدل التحويل التراكمي' : 'Conversion Rate'}</span>
                      <span className="metric-value">{activeMetrics?.conversionRate}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, activeMetrics?.conversionRate || 0)}%`,
                          background: '#8b5cf6'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          {!activeMetrics?.isReady && (
            <div className="warning-alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                {isRTL
                  ? `لا تضيف فئة جديدة قبل تحقيق الهدف: ${activeMetrics?.targetMerchants} تجار + ${activeMetrics?.targetDeals} صفقات في ${activeBeachhead.name_ar}.`
                  : `Please do not transition before reaching target: ${activeMetrics?.targetMerchants} merchants + ${activeMetrics?.targetDeals} deals in ${activeBeachhead.name_en}.`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '40px' }}>
          ⚠️ {isRTL ? 'لم يتم تعيين أي فئة كـ Beachhead نشطة حالياً!' : 'No active beachhead set currently!'}
        </div>
      )}

      {/* Target markets list */}
      <section>
        <h2 className="targets-section-title">
          <span>🎯</span>
          <span>{isRTL ? 'الفئات الاستراتيجية المستهدفة' : 'Target Strategic Categories'}</span>
        </h2>

        <div className="targets-grid">
          {categories
            .filter(c => !c.is_beachhead)
            .map((cat, index) => {
              const metrics = metricsMap[cat.id] || {
                currentMerchants: 0,
                targetMerchants: cat.target_merchants || 10,
                currentDeals: 0,
                targetDeals: cat.target_deals || 5,
                conversionRate: 0
              };

              return (
                <div key={cat.id} className="target-card">
                  <div>
                    <div className="target-top">
                      <div>
                        <h3 className="target-name">{isRTL ? cat.name_ar : cat.name_en}</h3>
                        <p className="target-notes">{isRTL ? cat.description_ar : cat.description_en}</p>
                      </div>

                      {/* Stars */}
                      <div className="stars-row">
                        {[1, 2, 3].map(num => (
                          <svg
                            key={num}
                            className={`star-icon ${num > (cat.priority_stars || 1) ? 'empty' : ''}`}
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mini-metrics-grid">
                      <div className="mini-metric">
                        <span className="mini-val">{metrics.conversionRate}%</span>
                        <span className="mini-lbl">{isRTL ? 'تحويل' : 'Conv.'}</span>
                      </div>
                      <div className="mini-metric">
                        <span className="mini-val">{metrics.currentDeals}</span>
                        <span className="mini-lbl">{isRTL ? 'صفقة' : 'Deals'}</span>
                      </div>
                      <div className="mini-metric">
                        <span className="mini-val">{metrics.currentMerchants}</span>
                        <span className="mini-lbl">{isRTL ? 'تاجر' : 'Merchants'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleActivate(cat.id)}
                    >
                      🚀 {isRTL ? 'تفعيل كـ Beachhead' : 'Activate Beachhead'}
                    </button>

                    <button className="btn btn-icon" onClick={() => startEdit(cat)} title={isRTL ? 'تعديل' : 'Edit'}>
                      ✏️
                    </button>

                    {isAdmin && (
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => handleDelete(cat.id)}
                        title={isRTL ? 'حذف' : 'Delete'}
                      >
                        🗑️
                      </button>
                    )}

                    {/* Up/Down buttons for ordering */}
                    <div className="sorting-controls">
                      <button
                        className="sort-btn"
                        onClick={() => handleMoveOrder(categories.indexOf(cat), 'up')}
                        title={isRTL ? 'رفع' : 'Move Up'}
                      >
                        ▲
                      </button>
                      <button
                        className="sort-btn"
                        onClick={() => handleMoveOrder(categories.indexOf(cat), 'down')}
                        title={isRTL ? 'خفض' : 'Move Down'}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Add New Category form */}
      <section className="form-section-card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
          ➕ {isRTL ? 'إضافة فئة مستهدفة جديدة' : 'Add New Target Category'}
        </h2>
        <form onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{isRTL ? 'اسم الفئة (بالإنجليزية)' : 'Category Name (English)'}</label>
              <input
                type="text"
                className="form-input"
                value={newNameEn}
                onChange={e => setNewNameEn(e.target.value)}
                placeholder="e.g. Industrial Equipment"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{isRTL ? 'اسم الفئة (بالعربية)' : 'Category Name (Arabic)'}</label>
              <input
                type="text"
                className="form-input"
                value={newNameAr}
                onChange={e => setNewNameAr(e.target.value)}
                placeholder="مثال: معدات صناعية"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{isRTL ? 'سبب استهداف الفئة (بالإنجليزية)' : 'Reason/Notes (English)'}</label>
              <input
                type="text"
                className="form-input"
                value={newDescEn}
                onChange={e => setNewDescEn(e.target.value)}
                placeholder="e.g. High average transaction value"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{isRTL ? 'سبب استهداف الفئة (بالعربية)' : 'Reason/Notes (Arabic)'}</label>
              <input
                type="text"
                className="form-input"
                value={newDescAr}
                onChange={e => setNewDescAr(e.target.value)}
                placeholder="مثال: قيمة متوسط معاملات عالية ومنافسة طبيعية"
              />
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="form-group">
              <label className="form-label">{isRTL ? 'الأولوية (النجوم)' : 'Priority (Stars)'}</label>
              <select
                className="form-input"
                value={newStars}
                onChange={e => setNewStars(Number(e.target.value))}
              >
                <option value="1">⭐ (ضعيفة / Low)</option>
                <option value="2">⭐⭐ (متوسطة / Mid)</option>
                <option value="3">⭐⭐⭐ (قوية / High)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{isRTL ? 'المستهدف من التجار' : 'Target Merchants'}</label>
              <input
                type="number"
                className="form-input"
                value={newTargetMerchants}
                onChange={e => setNewTargetMerchants(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{isRTL ? 'المستهدف من الصفقات' : 'Target Deals'}</label>
              <input
                type="number"
                className="form-input"
                value={newTargetDeals}
                onChange={e => setNewTargetDeals(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px', width: '100%' }}>
                ➕ {isRTL ? 'إضافة الفئة المستهدفة' : 'Add Target Category'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Edit Modal Popup */}
      {editingId && (
        <div className="editing-overlay">
          <div className="edit-modal">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px' }}>
              ✏️ {isRTL ? 'تعديل بيانات الفئة المستهدفة' : 'Edit Category Configuration'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <div className="form-group">
                <label className="form-label">{isRTL ? 'سبب استهداف الفئة (بالعربية)' : 'Reason (Arabic)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editDescAr}
                  onChange={e => setEditDescAr(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'سبب استهداف الفئة (بالإنجليزية)' : 'Reason (English)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editDescEn}
                  onChange={e => setEditDescEn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'الأولوية (النجوم)' : 'Priority (Stars)'}</label>
                <select
                  className="form-input"
                  value={editStars}
                  onChange={e => setEditStars(Number(e.target.value))}
                >
                  <option value="1">⭐</option>
                  <option value="2">⭐⭐</option>
                  <option value="3">⭐⭐⭐</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{isRTL ? 'المستهدف من التجار' : 'Target Merchants'}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editTargetMerchants}
                    onChange={e => setEditTargetMerchants(Number(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{isRTL ? 'المستهدف من الصفقات' : 'Target Deals'}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editTargetDeals}
                    onChange={e => setEditTargetDeals(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                💾 {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
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
