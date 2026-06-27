'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { saveProjectFeatureAction, deleteProjectFeatureAction } from '../customers/actions';

interface ProjectFeature {
  id: string;
  name_en: string;
  name_ar: string;
  phase_number: number;
  status: 'Idea' | 'Discovery' | 'Prototype' | 'Beta' | 'Live' | 'Deprecated';
  notes_en?: string;
  notes_ar?: string;
}

interface SystemConfigFlag {
  config_key: string;
  value: boolean;
  description_en: string;
  description_ar: string;
}

interface FeaturesClientProps {
  locale: string;
  initialFeatures: ProjectFeature[];
  initialFlags?: SystemConfigFlag[];
}

export default function FeaturesClient({
  locale,
  initialFeatures,
  initialFlags = []
}: FeaturesClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [features, setFeatures] = useState<ProjectFeature[]>(initialFeatures);
  const [flags, setFlags] = useState<SystemConfigFlag[]>(initialFlags);
  const [isPending, startTransition] = useTransition();

  // Add/Edit Form State
  const [formData, setFormData] = useState<{
    id: string;
    name_en: string;
    name_ar: string;
    phase_number: number;
    status: ProjectFeature['status'];
    notes_en: string;
    notes_ar: string;
  }>({
    id: '',
    name_en: '',
    name_ar: '',
    phase_number: 0,
    status: 'Idea',
    notes_en: '',
    notes_ar: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  // Status mapping for visual cues
  const statusConfig = {
    Idea: { labelAr: 'Idea 💡', labelEn: 'Idea 💡', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    Discovery: { labelAr: 'Discovery 🔍', labelEn: 'Discovery 🔍', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    Prototype: { labelAr: 'Prototype 🔧', labelEn: 'Prototype 🔧', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    Beta: { labelAr: 'Beta 🧪', labelEn: 'Beta 🧪', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
    Live: { labelAr: 'Live 🟩', labelEn: 'Live 🟩', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    Deprecated: { labelAr: 'Deprecated ⚠️', labelEn: 'Deprecated ⚠️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_en || !formData.name_ar) {
      toast(isRTL ? 'يرجى إدخال اسم الميزة باللغتين' : 'Please input the feature name in both languages', { type: 'error' });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          id: formData.id || undefined,
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          phase_number: Number(formData.phase_number),
          status: formData.status,
          notes_en: formData.notes_en,
          notes_ar: formData.notes_ar
        };

        await saveProjectFeatureAction(payload, locale);

        if (formData.id) {
          // Edit local update
          setFeatures(prev =>
            prev
              .map(f => (f.id === formData.id ? { ...f, ...payload } as ProjectFeature : f))
              .sort((a, b) => a.phase_number - b.phase_number)
          );
          toast(isRTL ? 'تم تحديث الميزة بنجاح' : 'Feature updated successfully!', { type: 'success', title: '✅' });
        } else {
          // Insert simulated local update (will reload on page refresh anyway)
          const tempId = Math.random().toString();
          const { id: _, ...rest } = payload;
          setFeatures(prev =>
            [...prev, { id: tempId, ...rest } as ProjectFeature].sort(
              (a, b) => a.phase_number - b.phase_number
            )
          );
          toast(isRTL ? 'تم إضافة الميزة بنجاح' : 'Feature added successfully!', { type: 'success', title: '🚀' });
        }

        // Reset form
        setFormData({
          id: '',
          name_en: '',
          name_ar: '',
          phase_number: 0,
          status: 'Idea',
          notes_en: '',
          notes_ar: ''
        });
        setIsEditing(false);
      } catch (err: any) {
        toast(err.message || 'Error saving feature', { type: 'error' });
      }
    });
  };

  const handleStatusChange = (id: string, newStatus: ProjectFeature['status']) => {
    const targetFeature = features.find(f => f.id === id);
    if (!targetFeature) return;

    startTransition(async () => {
      try {
        const payload = {
          id: targetFeature.id,
          name_en: targetFeature.name_en,
          name_ar: targetFeature.name_ar,
          phase_number: targetFeature.phase_number,
          status: newStatus,
          notes_en: targetFeature.notes_en,
          notes_ar: targetFeature.notes_ar
        };

        await saveProjectFeatureAction(payload, locale);
        setFeatures(prev => prev.map(f => (f.id === id ? { ...f, status: newStatus } : f)));
        toast(isRTL ? 'تم تغيير الحالة بنجاح' : 'Status updated successfully!', { type: 'success', title: '📋' });
      } catch (err: any) {
        toast(err.message || 'Error updating status', { type: 'error' });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الميزة؟' : 'Are you sure you want to delete this feature?')) return;

    startTransition(async () => {
      try {
        await deleteProjectFeatureAction(id, locale);
        setFeatures(prev => prev.filter(f => f.id !== id));
        toast(isRTL ? 'تم حذف الميزة' : 'Feature deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error deleting feature', { type: 'error' });
      }
    });
  };

  const handleEditClick = (feat: ProjectFeature) => {
    setFormData({
      id: feat.id,
      name_en: feat.name_en,
      name_ar: feat.name_ar,
      phase_number: feat.phase_number,
      status: feat.status,
      notes_en: feat.notes_en || '',
      notes_ar: feat.notes_ar || ''
    });
    setIsEditing(true);
    // Scroll form into view
    const formElem = document.getElementById('feature-form-section');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleFlag = (configKey: string, currentValue: boolean) => {
    const newValue = !currentValue;
    startTransition(async () => {
      try {
        const res = await fetch('/api/staff/feature-flags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            config_key: configKey,
            value: newValue
          })
        });

        if (!res.ok) {
          throw new Error('Failed to toggle feature');
        }

        setFlags(prev => prev.map(f => f.config_key === configKey ? { ...f, value: newValue } : f));
        toast(isRTL ? 'تم تحديث حالة الميزة بنجاح' : 'Feature state updated successfully!', { type: 'success' });
      } catch (err: any) {
        toast(err.message || 'Error updating feature toggle', { type: 'error' });
      }
    });
  };

  return (
    <div className="features-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .features-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .flags-container { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 25px; margin-bottom: 40px; }
        .flags-title { font-size: 1.4rem; font-weight: 900; color: white; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
        .flags-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        @media (max-width: 768px) { .flags-grid { grid-template-columns: 1fr; } }
        
        .flag-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          transition: all 0.2s;
        }
        .flag-card:hover { border-color: rgba(212,166,60,0.2); background: rgba(255,255,255,0.03); }
        .flag-info { flex: 1; }
        .flag-name { font-size: 1rem; font-weight: 900; color: white; margin-bottom: 3px; }
        .flag-desc { font-size: 0.8rem; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.35; }
        
        .toggle-switch { position: relative; display: inline-block; width: 46px; height: 24px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(255,255,255,0.1); transition: .3s; border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .slider:before {
          position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px;
          background-color: white; transition: .3s; border-radius: 50%;
        }
        input:checked + .slider { background-color: var(--accent, #c8973b); }
        input:checked + .slider:before { transform: translateX(22px); background-color: black; }

        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Banner styling */
        .features-banner {
          background: radial-gradient(circle at top, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 24px;
          padding: 30px;
          text-align: center;
          margin-bottom: 35px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .features-banner-title { font-size: 1.8rem; font-weight: 950; color: #f7d46b; margin: 0 0 10px; }
        .features-banner-flow { font-size: 0.95rem; color: #818cf8; font-weight: 800; margin: 0; word-spacing: 2px; }

        /* Feature Row Card */
        .features-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 40px; }
        .feature-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 20px 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.25s ease;
        }
        .feature-card:hover {
          border-color: rgba(212,166,60,0.25);
          background: rgba(255,255,255,0.04);
          transform: translateY(-2px);
        }
        
        .feature-main { display: flex; align-items: center; gap: 20px; flex: 1; }
        .feature-info { flex: 1; }
        
        .feature-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .feature-name { font-size: 1.2rem; font-weight: 900; color: #ffffff; }
        .feature-phase-badge { font-size: 0.75rem; font-weight: 850; color: #a855f7; padding: 2px 8px; border-radius: 6px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2); }
        .feature-notes { font-size: 0.9rem; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.4; }

        /* Status selector dropdown style */
        .status-select-wrapper { position: relative; }
        .status-select {
          appearance: none;
          background-color: transparent;
          border: 1px solid;
          border-radius: 10px;
          padding: 8px 30px 8px 16px;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        [dir="rtl"] .status-select { padding: 8px 16px 8px 30px; }
        .status-select-wrapper::after {
          content: '▼';
          font-size: 0.6rem;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(255,255,255,0.5);
        }
        [dir="rtl"] .status-select-wrapper::after { right: auto; left: 12px; }

        /* Action Buttons */
        .feature-actions { display: flex; gap: 8px; margin-left: 20px; }
        [dir="rtl"] .feature-actions { margin-left: 0; margin-right: 20px; }
        .btn-action { background: none; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); padding: 6px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 0.8rem; }
        .btn-action:hover { background: rgba(255,255,255,0.06); color: white; border-color: rgba(255,255,255,0.2); }
        .btn-delete:hover { background: rgba(239,68,68,0.15); color: #ef4444; border-color: rgba(239,68,68,0.3); }

        /* Form styling */
        .form-section {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        .form-section-title { font-size: 1.4rem; font-weight: 900; color: white; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; }
        
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group.full-width { grid-column: span 2; }
        .form-group label { font-size: 0.85rem; font-weight: 800; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
        
        .form-input, .form-select, .form-textarea {
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-family: inherit;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #f7d46b;
          box-shadow: 0 0 0 2px rgba(247,212,107,0.15);
        }

        .btn-submit {
          background: linear-gradient(135deg, #d4a63c 0%, #b28522 100%);
          border: none;
          color: #1e1b18;
          font-weight: 900;
          font-size: 1rem;
          padding: 14px 28px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(212,166,60,0.3); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-cancel {
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          font-weight: 800;
          font-size: 0.95rem;
          padding: 14px 24px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:hover { background: rgba(255,255,255,0.05); color: white; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'دورة حياة الميزات' : 'Feature Lifecycle'}</h1>
          <p className="subtitle">
            {isRTL 
              ? 'تتبع حالة ومراحل بناء ميزات نظام فايندورا المختلفة.' 
              : 'Track the status and phases of various features in the Findora system.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← لوحة الذكاء' : '← Intelligence'}
        </Link>
      </header>

      {/* Banner / Guide */}
      <section className="features-banner">
        <h2 className="features-banner-title">
          {isRTL ? 'كل Feature لها مسار واضح 📋' : 'Every Feature Has a Clear Lifecycle 📋'}
        </h2>
        <p className="features-banner-flow">
          Idea ➔ Discovery ➔ Prototype ➔ Beta ➔ Live ➔ Deprecated
        </p>
      </section>

      {/* Dynamic Landing Page & Core System Feature Toggles Control Center */}
      {flags.length > 0 && (
        <section className="flags-container">
          <h2 className="flags-title">
            {isRTL ? '🎛️ وحدة التحكم بميزات اللاندينج والأنظمة الأساسية' : '🎛️ Dynamic Feature Flags & Landing Control Center'}
          </h2>
          <div className="flags-grid">
            {flags.map((flag) => {
              const displayName = isRTL ? flag.description_ar : flag.description_en;
              return (
                <div key={flag.config_key} className="flag-card">
                  <div className="flag-info">
                    <h4 className="flag-name">{flag.config_key.replace('flag_', '').replace(/_/g, ' ').toUpperCase()}</h4>
                    <p className="flag-desc">{displayName}</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={flag.value}
                      onChange={() => handleToggleFlag(flag.config_key, flag.value)}
                      disabled={isPending}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Features List Section Heading */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '20px', color: 'white' }}>
        {isRTL ? '📋 خريطة الميزات العامة (Roadmap Features)' : '📋 Roadmap Feature Lifecycle Map'}
      </h2>

      {/* Features List */}

      <div className="features-list">
        {features.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              {isRTL ? 'لا توجد ميزات مسجلة حالياً.' : 'No features currently registered.'}
            </p>
          </div>
        ) : (
          features.map(feat => {
            const currentStatus = feat.status;
            const config = statusConfig[currentStatus] || { color: '#ffffff', bg: 'rgba(255,255,255,0.1)', labelAr: currentStatus, labelEn: currentStatus };
            const displayName = isRTL ? feat.name_ar : feat.name_en;
            const displayNotes = isRTL ? feat.notes_ar : feat.notes_en;

            return (
              <div key={feat.id} className="feature-card">
                <div className="feature-main">
                  {/* Status Dropdown Trigger */}
                  <div className="status-select-wrapper">
                    <select
                      className="status-select"
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(feat.id, e.target.value as ProjectFeature['status'])}
                      disabled={isPending}
                      style={{
                        color: config.color,
                        backgroundColor: config.bg,
                        borderColor: `${config.color}35`
                      }}
                    >
                      {Object.entries(statusConfig).map(([key, val]) => (
                        <option key={key} value={key} style={{ backgroundColor: '#1e1b18', color: val.color }}>
                          {isRTL ? val.labelAr : val.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="feature-info">
                    <div className="feature-title-row">
                      <h3 className="feature-name">{displayName}</h3>
                      <span className="feature-phase-badge">Phase {feat.phase_number}</span>
                    </div>
                    {displayNotes && <p className="feature-notes">{displayNotes}</p>}
                  </div>
                </div>

                <div className="feature-actions">
                  <button className="btn-action" onClick={() => handleEditClick(feat)} disabled={isPending}>
                    ✏️ {isRTL ? 'تعديل' : 'Edit'}
                  </button>
                  <button className="btn-action btn-delete" onClick={() => handleDelete(feat.id)} disabled={isPending}>
                    🗑️ {isRTL ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Form */}
      <section className="form-section" id="feature-form-section">
        <h2 className="form-section-title">
          {isEditing 
            ? (isRTL ? 'تعديل ميزة قائمة' : 'Edit Existing Feature') 
            : (isRTL ? 'إضافة ميزة جديدة (FEATURE)' : 'Add New Feature')}
        </h2>

        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>{isRTL ? 'اسم الميزة (إنجليزي)' : 'Feature Name (English)'}</label>
              <input
                className="form-input"
                type="text"
                required
                value={formData.name_en}
                onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="e.g. Reverse Auction"
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'اسم الميزة (عربي)' : 'Feature Name (Arabic)'}</label>
              <input
                className="form-input"
                type="text"
                required
                value={formData.name_ar}
                onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="مثال: المزادات العكسية"
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'رقم المرحلة (Phase)' : 'Phase Number'}</label>
              <input
                className="form-input"
                type="number"
                required
                value={formData.phase_number}
                onChange={e => setFormData({ ...formData, phase_number: Number(e.target.value) })}
                placeholder="e.g. 3"
              />
            </div>

            <div className="form-group">
              <label>{isRTL ? 'المرحلة الحالية (Status)' : 'Status'}</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as ProjectFeature['status'] })}
              >
                {Object.entries(statusConfig).map(([key, val]) => (
                  <option key={key} value={key} style={{ color: val.color }}>
                    {isRTL ? val.labelAr : val.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>{isRTL ? 'ملاحظات (إنجليزي)' : 'Notes (English)'}</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={formData.notes_en}
                onChange={e => setFormData({ ...formData, notes_en: e.target.value })}
                placeholder="Describe current stage or blockers in English..."
              />
            </div>

            <div className="form-group full-width">
              <label>{isRTL ? 'ملاحظات (عربي)' : 'Notes (Arabic)'}</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={formData.notes_ar}
                onChange={e => setFormData({ ...formData, notes_ar: e.target.value })}
                placeholder="مثال: الفكرة محددة ولم يبدأ التنفيذ بعد..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {isEditing && (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setFormData({
                    id: '',
                    name_en: '',
                    name_ar: '',
                    phase_number: 0,
                    status: 'Idea',
                    notes_en: '',
                    notes_ar: ''
                  });
                  setIsEditing(false);
                }}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            )}
            <button type="submit" className="btn-submit" disabled={isPending}>
              <span>{isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الميزة 💾' : 'Save Feature 💾')}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
