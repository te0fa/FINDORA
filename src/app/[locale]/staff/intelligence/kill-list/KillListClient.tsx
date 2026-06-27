'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveKillListItemAction, deleteKillListItemAction, activateKillListItemAction } from '../customers/actions';

interface KillItem {
  id: string;
  title_en: string;
  title_ar: string;
  reason_en: string;
  reason_ar: string;
  target_phase: string;
  is_activated: boolean;
  activation_reason_ar?: string;
  activation_reason_en?: string;
  execution_plan_ar?: string;
  execution_plan_en?: string;
  activated_at?: string;
}

interface KillListClientProps {
  locale: string;
  initialItems: KillItem[];
}

export default function KillListClient({
  locale,
  initialItems
}: KillListClientProps) {
  const isRTL = locale === 'ar';
  const [items, setItems] = useState<KillItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();

  // Dialog / Modal States
  const [showAddForm, setShowAddForm] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    title_en: '',
    title_ar: '',
    reason_en: '',
    reason_ar: '',
    target_phase: ''
  });

  const [activationForm, setActivationForm] = useState({
    reason_en: '',
    reason_ar: '',
    plan_en: '',
    plan_ar: ''
  });

  // Handle Save New Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveKillListItemAction(addForm, locale);
        const newItem: KillItem = {
          id: Math.random().toString(),
          title_en: addForm.title_en,
          title_ar: addForm.title_ar,
          reason_en: addForm.reason_en,
          reason_ar: addForm.reason_ar,
          target_phase: addForm.target_phase,
          is_activated: false
        };
        setItems([...items, newItem]);
        setAddForm({
          title_en: '',
          title_ar: '',
          reason_en: '',
          reason_ar: '',
          target_phase: ''
        });
        setShowAddForm(false);
        alert(isRTL ? 'تم إضافة البند بنجاح ☠️' : 'Banned feature item added! ☠️');
      } catch (err: any) {
        alert(err.message || 'Error saving item');
      }
    });
  };

  // Handle Delete Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من إزالة هذا البند؟' : 'Are you sure you want to remove this item?')) return;
    startTransition(async () => {
      try {
        await deleteKillListItemAction(id, locale);
        setItems(items.filter(item => item.id !== id));
      } catch (err: any) {
        alert(err.message || 'Error deleting');
      }
    });
  };

  // Handle Activate Bypassed Item
  const handleActivateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activatingId) return;

    startTransition(async () => {
      try {
        const payload = {
          id: activatingId,
          activation_reason_ar: activationForm.reason_ar,
          activation_reason_en: activationForm.reason_en,
          execution_plan_ar: activationForm.plan_ar,
          execution_plan_en: activationForm.plan_en
        };
        await activateKillListItemAction(payload, locale);

        setItems(prev =>
          prev.map(item =>
            item.id === activatingId
              ? {
                  ...item,
                  is_activated: true,
                  activation_reason_ar: activationForm.reason_ar,
                  activation_reason_en: activationForm.reason_en,
                  execution_plan_ar: activationForm.plan_ar,
                  execution_plan_en: activationForm.plan_en,
                  activated_at: new Date().toISOString()
                }
              : item
          )
        );
        setActivatingId(null);
        setActivationForm({ reason_en: '', reason_ar: '', plan_en: '', plan_ar: '' });
        alert(isRTL ? 'تم تفعيل البند استثنائياً بنجاح! 🚀' : 'Bypassed feature activated! 🚀');
      } catch (err: any) {
        alert(err.message || 'Error activating');
      }
    });
  };

  return (
    <div className="kill-list-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .kill-list-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Warning Header Banner matching mockup */
        .kill-banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(20, 10, 10, 0.4) 100%);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 20px;
          padding: 25px;
          margin-bottom: 30px;
          text-align: center;
          position: relative;
        }
        .banner-tag { font-size: 0.75rem; font-weight: 900; color: #ef4444; background: rgba(239, 68, 68, 0.12); padding: 4px 12px; border-radius: 8px; display: inline-block; margin-bottom: 12px; text-transform: uppercase; }
        .banner-title { font-size: 1.4rem; font-weight: 900; color: white; margin: 0 0 8px; }
        .banner-desc { font-size: 0.95rem; color: #f87171; margin: 0; font-weight: 700; }

        /* Actions row */
        .actions-row { display: flex; justify-content: flex-end; margin-bottom: 25px; }
        .submit-btn { padding: 12px 24px; background: #ef4444; color: white; border: none; font-weight: 850; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover { background: #dc2626; }

        /* Item Grid cards matching mockup */
        .items-container { display: flex; flex-direction: column; gap: 15px; }
        
        .item-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          transition: all 0.25s;
        }
        .item-card.activated {
          border-color: rgba(16, 185, 129, 0.3);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.02) 0%, rgba(2, 6, 23, 0) 100%);
        }
        
        .item-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: #ef4444; font-weight: 850; text-transform: uppercase; margin-bottom: 6px; }
        .item-meta.activated { color: #10b981; }
        .item-title { font-size: 1.25rem; font-weight: 900; color: white; margin: 0 0 10px; display: flex; align-items: center; gap: 10px; }
        .item-desc { font-size: 0.9rem; color: rgba(255,255,255,0.65); line-height: 1.5; margin-bottom: 15px; }
        
        /* Bypass box styling */
        .bypass-box { background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.12); border-radius: 12px; padding: 12px 16px; margin-top: 15px; }
        .bypass-text { font-size: 0.85rem; color: #10b981; margin: 0 0 8px; line-height: 1.4; }

        .btn-inline { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); font-size: 0.8rem; font-weight: 800; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-inline:hover { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.3); }
        .btn-inline.activate-action { color: #f59e0b; border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.02); }
        .btn-inline.activate-action:hover { background: rgba(245,158,11,0.08); color: #f59e0b; }

        .delete-icon { position: absolute; top: 24px; right: 24px; color: #ef4444; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
        [dir="rtl"] .delete-icon { right: auto; left: 24px; }
        .delete-icon:hover { opacity: 1; }

        /* Modals */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { width: 100%; max-width: 550px; background: #080c14; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 30px; }
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input, .form-group textarea { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        .form-group input:focus, .form-group textarea:focus { border-color: #ef4444; outline: none; }
        
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'قائمة المحظورات والتركيز ☠️' : 'Startup Kill List ☠️'}</h1>
          <p className="subtitle">
            {isRTL ? 'تحديد الخواص والأقسام الممنوع بناؤها لحماية المشروع من الموت المبكر.' : 'Banned features and modules that we should avoid to prevent premature project death.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Warning banner */}
      <section className="kill-banner">
        <span className="banner-tag">Banned Items list</span>
        <h2 className="banner-title">{isRTL ? 'ما لن نبنيه الآن | KILL LIST' : 'What we won\'t build now | KILL LIST'}</h2>
        <p className="banner-desc">
          {isRTL ? 'الوضوح فيما لا تفعله يحميك من التشتت.' : 'Clarity in what you do NOT do protects you from distraction.'}
        </p>
      </section>

      {/* Actions */}
      <div className="actions-row">
        <button className="submit-btn" onClick={() => setShowAddForm(true)}>
          + {isRTL ? 'إضافة بند محظور' : 'Add Banned Item'}
        </button>
      </div>

      {/* List */}
      <div className="items-container">
        {items.map(it => (
          <div key={it.id} className={`item-card ${it.is_activated ? 'activated' : ''}`}>
            <button className="delete-icon" onClick={() => handleDeleteItem(it.id)}>🗑️</button>
            <div className={`item-meta ${it.is_activated ? 'activated' : ''}`}>
              <span>{it.target_phase}</span>
              <span>{it.is_activated ? (isRTL ? '🚀 تم التفعيل الاستثنائي' : '🚀 Bypassed & Activated') : (isRTL ? '❌ محظور حالياً' : '❌ Currently Banned')}</span>
            </div>
            
            <h3 className="item-title">
              {isRTL ? '❌ ' : '❌ '}
              {isRTL ? it.title_ar : it.title_en}
            </h3>
            
            <p className="item-desc">
              {isRTL ? it.reason_ar : it.reason_en}
            </p>

            {/* Bypassed details */}
            {it.is_activated ? (
              <div className="bypass-box">
                <p className="bypass-text">
                  <strong>💡 {isRTL ? 'سبب التفعيل الاستثنائي:' : 'Activation Reason:'}</strong> {isRTL ? it.activation_reason_ar : it.activation_reason_en}
                </p>
                <p className="bypass-text" style={{ color: '#60a5fa', margin: '0' }}>
                  <strong>🛠️ {isRTL ? 'خطة التنفيذ والحل:' : 'Execution Plan:'}</strong> {isRTL ? it.execution_plan_ar : it.execution_plan_en}
                </p>
              </div>
            ) : (
              <button className="btn-inline activate-action" onClick={() => setActivatingId(it.id)}>
                ⚡ {isRTL ? 'تفعيل استثنائي لظروف خاصة' : 'Bypass / Activate under circumstances'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal Add Item */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              ❌ {isRTL ? 'إضافة بند محظور جديد للـ Kill List' : 'Add Banned Item to Kill List'}
            </h3>
            <form onSubmit={handleSaveItem}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالإنجليزية' : 'Title (English)'}</label>
                  <input type="text" required value={addForm.title_en} onChange={e => setAddForm({ ...addForm, title_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالعربية' : 'Title (Arabic)'}</label>
                  <input type="text" required value={addForm.title_ar} onChange={e => setAddForm({ ...addForm, title_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'السبب والخطورة (بالإنجليزية)' : 'Reason (English)'}</label>
                  <textarea rows={2} required value={addForm.reason_en} onChange={e => setAddForm({ ...addForm, reason_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'السبب والخطورة (بالعربية)' : 'Reason (Arabic)'}</label>
                  <textarea rows={2} required value={addForm.reason_ar} onChange={e => setAddForm({ ...addForm, reason_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'المرحلة المستهدفة للبناء في المستقبل' : 'Target Phase (Future)'}</label>
                  <input type="text" placeholder="e.g. Phase 15" required value={addForm.target_phase} onChange={e => setAddForm({ ...addForm, target_phase: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" disabled={isPending} className="submit-btn">{isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ 💾' : 'Save 💾')}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setShowAddForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bypass / Activate */}
      {activatingId && (
        <div className="modal-overlay" onClick={() => setActivatingId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b', marginBottom: '20px' }}>
              ⚡ {isRTL ? 'تفعيل بند محظور استثنائياً' : 'Bypass / Activate Banned Feature'}
            </h3>
            <form onSubmit={handleActivateItem}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'سبب التفعيل الاستثنائي والظروف الطارئة (بالعربية)' : 'Activation Reason (Arabic)'}</label>
                  <textarea rows={2} required value={activationForm.reason_ar} onChange={e => setActivationForm({ ...activationForm, reason_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'سبب التفعيل الاستثنائي والظروف الطارئة (بالإنجليزية)' : 'Activation Reason (English)'}</label>
                  <textarea rows={2} required value={activationForm.reason_en} onChange={e => setActivationForm({ ...activationForm, reason_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'خطة التنفيذ والحل والتقليل من المخاطر (بالعربية)' : 'Execution Plan (Arabic)'}</label>
                  <textarea rows={2} required value={activationForm.plan_ar} onChange={e => setActivationForm({ ...activationForm, plan_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'خطة التنفيذ والحل والتقليل من المخاطر (بالإنجليزية)' : 'Execution Plan (English)'}</label>
                  <textarea rows={2} required value={activationForm.plan_en} onChange={e => setActivationForm({ ...activationForm, plan_en: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" disabled={isPending} className="submit-btn" style={{ background: '#10b981' }}>{isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'تأكيد التفعيل 🚀' : 'Confirm Activation 🚀')}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setActivatingId(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
