'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveCompanyExperimentAction, deleteCompanyExperimentAction } from '../customers/actions';

interface Experiment {
  id: string;
  title: string;
  hypothesis?: string;
  methodology?: string;
  status: string;
  impact_analysis?: string;
  created_at: string;
}

interface ExperimentsClientProps {
  locale: string;
  initialExperiments: Experiment[];
}

export default function ExperimentsClient({
  locale,
  initialExperiments
}: ExperimentsClientProps) {
  const isRTL = locale === 'ar';
  const [experiments, setExperiments] = useState<Experiment[]>(initialExperiments);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    title: '',
    hypothesis: '',
    methodology: '',
    status: 'not_started',
    impact_analysis: ''
  });

  const [errorMsg, setErrorMsg] = useState('');

  // Stats
  const totalCount = experiments.length;
  const successCount = experiments.filter(e => e.status === 'completed_success').length;
  const failCount = experiments.filter(e => e.status === 'completed_fail').length;

  const handleEdit = (exp: Experiment) => {
    setEditingId(exp.id);
    setFormData({
      title: exp.title,
      hypothesis: exp.hypothesis || '',
      methodology: exp.methodology || '',
      status: exp.status,
      impact_analysis: exp.impact_analysis || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه التجربة؟' : 'Are you sure you want to delete this experiment?')) return;
    
    startTransition(async () => {
      try {
        await deleteCompanyExperimentAction(id, locale);
        setExperiments(experiments.filter(e => e.id !== id));
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
        const payload = editingId ? { id: editingId, ...formData } : formData;
        await saveCompanyExperimentAction(payload, locale);
        
        // Optimistic / Local update for responsive UI
        if (editingId) {
          setExperiments(experiments.map(exp => exp.id === editingId ? { ...exp, ...formData } : exp));
        } else {
          setExperiments([{
            id: Math.random().toString(),
            created_at: new Date().toISOString(),
            ...formData
          }, ...experiments]);
        }

        setShowAddForm(false);
        setEditingId(null);
        setFormData({
          title: '',
          hypothesis: '',
          methodology: '',
          status: 'not_started',
          impact_analysis: ''
        });
      } catch (err: any) {
        setErrorMsg(err.message || 'Error saving');
      }
    });
  };

  return (
    <div className="experiments-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .experiments-page {
          color: #e2e8f0;
          font-family: 'Outfit', 'Inter', sans-serif;
          max-width: 1100px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .page-title {
          font-size: 2.2rem;
          font-weight: 900;
          margin: 0 0 6px;
          color: white;
        }
        .subtitle {
          color: rgba(255,255,255,0.45);
          font-size: 0.95rem;
          margin: 0;
        }
        .back-link {
          padding: 8px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255,255,255,0.02);
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.85rem;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .back-link:hover {
          background: rgba(255,255,255,0.05);
          color: #ffffff;
        }
        
        /* Stats Dashboard Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
        }
        .stat-val {
          font-size: 2.2rem;
          font-weight: 900;
          color: #3b82f6;
          font-family: monospace;
        }
        .stat-lbl {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 5px;
        }
        
        .add-btn {
          width: 100%;
          padding: 16px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px dashed rgba(59, 130, 246, 0.3);
          border-radius: 16px;
          color: #60a5fa;
          font-weight: 900;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 30px;
        }
        .add-btn:hover {
          background: rgba(59, 130, 246, 0.18);
          border-color: #60a5fa;
        }
        
        /* Form view */
        .exp-form-card {
          background: linear-gradient(135deg, rgba(20, 25, 45, 0.5) 0%, rgba(10, 12, 25, 0.7) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 24px;
          padding: 25px;
          margin-bottom: 30px;
        }
        .form-title {
          margin: 0 0 20px;
          font-weight: 900;
          color: #3b82f6;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.8rem;
          font-weight: 800;
          color: rgba(255,255,255,0.6);
        }
        .form-group input, .form-group select, .form-group textarea {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px;
          color: white;
          font-size: 0.9rem;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #3b82f6;
          outline: none;
        }
        .actions-row {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .save-btn {
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          font-weight: 800;
          border-radius: 12px;
          cursor: pointer;
        }
        .cancel-btn {
          padding: 12px 24px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          font-weight: 800;
          border-radius: 12px;
          cursor: pointer;
        }
        
        /* Experiment List view */
        .list-title {
          font-size: 1.25rem;
          font-weight: 900;
          margin-bottom: 20px;
        }
        .exp-item {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 22px;
          margin-bottom: 20px;
          position: relative;
        }
        .exp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .exp-title-text {
          font-size: 1.15rem;
          font-weight: 900;
          color: white;
          margin: 0;
        }
        
        /* Status Badges */
        .status-badge {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 900;
          text-transform: uppercase;
        }
        .status-badge.not_started { background: rgba(234, 179, 8, 0.1); color: #eab308; }
        .status-badge.active { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .status-badge.completed_success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-badge.completed_fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        
        .exp-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 15px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 15px;
        }
        .detail-item strong {
          display: block;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .item-actions {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
        }
        [dir="rtl"] .item-actions {
          right: auto;
          left: 20px;
        }
        .control-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .control-btn:hover {
          opacity: 1;
        }
        
        .empty-list {
          text-align: center;
          padding: 60px;
          background: rgba(255,255,255,0.01);
          border: 1px dashed rgba(255,255,255,0.05);
          border-radius: 20px;
          color: rgba(255,255,255,0.4);
        }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'تجارب وقرارات الشركة' : 'Company Experiments & Decisions'}</h1>
          <p className="subtitle">
            {isRTL ? 'كل قرار في الشركة يُبنى على تجربة - لا رأي – فقط بيانات.' : 'Data-driven decisions catalog. Restricted to administrators.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-val">{totalCount}</div>
          <div className="stat-lbl">{isRTL ? 'تجربة' : 'Total Experiments'}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-val" style={{ color: '#10b981' }}>{successCount}</div>
          <div className="stat-lbl">{isRTL ? 'نجحت' : 'Successful'}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-val" style={{ color: '#ef4444' }}>{failCount}</div>
          <div className="stat-lbl">{isRTL ? 'فشلت' : 'Failed'}</div>
        </div>
      </div>

      {!showAddForm ? (
        <button className="add-btn" onClick={() => setShowAddForm(true)}>
          + {isRTL ? 'تجربة جديدة' : 'New Experiment / Decision'}
        </button>
      ) : (
        <form className="exp-form-card" onSubmit={handleSave}>
          <h3 className="form-title">
            {editingId ? (isRTL ? 'تعديل التجربة' : 'Edit Experiment') : (isRTL ? 'إضافة تجربة جديدة' : 'Add New Experiment')}
          </h3>

          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px' }}>⚠️ {errorMsg}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>{isRTL ? 'ما القرار / الفرضية المطلوب اختبارها؟' : 'What is the decision/hypothesis to test?'}</label>
              <input 
                type="text" 
                required
                value={formData.title} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                placeholder={isRTL ? 'مثال: هل سيرسل العملاء طلبات عبر واتساب؟' : 'e.g. Will customers submit orders via WhatsApp?'} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'النتيجة المتوقعة / المقاييس' : 'Hypothesis / Target metric'}</label>
              <input 
                type="text" 
                value={formData.hypothesis} 
                onChange={e => setFormData({ ...formData, hypothesis: e.target.value })} 
                placeholder={isRTL ? 'مثال: 5 طلبات في أسبوع، نسبة تحويل 30%+' : 'e.g. 5 requests in a week, 30%+ conversion rate'} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'طريقة الاختبار' : 'Methodology'}</label>
              <input 
                type="text" 
                value={formData.methodology} 
                onChange={e => setFormData({ ...formData, methodology: e.target.value })} 
                placeholder={isRTL ? 'مثال: A/B test، مقابلة شخصية، واتساب manual' : 'e.g. A/B test, personal interview...'} 
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'الحالة' : 'Status'}</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="not_started">{isRTL ? 'لم تبدأ' : 'Not Started'}</option>
                <option value="active">{isRTL ? 'تعمل (نشطة)' : 'Active (Running)'}</option>
                <option value="completed_success">{isRTL ? 'نجحت' : 'Successful'}</option>
                <option value="completed_fail">{isRTL ? 'فشلت' : 'Failed'}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{isRTL ? 'تحليل الأثر والنتيجة (كيف أثر القرار على المشروع؟)' : 'Impact analysis & outcomes (How did it affect the project?)'}</label>
              <textarea 
                rows={4}
                value={formData.impact_analysis} 
                onChange={e => setFormData({ ...formData, impact_analysis: e.target.value })} 
                placeholder={isRTL ? 'سجل هنا تفاصيل تأثير هذا القرار وما الذي تغير وكيف أثر على نمو المشروع...' : 'Describe how this decision changed metrics, outcomes, or revenue...'} 
              />
            </div>
          </div>

          <div className="actions-row">
            <button type="submit" disabled={isPending} className="save-btn">
              {isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ 💾' : 'Save 💾')}
            </button>
            <button type="button" className="cancel-btn" onClick={() => { setShowAddForm(false); setEditingId(null); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Experiments list */}
      <div className="experiments-list-wrap">
        <h3 className="list-title">{isRTL ? 'سجل التجارب والقرارات' : 'Experiments Catalog'}</h3>
        
        {experiments.length === 0 ? (
          <div className="empty-list">
            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🧪</div>
            <p>{isRTL ? 'لا توجد تجارب مسجلة بعد. ابدأ بإضافة الفرضية الأولى!' : 'No experiments registered yet.'}</p>
          </div>
        ) : (
          <div className="list-container">
            {experiments.map(exp => (
              <div key={exp.id} className="exp-item">
                <div className="item-actions">
                  <button className="control-btn" onClick={() => handleEdit(exp)}>✏️</button>
                  <button className="control-btn" onClick={() => handleDelete(exp.id)}>🗑️</button>
                </div>

                <div className="exp-header">
                  <div>
                    <h4 className="exp-title-text">{exp.title}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
                      {new Date(exp.created_at).toLocaleString(locale)}
                    </span>
                  </div>
                  <span className={`status-badge ${exp.status}`}>
                    {exp.status === 'not_started' && (isRTL ? '⏳ لم تبدأ' : '⏳ Not Started')}
                    {exp.status === 'active' && (isRTL ? '🔵 تعمل' : '🔵 Active')}
                    {exp.status === 'completed_success' && (isRTL ? '✅ نجحت' : '✅ Successful')}
                    {exp.status === 'completed_fail' && (isRTL ? '❌ فشلت' : '❌ Failed')}
                  </span>
                </div>

                <div className="exp-details-grid">
                  <div className="detail-item">
                    <strong>{isRTL ? 'طريقة الاختبار:' : 'Methodology:'}</strong>
                    {exp.methodology || '-'}
                  </div>
                  <div className="detail-item">
                    <strong>{isRTL ? 'النتيجة المتوقعة / المقاييس:' : 'Target Hypothesis:'}</strong>
                    {exp.hypothesis || '-'}
                  </div>
                </div>

                {exp.impact_analysis && (
                  <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <strong style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                      {isRTL ? 'تحليل الأثر والنتيجة:' : 'Impact Analysis:'}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
                      {exp.impact_analysis}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
