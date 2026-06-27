'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  saveCompetitorAction,
  deleteCompetitorAction,
  saveCompetitorComparisonAction,
  deleteCompetitorComparisonAction
} from '../customers/actions';

interface Competitor {
  id: string;
  name_en: string;
  name_ar: string;
  category_en: string;
  category_ar: string;
  strength_rating: number; // 1-5
  gap_analysis_en?: string;
  gap_analysis_ar?: string;
}

interface FeatureComparison {
  id: string;
  competitor_id: string;
  feature_name_en: string;
  feature_name_ar: string;
  status_in_competitor_en: string;
  status_in_competitor_ar: string;
  required_phase_number: number;
  advantage_desc_en: string;
  advantage_desc_ar: string;
}

interface CompetitorsClientProps {
  locale: string;
  initialCompetitors: Competitor[];
  initialComparisons: FeatureComparison[];
  activePhases: number[];
}

export default function CompetitorsClient({
  locale,
  initialCompetitors,
  initialComparisons,
  activePhases
}: CompetitorsClientProps) {
  const isRTL = locale === 'ar';
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [comparisons, setComparisons] = useState<FeatureComparison[]>(initialComparisons);
  const [isPending, startTransition] = useTransition();

  // Modals / Form States
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  
  const [addingComparisonForId, setAddingComparisonForId] = useState<string | null>(null);
  const [editingComparison, setEditingComparison] = useState<FeatureComparison | null>(null);

  // Forms
  const [competitorForm, setCompetitorForm] = useState({
    name_en: '',
    name_ar: '',
    category_en: '',
    category_ar: '',
    strength_rating: 3,
    gap_analysis_en: '',
    gap_analysis_ar: ''
  });

  const [comparisonForm, setComparisonForm] = useState({
    feature_name_en: '',
    feature_name_ar: '',
    status_in_competitor_en: '',
    status_in_competitor_ar: '',
    required_phase_number: 1,
    advantage_desc_en: '',
    advantage_desc_ar: ''
  });

  // Calculate stats
  const activeFeaturesCount = comparisons.filter(c => activePhases.includes(c.required_phase_number)).length;
  const totalFeaturesCount = comparisons.length;
  const activePercentage = totalFeaturesCount > 0 ? Math.round((activeFeaturesCount / totalFeaturesCount) * 100) : 0;

  // Save/Edit Competitor
  const handleSaveCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          id: editingCompetitor?.id,
          ...competitorForm
        };
        await saveCompetitorAction(payload, locale);

        if (editingCompetitor) {
          setCompetitors(prev => prev.map(c => c.id === editingCompetitor.id ? { ...c, ...competitorForm } : c));
          setEditingCompetitor(null);
        } else {
          // Add temporary ID for UI until refresh
          const newComp: Competitor = {
            id: Math.random().toString(),
            ...competitorForm
          };
          setCompetitors([...competitors, newComp]);
          setShowAddCompetitor(false);
        }

        setCompetitorForm({
          name_en: '',
          name_ar: '',
          category_en: '',
          category_ar: '',
          strength_rating: 3,
          gap_analysis_en: '',
          gap_analysis_ar: ''
        });

        alert(isRTL ? 'تم حفظ بيانات المنافس بنجاح ⚔️' : 'Competitor saved successfully! ⚔️');
      } catch (err: any) {
        alert(err.message || 'Error saving competitor');
      }
    });
  };

  // Delete Competitor
  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا المنافس وجميع مقارناته؟' : 'Are you sure you want to delete this competitor and all its comparisons?')) return;
    startTransition(async () => {
      try {
        await deleteCompetitorAction(id, locale);
        setCompetitors(competitors.filter(c => c.id !== id));
        setComparisons(comparisons.filter(c => c.competitor_id !== id));
      } catch (err: any) {
        alert(err.message || 'Error deleting competitor');
      }
    });
  };

  // Save/Edit Comparison Mapping
  const handleSaveComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    const competitorId = addingComparisonForId || editingComparison?.competitor_id;
    if (!competitorId) return;

    startTransition(async () => {
      try {
        const payload = {
          id: editingComparison?.id,
          competitor_id: competitorId,
          ...comparisonForm
        };
        await saveCompetitorComparisonAction(payload, locale);

        if (editingComparison) {
          setComparisons(prev => prev.map(c => c.id === editingComparison.id ? { ...c, ...comparisonForm } : c));
          setEditingComparison(null);
        } else {
          const newComparison: FeatureComparison = {
            id: Math.random().toString(),
            competitor_id: competitorId,
            ...comparisonForm
          };
          setComparisons([...comparisons, newComparison]);
          setAddingComparisonForId(null);
        }

        setComparisonForm({
          feature_name_en: '',
          feature_name_ar: '',
          status_in_competitor_en: '',
          status_in_competitor_ar: '',
          required_phase_number: 1,
          advantage_desc_en: '',
          advantage_desc_ar: ''
        });

        alert(isRTL ? 'تم حفظ مقارنة الميزة بنجاح ✨' : 'Feature comparison saved! ✨');
      } catch (err: any) {
        alert(err.message || 'Error saving comparison');
      }
    });
  };

  // Delete Comparison Mapping
  const handleDeleteComparison = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المقارنة؟' : 'Are you sure you want to delete this comparison?')) return;
    startTransition(async () => {
      try {
        await deleteCompetitorComparisonAction(id, locale);
        setComparisons(comparisons.filter(c => c.id !== id));
      } catch (err: any) {
        alert(err.message || 'Error deleting comparison');
      }
    });
  };

  const openEditCompetitor = (comp: Competitor) => {
    setEditingCompetitor(comp);
    setCompetitorForm({
      name_en: comp.name_en,
      name_ar: comp.name_ar,
      category_en: comp.category_en,
      category_ar: comp.category_ar,
      strength_rating: comp.strength_rating,
      gap_analysis_en: comp.gap_analysis_en || '',
      gap_analysis_ar: comp.gap_analysis_ar || ''
    });
  };

  const openEditComparison = (comp: FeatureComparison) => {
    setEditingComparison(comp);
    setComparisonForm({
      feature_name_en: comp.feature_name_en,
      feature_name_ar: comp.feature_name_ar,
      status_in_competitor_en: comp.status_in_competitor_en,
      status_in_competitor_ar: comp.status_in_competitor_ar,
      required_phase_number: comp.required_phase_number,
      advantage_desc_en: comp.advantage_desc_en,
      advantage_desc_ar: comp.advantage_desc_ar
    });
  };

  return (
    <div className="competitors-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .competitors-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 1000px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Stats banner */
        .stats-banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(2, 6, 23, 0.6) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 30px;
          display: grid;
          grid-template-columns: 1fr 200px;
          align-items: center;
          gap: 20px;
        }
        .stats-info h2 { font-size: 1.4rem; font-weight: 900; color: white; margin: 0 0 6px; }
        .stats-info p { font-size: 0.9rem; color: rgba(255,255,255,0.6); margin: 0; }
        .progress-circle-wrap { display: flex; flex-direction: column; align-items: center; }
        .progress-circle-val { font-size: 2rem; font-weight: 900; color: #10b981; }
        .progress-circle-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-top: 4px; }

        .actions-row { display: flex; justify-content: flex-end; margin-bottom: 25px; }
        .submit-btn { padding: 12px 24px; background: #ef4444; color: white; border: none; font-weight: 850; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover { background: #dc2626; }

        /* Competitors list grid */
        .competitors-grid { display: grid; grid-template-columns: 1fr; gap: 30px; }
        
        .competitor-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 24px;
          padding: 30px;
          position: relative;
        }
        .competitor-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 20px; margin-bottom: 20px; }
        .comp-title { font-size: 1.6rem; font-weight: 900; color: white; margin: 0 0 6px; }
        .comp-cat { font-size: 0.8rem; font-weight: 850; color: #ef4444; text-transform: uppercase; background: rgba(239,68,68,0.1); padding: 4px 10px; border-radius: 8px; display: inline-block; }
        .stars-wrap { display: flex; gap: 3px; font-size: 1.1rem; color: #fbbf24; margin-top: 6px; }

        /* Actions on card */
        .card-actions { display: flex; gap: 8px; }
        .btn-mini { padding: 6px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 0.75rem; font-weight: 800; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-mini:hover { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255,255,255,0.2); }
        .btn-mini.delete { color: #ef4444; border-color: rgba(239,68,68,0.2); }
        .btn-mini.delete:hover { background: rgba(239,68,68,0.06); }

        /* Comparison rows */
        .comparisons-table { display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px; }
        .comparison-row { display: grid; grid-template-columns: 2fr 2fr 3fr auto; gap: 15px; align-items: center; padding: 14px 20px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; transition: all 0.2s; }
        .comparison-row:hover { background: rgba(255,255,255,0.025); border-color: rgba(255,255,255,0.06); }
        
        .comp-lbl { font-size: 0.95rem; font-weight: 850; color: #ffffff; }
        .comp-val-rival { font-size: 0.9rem; color: #f87171; display: flex; align-items: center; gap: 6px; }
        .comp-val-findora { font-size: 0.9rem; color: #10b981; display: flex; align-items: center; gap: 6px; font-weight: 700; }
        .comp-val-findora.locked { color: rgba(255,255,255,0.35); font-weight: normal; }

        /* Gap Box */
        .gap-box { background: rgba(245, 158, 11, 0.03); border: 1px solid rgba(245, 158, 11, 0.1); border-radius: 16px; padding: 16px 20px; }
        .gap-title { font-size: 0.85rem; font-weight: 900; color: #fbbf24; margin: 0 0 6px; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
        .gap-desc { font-size: 0.88rem; color: rgba(255,255,255,0.7); margin: 0; line-height: 1.5; }

        /* Modals */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { width: 100%; max-width: 550px; background: #080c14; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 30px; }
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input, .form-group textarea, .form-group select { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        .form-group input:focus, .form-group textarea:focus { border-color: #ef4444; outline: none; }
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? '⚔️ مقارنة المنافسين والتحليل' : '⚔️ Competitors Analysis'}</h1>
          <p className="subtitle">
            {isRTL ? 'تقييم وضع فايندورا التنافسي والخصائص الفعّالة مقارنة بالمشاريع الأخرى.' : 'Evaluate Findora\'s competitive edge and active advantages vs. other platforms.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Stats summary */}
      <section className="stats-banner">
        <div className="stats-info">
          <h2>{isRTL ? 'مؤشر التفوق التنافسي لفايندورا 🚀' : 'Findora Competitive Superiority Index 🚀'}</h2>
          <p>
            {isRTL 
              ? `تم تفعيل ${activeFeaturesCount} ميزة تنافسية من أصل ${totalFeaturesCount} ميزات إجمالية بناءً على المراحل التي تم تشغيلها في المشروع.` 
              : `Activated ${activeFeaturesCount} of ${totalFeaturesCount} feature advantages based on completed project phases.`}
          </p>
        </div>
        <div className="progress-circle-wrap">
          <span className="progress-circle-val">{activePercentage}%</span>
          <span className="progress-circle-lbl">{isRTL ? 'نسبة التفوق' : 'Superiority'}</span>
        </div>
      </section>

      {/* Action Add Competitor */}
      <div className="actions-row">
        <button className="submit-btn" onClick={() => setShowAddCompetitor(true)}>
          + {isRTL ? 'إضافة منافس جديد' : 'Add New Competitor'}
        </button>
      </div>

      {/* Competitors List */}
      <div className="competitors-grid">
        {competitors.map(comp => {
          const compComparisons = comparisons.filter(c => c.competitor_id === comp.id);

          return (
            <div key={comp.id} className="competitor-card">
              <header className="competitor-header">
                <div>
                  <h3 className="comp-title">{isRTL ? comp.name_ar : comp.name_en}</h3>
                  <span className="comp-cat">{isRTL ? comp.category_ar : comp.category_en}</span>
                  <div className="stars-wrap">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>{i < comp.strength_rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn-mini" onClick={() => setAddingComparisonForId(comp.id)}>
                    + {isRTL ? 'مقارنة ميزة' : 'Compare Feature'}
                  </button>
                  <button className="btn-mini" onClick={() => openEditCompetitor(comp)}>
                    ✏️ {isRTL ? 'تعديل' : 'Edit'}
                  </button>
                  <button className="btn-mini delete" onClick={() => handleDeleteCompetitor(comp.id)}>
                    🗑️ {isRTL ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </header>

              {/* Comparisons rows */}
              <div className="comparisons-table">
                {compComparisons.map(item => {
                  const isAdvantageActive = activePhases.includes(item.required_phase_number);

                  return (
                    <div key={item.id} className="comparison-row">
                      <div className="comp-lbl">
                        {isRTL ? item.feature_name_ar : item.feature_name_en}
                      </div>
                      
                      <div className="comp-val-rival">
                        <span>Rival:</span>
                        <strong>{isRTL ? item.status_in_competitor_ar : item.status_in_competitor_en}</strong>
                      </div>

                      <div className={`comp-val-findora ${isAdvantageActive ? '' : 'locked'}`}>
                        {isAdvantageActive ? (
                          <>
                            <span>✅ {isRTL ? 'ميزة فايندورا:' : 'Advantage:'}</span>
                            <strong>{isRTL ? item.advantage_desc_ar : item.advantage_desc_en}</strong>
                          </>
                        ) : (
                          <>
                            <span>⏰ {isRTL ? 'مغلق (يتطلب مرحلة ' : 'Locked (Requires Phase '} {item.required_phase_number}):</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                              {isRTL ? item.advantage_desc_ar : item.advantage_desc_en}
                            </span>
                          </>
                        )}
                      </div>

                      <div>
                        <button className="btn-mini" style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => openEditComparison(item)}>
                          ✏️
                        </button>
                        <button className="btn-mini delete" style={{ padding: '3px 8px', fontSize: '0.7rem', margin: '0 4px' }} onClick={() => handleDeleteComparison(item.id)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}

                {compComparisons.length === 0 && (
                  <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', margin: '10px 0', fontSize: '0.85rem' }}>
                    {isRTL ? 'لا يوجد مقارنة ميزات لهذا المنافس بعد.' : 'No feature comparisons registered for this competitor yet.'}
                  </p>
                )}
              </div>

              {/* Gap Analysis */}
              {(comp.gap_analysis_ar || comp.gap_analysis_en) && (
                <div className="gap-box">
                  <h4 className="gap-title">
                    <span>💡</span>
                    {isRTL ? 'تحليل الفجوة وما ينقصنا للسيطرة:' : 'Gap Analysis & What is Missing to Dominate:'}
                  </h4>
                  <p className="gap-desc">
                    {isRTL ? comp.gap_analysis_ar : comp.gap_analysis_en}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit Competitor */}
      {(showAddCompetitor || editingCompetitor) && (
        <div className="modal-overlay" onClick={() => { setShowAddCompetitor(false); setEditingCompetitor(null); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              ⚔️ {editingCompetitor ? (isRTL ? 'تعديل بيانات المنافس' : 'Edit Competitor') : (isRTL ? 'إضافة منافس جديد' : 'Add New Competitor')}
            </h3>
            <form onSubmit={handleSaveCompetitor}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
                  <input type="text" required value={competitorForm.name_en} onChange={e => setCompetitorForm({ ...competitorForm, name_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                  <input type="text" required value={competitorForm.name_ar} onChange={e => setCompetitorForm({ ...competitorForm, name_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'التصنيف بالإنجليزية' : 'Category (English)'}</label>
                  <input type="text" required value={competitorForm.category_en} onChange={e => setCompetitorForm({ ...competitorForm, category_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'التصنيف بالعربية' : 'Category (Arabic)'}</label>
                  <input type="text" required value={competitorForm.category_ar} onChange={e => setCompetitorForm({ ...competitorForm, category_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'مؤشر القوة التنافسية (1-5 نجوم)' : 'Strength Rating (1-5 Stars)'}</label>
                  <select value={competitorForm.strength_rating} onChange={e => setCompetitorForm({ ...competitorForm, strength_rating: Number(e.target.value) })}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'تحليل الفجوة بالإنجليزية' : 'Gap Analysis (English)'}</label>
                  <textarea rows={3} value={competitorForm.gap_analysis_en} onChange={e => setCompetitorForm({ ...competitorForm, gap_analysis_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'تحليل الفجوة بالعربية' : 'Gap Analysis (Arabic)'}</label>
                  <textarea rows={3} value={competitorForm.gap_analysis_ar} onChange={e => setCompetitorForm({ ...competitorForm, gap_analysis_ar: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" disabled={isPending} className="submit-btn">{isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ 💾' : 'Save 💾')}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => { setShowAddCompetitor(false); setEditingCompetitor(null); }}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Comparison Mapping */}
      {(addingComparisonForId || editingComparison) && (
        <div className="modal-overlay" onClick={() => { setAddingComparisonForId(null); setEditingComparison(null); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              ✨ {editingComparison ? (isRTL ? 'تعديل مقارنة الميزة' : 'Edit Comparison') : (isRTL ? 'مقارنة ميزة جديدة' : 'Compare New Feature')}
            </h3>
            <form onSubmit={handleSaveComparison}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'اسم الميزة بالإنجليزية' : 'Feature Name (English)'}</label>
                  <input type="text" required value={comparisonForm.feature_name_en} onChange={e => setComparisonForm({ ...comparisonForm, feature_name_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'اسم الميزة بالعربية' : 'Feature Name (Arabic)'}</label>
                  <input type="text" required value={comparisonForm.feature_name_ar} onChange={e => setComparisonForm({ ...comparisonForm, feature_name_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'حالة الميزة لدى المنافس (بالإنجليزية)' : 'Rival Feature Status (English)'}</label>
                  <input type="text" placeholder="e.g. ❌ Not Supported" required value={comparisonForm.status_in_competitor_en} onChange={e => setComparisonForm({ ...comparisonForm, status_in_competitor_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'حالة الميزة لدى المنافس (بالعربية)' : 'Rival Feature Status (Arabic)'}</label>
                  <input type="text" placeholder="e.g. ❌ غير مدعوم" required value={comparisonForm.status_in_competitor_ar} onChange={e => setComparisonForm({ ...comparisonForm, status_in_competitor_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'رقم المرحلة المطلوبة لتفعيلها في فايندورا' : 'Required Phase Number for Findora'}</label>
                  <input type="number" required min={1} max={50} value={comparisonForm.required_phase_number} onChange={e => setComparisonForm({ ...comparisonForm, required_phase_number: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'وصف ميزة فايندورا بالإنجليزية' : 'Findora Advantage Description (English)'}</label>
                  <input type="text" required value={comparisonForm.advantage_desc_en} onChange={e => setComparisonForm({ ...comparisonForm, advantage_desc_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'وصف ميزة فايندورا بالعربية' : 'Findora Advantage Description (Arabic)'}</label>
                  <input type="text" required value={comparisonForm.advantage_desc_ar} onChange={e => setComparisonForm({ ...comparisonForm, advantage_desc_ar: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" disabled={isPending} className="submit-btn">{isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ 💾' : 'Save 💾')}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => { setAddingComparisonForId(null); setEditingComparison(null); }}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
