'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveProjectPhaseAction, deleteProjectPhaseAction } from '../customers/actions';

interface Phase {
  id: string;
  phase_number: number;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  tip_en?: string;
  tip_ar?: string;
  status: string;
  tags?: string[];
  target_merchants: number;
  target_customers: number;
  target_deals: number;
  target_requests: number;
  progress_override?: number;
  created_at: string;
}

interface RoadmapClientProps {
  locale: string;
  initialPhases: Phase[];
  actualMetrics: {
    merchants: number;
    customers: number;
    deals: number;
    requests: number;
  };
}

export default function RoadmapClient({
  locale,
  initialPhases,
  actualMetrics
}: RoadmapClientProps) {
  const isRTL = locale === 'ar';
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    phase_number: 0,
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    tip_en: '',
    tip_ar: '',
    status: 'locked',
    tags: '',
    target_merchants: 0,
    target_customers: 0,
    target_deals: 0,
    target_requests: 0,
    progress_override: ''
  });

  const handleEdit = (ph: Phase) => {
    setEditingId(ph.id);
    setFormData({
      phase_number: ph.phase_number,
      title_en: ph.title_en,
      title_ar: ph.title_ar,
      description_en: ph.description_en || '',
      description_ar: ph.description_ar || '',
      tip_en: ph.tip_en || '',
      tip_ar: ph.tip_ar || '',
      status: ph.status,
      tags: ph.tags?.join(', ') || '',
      target_merchants: ph.target_merchants || 0,
      target_customers: ph.target_customers || 0,
      target_deals: ph.target_deals || 0,
      target_requests: ph.target_requests || 0,
      progress_override: ph.progress_override !== null && ph.progress_override !== undefined ? ph.progress_override.toString() : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المرحلة؟' : 'Are you sure you want to delete this phase?')) return;
    startTransition(async () => {
      try {
        await deleteProjectPhaseAction(id, locale);
        setPhases(phases.filter(p => p.id !== id));
      } catch (err: any) {
        alert(err.message || 'Error deleting');
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    startTransition(async () => {
      try {
        const payload = {
          ...formData,
          id: editingId || undefined,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
          progress_override: formData.progress_override !== '' ? Number(formData.progress_override) : undefined
        };
        await saveProjectPhaseAction(payload, locale);

        // Update local state optimistically
        const localUpdate: any = {
          ...payload,
          id: editingId || Math.random().toString(),
          created_at: new Date().toISOString()
        };

        if (editingId) {
          setPhases(phases.map(p => p.id === editingId ? localUpdate : p).sort((a, b) => a.phase_number - b.phase_number));
        } else {
          setPhases([...phases, localUpdate].sort((a, b) => a.phase_number - b.phase_number));
        }

        setShowForm(false);
        setEditingId(null);
        setFormData({
          phase_number: phases.length,
          title_en: '',
          title_ar: '',
          description_en: '',
          description_ar: '',
          tip_en: '',
          tip_ar: '',
          status: 'locked',
          tags: '',
          target_merchants: 0,
          target_customers: 0,
          target_deals: 0,
          target_requests: 0,
          progress_override: ''
        });
      } catch (err: any) {
        setErrorMsg(err.message || 'Error saving');
      }
    });
  };

  // Calculate dynamic progress %
  const calculateProgress = (ph: Phase) => {
    if (ph.progress_override !== null && ph.progress_override !== undefined) {
      return ph.progress_override;
    }

    const subTasks = [];
    if (ph.target_merchants > 0) subTasks.push(Math.min(100, (actualMetrics.merchants / ph.target_merchants) * 100));
    if (ph.target_customers > 0) subTasks.push(Math.min(100, (actualMetrics.customers / ph.target_customers) * 100));
    if (ph.target_deals > 0) subTasks.push(Math.min(100, (actualMetrics.deals / ph.target_deals) * 100));
    if (ph.target_requests > 0) subTasks.push(Math.min(100, (actualMetrics.requests / ph.target_requests) * 100));

    if (subTasks.length === 0) return 0;
    const sum = subTasks.reduce((a, b) => a + b, 0);
    return Math.round(sum / subTasks.length);
  };

  return (
    <div className="roadmap-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .roadmap-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }
        
        .add-btn { width: 100%; padding: 16px; background: rgba(59, 130, 246, 0.1); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 16px; color: #60a5fa; font-weight: 900; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-bottom: 30px; }
        .add-btn:hover { background: rgba(59, 130, 246, 0.18); border-color: #60a5fa; }
        
        /* Form Card */
        .form-card { background: linear-gradient(135deg, rgba(20, 25, 45, 0.5) 0%, rgba(10, 12, 25, 0.7) 100%); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 24px; padding: 25px; margin-bottom: 30px; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full-width { grid-column: span 2; }
        @media (max-width: 600px) { .form-group.full-width { grid-column: span 1; } }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input, .form-group select, .form-group textarea { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #3b82f6; outline: none; }
        
        .actions-row { display: flex; gap: 12px; margin-top: 20px; }
        .save-btn { padding: 12px 24px; background: #3b82f6; color: white; border: none; font-weight: 800; border-radius: 12px; cursor: pointer; }
        .cancel-btn { padding: 12px 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-weight: 800; border-radius: 12px; cursor: pointer; }
        
        /* Phase List matching mockup */
        .phases-container { display: flex; flex-direction: column; gap: 20px; }
        
        .phase-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 24px;
          position: relative;
          transition: all 0.2s;
        }
        .phase-card.active {
          border-color: #3b82f6;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.02) 0%, rgba(2, 6, 23, 0) 100%);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.03);
        }
        
        .phase-meta { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 850; letter-spacing: 0.05em; }
        .phase-title { font-size: 1.25rem; font-weight: 900; color: white; margin: 4px 0 12px; }
        .phase-desc { font-size: 0.9rem; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 15px; }
        
        /* Tip box styling */
        .tip-box { background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 10px; }
        .tip-text { font-size: 0.85rem; color: #10b981; margin: 0; line-height: 1.5; }
        
        /* Badges */
        .badges-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
        .badge { padding: 4px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-size: 0.75rem; font-weight: 900; color: rgba(255,255,255,0.5); }
        .badge.target { background: rgba(59,130,246,0.04); border-color: rgba(59,130,246,0.1); color: #60a5fa; }
        
        /* Progress slider at the bottom */
        .progress-bar-wrap { margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 15px; display: flex; align-items: center; justify-content: space-between; }
        .progress-bar { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; flex: 1; margin: 0 15px; overflow: hidden; }
        .progress-fill { height: 100%; background: #3b82f6; border-radius: 3px; transition: width 0.3s; }
        .progress-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 850; text-transform: uppercase; }
        
        /* Status badge */
        .status-tag { position: absolute; top: 24px; right: 24px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; padding: 4px 10px; border-radius: 8px; display: flex; align-items: center; gap: 5px; }
        [dir="rtl"] .status-tag { right: auto; left: 24px; }
        .status-tag.active { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .status-tag.next { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-tag.locked { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }
        
        .controls { position: absolute; bottom: 20px; right: 24px; display: flex; gap: 10px; }
        [dir="rtl"] .controls { right: auto; left: 24px; }
        .control-btn { background: transparent; border: none; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; font-size: 0.9rem; }
        .control-btn:hover { opacity: 1; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'مراحل وتطور المشروع' : 'Project Roadmap'}</h1>
          <p className="subtitle">
            {isRTL ? 'التخطيط لمراحل المشروع بالترتيب الزمني وتتبع نسبة إنجازها آلياً.' : 'Plan, organize and track project milestones dynamically.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {!showForm ? (
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + {isRTL ? 'مرحلة جديدة' : 'New Project Phase'}
        </button>
      ) : (
        <form className="form-card" onSubmit={handleSave}>
          <h3 className="form-title" style={{ color: '#3b82f6' }}>
            {editingId ? (isRTL ? 'تعديل المرحلة' : 'Edit Phase') : (isRTL ? 'إضافة مرحلة جديدة' : 'Add New Phase')}
          </h3>

          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px' }}>⚠️ {errorMsg}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>{isRTL ? 'رقم المرحلة' : 'Phase Number'}</label>
              <input 
                type="number" 
                required
                value={formData.phase_number} 
                onChange={e => setFormData({ ...formData, phase_number: Number(e.target.value) })} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'الاسم (بالعربية)' : 'Title (Arabic)'}</label>
              <input 
                type="text" 
                required
                value={formData.title_ar} 
                onChange={e => setFormData({ ...formData, title_ar: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'الاسم (بالإنجليزية)' : 'Title (English)'}</label>
              <input 
                type="text" 
                required
                value={formData.title_en} 
                onChange={e => setFormData({ ...formData, title_en: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'الحالة' : 'Status'}</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">{isRTL ? 'تعمل عليها' : 'Active'}</option>
                <option value="next">{isRTL ? 'التالية' : 'Next'}</option>
                <option value="locked">{isRTL ? 'مغلقة' : 'Locked'}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{isRTL ? 'الوصف (بالعربية)' : 'Description (Arabic)'}</label>
              <textarea 
                rows={2}
                value={formData.description_ar} 
                onChange={e => setFormData({ ...formData, description_ar: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'الوصف (بالإنجليزية)' : 'Description (English)'}</label>
              <textarea 
                rows={2}
                value={formData.description_en} 
                onChange={e => setFormData({ ...formData, description_en: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'نصيحة ذكاء الأعمال 💡 (بالعربية)' : 'Strategic Tip 💡 (Arabic)'}</label>
              <input 
                type="text" 
                value={formData.tip_ar} 
                onChange={e => setFormData({ ...formData, tip_ar: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'نصيحة ذكاء الأعمال 💡 (بالإنجليزية)' : 'Strategic Tip 💡 (English)'}</label>
              <input 
                type="text" 
                value={formData.tip_en} 
                onChange={e => setFormData({ ...formData, tip_en: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'الوسوم والبادجات (مفصولة بفاصلة)' : 'Badges / Tags (comma-separated)'}</label>
              <input 
                type="text" 
                value={formData.tags} 
                onChange={e => setFormData({ ...formData, tags: e.target.value })} 
                placeholder="AI, UX, Payments..."
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'التقدم اليدوي % (اتركه فارغاً للحساب التلقائي)' : 'Progress Override % (Leave empty for dynamic)'}</label>
              <input 
                type="number" 
                value={formData.progress_override} 
                onChange={e => setFormData({ ...formData, progress_override: e.target.value })} 
                placeholder="Auto"
              />
            </div>

            <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px', marginTop: '10px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                🎯 {isRTL ? 'الأهداف المطلوبة لقفل المرحلة تلقائياً:' : 'Dynamic Completion Milestones:'}
              </h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'عدد الموردين المستهدف' : 'Target Merchants'}</label>
                  <input type="number" value={formData.target_merchants} onChange={e => setFormData({ ...formData, target_merchants: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'عدد العملاء المستهدف' : 'Target Customers'}</label>
                  <input type="number" value={formData.target_customers} onChange={e => setFormData({ ...formData, target_customers: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'عدد الصفقات المستهدف' : 'Target Deals'}</label>
                  <input type="number" value={formData.target_deals} onChange={e => setFormData({ ...formData, target_deals: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'عدد الطلبات المستهدف' : 'Target Requests'}</label>
                  <input type="number" value={formData.target_requests} onChange={e => setFormData({ ...formData, target_requests: Number(e.target.value) })} />
                </div>
              </div>
            </div>
          </div>

          <div className="actions-row">
            <button type="submit" disabled={isPending} className="save-btn">
              {isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ المرحلة 💾' : 'Save Phase 💾')}
            </button>
            <button type="button" className="cancel-btn" onClick={() => { setShowForm(false); setEditingId(null); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Phases timeline list */}
      <div className="phases-container">
        {phases.map(ph => {
          const progress = calculateProgress(ph);
          const title = isRTL ? ph.title_ar : ph.title_en;
          const desc = isRTL ? ph.description_ar : ph.description_en;
          const tip = isRTL ? ph.tip_ar : ph.tip_en;

          return (
            <div key={ph.id} className={`phase-card ${ph.status === 'active' ? 'active' : ''}`}>
              <div className={`status-tag ${ph.status}`}>
                {ph.status === 'active' && (isRTL ? '🔵 تعمل عليها' : '🔵 Active')}
                {ph.status === 'next' && (isRTL ? '⏳ التالية' : '⏳ Next')}
                {ph.status === 'locked' && (isRTL ? '🔒 مغلقة' : '🔒 Locked')}
              </div>

              <div className="phase-meta">Phase {ph.phase_number}</div>
              <h3 className="phase-title">{title}</h3>
              {desc && <p className="phase-desc">{desc}</p>}

              {tip && (
                <div className="tip-box">
                  <span style={{ fontSize: '1.1rem' }}>💡</span>
                  <p className="tip-text">{tip}</p>
                </div>
              )}

              <div className="badges-row">
                {ph.tags?.map(t => (
                  <span key={t} className="badge">{t}</span>
                ))}
                
                {ph.target_merchants > 0 && (
                  <span className="badge target">
                    {isRTL 
                      ? `${actualMetrics.merchants} / ${ph.target_merchants} تاجر` 
                      : `Merchants: ${actualMetrics.merchants}/${ph.target_merchants}`}
                  </span>
                )}
                {ph.target_customers > 0 && (
                  <span className="badge target">
                    {isRTL 
                      ? `${actualMetrics.customers} / ${ph.target_customers} عميل` 
                      : `Customers: ${actualMetrics.customers}/${ph.target_customers}`}
                  </span>
                )}
                {ph.target_deals > 0 && (
                  <span className="badge target">
                    {isRTL 
                      ? `${actualMetrics.deals} / ${ph.target_deals} صفقة` 
                      : `Deals: ${actualMetrics.deals}/${ph.target_deals}`}
                  </span>
                )}
                {ph.target_requests > 0 && (
                  <span className="badge target">
                    {isRTL 
                      ? `${actualMetrics.requests} / ${ph.target_requests} طلب` 
                      : `Requests: ${actualMetrics.requests}/${ph.target_requests}`}
                  </span>
                )}
              </div>

              <div className="progress-bar-wrap">
                <span className="progress-label">{isRTL ? 'نسبة التقدم' : 'Progress'}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-label" style={{ minWidth: '40px', textAlign: 'right' }}>{progress}%</span>
              </div>

              <div className="controls">
                <button className="control-btn" onClick={() => handleEdit(ph)}>✏️</button>
                <button className="control-btn" onClick={() => handleDelete(ph.id)}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
