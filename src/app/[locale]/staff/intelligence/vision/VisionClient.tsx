'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  saveVisionPillarAction,
  deleteVisionPillarAction,
  saveVisionTimelineAction,
  deleteVisionTimelineAction,
  saveVisionFutureIdeaAction,
  deleteVisionFutureIdeaAction
} from '../customers/actions';

interface Pillar {
  id: string;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  icon: string;
}

interface TimelineItem {
  id: string;
  milestone_year: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
}

interface FutureIdea {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  target_phase: string;
  icon: string;
}

interface VisionClientProps {
  locale: string;
  initialPillars: Pillar[];
  initialTimeline: TimelineItem[];
  initialIdeas: FutureIdea[];
}

export default function VisionClient({
  locale,
  initialPillars,
  initialTimeline,
  initialIdeas
}: VisionClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [pillars, setPillars] = useState<Pillar[]>(initialPillars);
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);
  const [ideas, setIdeas] = useState<FutureIdea[]>(initialIdeas);
  const [isPending, startTransition] = useTransition();

  // Dialog & Form States
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [editingPillar, setEditingPillar] = useState<Pillar | null>(null);
  const [pillarForm, setPillarForm] = useState({ title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', icon: '🎯' });

  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState<TimelineItem | null>(null);
  const [timelineForm, setTimelineForm] = useState({ milestone_year: '', title_en: '', title_ar: '', description_en: '', description_ar: '' });

  const [showAddIdea, setShowAddIdea] = useState(false);
  const [editingIdea, setEditingIdea] = useState<FutureIdea | null>(null);
  const [ideaForm, setIdeaForm] = useState({ title_en: '', title_ar: '', description_en: '', description_ar: '', target_phase: '', icon: '💡' });

  // ── PILLARS CRUD ──────────────────────────────────────────
  const handleSavePillar = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = { id: editingPillar?.id, ...pillarForm };
        await saveVisionPillarAction(payload, locale);
        if (editingPillar) {
          setPillars(prev => prev.map(p => p.id === editingPillar.id ? { ...p, ...pillarForm } : p));
          setEditingPillar(null);
        } else {
          setPillars([...pillars, { id: Math.random().toString(), ...pillarForm }]);
          setShowAddPillar(false);
        }
        setPillarForm({ title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', icon: '🎯' });
        toast(isRTL ? 'تم حفظ الركيزة بنجاح' : 'Vision pillar saved!', { type: 'success', title: '💎' });
      } catch (err: any) {
        toast(err.message || 'Error saving pillar', { type: 'error' });
      }
    });
  };

  const handleDeletePillar = (id: string) => {
    startTransition(async () => {
      try {
        await deleteVisionPillarAction(id, locale);
        setPillars(pillars.filter(p => p.id !== id));
        toast(isRTL ? 'تم حذف الركيزة' : 'Pillar deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error deleting', { type: 'error' });
      }
    });
  };

  // ── TIMELINE CRUD ─────────────────────────────────────────
  const handleSaveTimeline = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = { id: editingTimeline?.id, ...timelineForm };
        await saveVisionTimelineAction(payload, locale);
        if (editingTimeline) {
          setTimeline(prev => prev.map(t => t.id === editingTimeline.id ? { ...t, ...timelineForm } : t));
          setEditingTimeline(null);
        } else {
          setTimeline([...timeline, { id: Math.random().toString(), ...timelineForm }]);
          setShowAddTimeline(false);
        }
        setTimelineForm({ milestone_year: '', title_en: '', title_ar: '', description_en: '', description_ar: '' });
        toast(isRTL ? 'تم حفظ مخطط المرحلة بنجاح' : 'Timeline item saved!', { type: 'success', title: '⏱️' });
      } catch (err: any) {
        toast(err.message || 'Error saving timeline item', { type: 'error' });
      }
    });
  };

  const handleDeleteTimeline = (id: string) => {
    startTransition(async () => {
      try {
        await deleteVisionTimelineAction(id, locale);
        setTimeline(timeline.filter(t => t.id !== id));
        toast(isRTL ? 'تم الحذف' : 'Deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  // ── FUTURE IDEAS CRUD ─────────────────────────────────────
  const handleSaveIdea = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = { id: editingIdea?.id, ...ideaForm };
        await saveVisionFutureIdeaAction(payload, locale);
        if (editingIdea) {
          setIdeas(prev => prev.map(i => i.id === editingIdea.id ? { ...i, ...ideaForm } : i));
          setEditingIdea(null);
        } else {
          setIdeas([...ideas, { id: Math.random().toString(), ...ideaForm }]);
          setShowAddIdea(false);
        }
        setIdeaForm({ title_en: '', title_ar: '', description_en: '', description_ar: '', target_phase: '', icon: '💡' });
        toast(isRTL ? 'تم حفظ الفكرة المستقبلية بنجاح' : 'Future idea saved!', { type: 'success', title: '🚀' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  const handleDeleteIdea = (id: string) => {
    startTransition(async () => {
      try {
        await deleteVisionFutureIdeaAction(id, locale);
        setIdeas(ideas.filter(i => i.id !== id));
        toast(isRTL ? 'تم الحذف' : 'Deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error', { type: 'error' });
      }
    });
  };

  return (
    <div className="vision-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .vision-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Vision Banner matching design */
        .vision-banner {
          text-align: center;
          margin-bottom: 40px;
          padding: 20px 0;
        }
        .vision-banner-title { font-size: 2rem; font-weight: 950; color: #60a5fa; margin: 0 0 8px; }
        .vision-banner-tagline { font-size: 1rem; color: #10b981; font-weight: 850; margin: 0; }

        /* Pillars display matching mockup */
        .pillars-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 40px; }
        .pillar-card {
          background: rgba(255, 255, 255, 0.012);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          position: relative;
          transition: all 0.25s;
        }
        .pillar-card:hover { background: rgba(255, 255, 255, 0.02); border-color: rgba(96, 165, 250, 0.2); }
        .pillar-icon { font-size: 2.2rem; margin-bottom: 10px; display: inline-block; }
        .pillar-name { font-size: 1.25rem; font-weight: 900; color: white; margin: 0 0 6px; }
        .pillar-desc { font-size: 0.9rem; color: rgba(255,255,255,0.5); margin: 0; }

        /* Timeline layout */
        .timeline-section { margin-bottom: 50px; }
        .sec-title { font-size: 1.3rem; font-weight: 900; color: white; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; }
        
        .timeline-wrapper { position: relative; padding-left: 30px; margin-left: 10px; border-left: 2px solid rgba(255,255,255,0.06); }
        [dir="rtl"] .timeline-wrapper { padding-left: 0; padding-right: 30px; margin-left: 0; margin-right: 10px; border-left: none; border-right: 2px solid rgba(255,255,255,0.06); }
        
        .timeline-node { position: relative; margin-bottom: 35px; }
        .timeline-node:last-child { margin-bottom: 0; }
        
        .node-dot { position: absolute; left: -37px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #60a5fa; border: 3px solid #020617; }
        [dir="rtl"] .node-dot { left: auto; right: -37px; }
        .timeline-node.active .node-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
        
        .node-year { font-size: 0.75rem; font-weight: 900; color: #60a5fa; margin-bottom: 4px; text-transform: uppercase; }
        .node-title { font-size: 1.15rem; font-weight: 900; color: white; margin: 0 0 6px; }
        .node-desc { font-size: 0.9rem; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.5; }

        /* Future Ideas Cards matching design */
        .ideas-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .idea-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          display: flex;
          gap: 20px;
          align-items: flex-start;
          transition: all 0.2s;
        }
        .idea-card:hover { border-color: rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.02); }
        .idea-icon-box { font-size: 2rem; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 16px; }
        .idea-content { flex: 1; }
        .idea-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .idea-title { font-size: 1.15rem; font-weight: 900; color: white; margin: 0; }
        .idea-tag { font-size: 0.75rem; font-weight: 850; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 4px 10px; border-radius: 8px; }
        .idea-desc { font-size: 0.88rem; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.5; }

        .card-actions { position: absolute; top: 15px; right: 15px; display: flex; gap: 6px; }
        [dir="rtl"] .card-actions { right: auto; left: 15px; }
        .btn-mini { padding: 4px 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 0.7rem; font-weight: 800; border-radius: 6px; cursor: pointer; }
        .btn-mini:hover { background: rgba(255,255,255,0.08); color: white; }
        .btn-mini.delete { color: #ef4444; border-color: rgba(239,68,68,0.2); }

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
          <h1 className="page-title">{isRTL ? '🌐 رؤية وخطة المشروع' : '🌐 Vision & Future Milestones'}</h1>
          <p className="subtitle">
            {isRTL ? 'التخطيط الإستراتيجي للمستقبل والأفكار الكبرى والجدول الزمني لتوسع المنصة.' : 'Long-term strategic timeline, expansion ideas, and core product pillars.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Main Vision Banner */}
      <section className="vision-banner">
        <h2 className="vision-banner-title">Findora 2035</h2>
        <p className="vision-banner-tagline">
          {isRTL ? 'لا ننافس أمازون — نحن نمثل المشتري' : 'We do not compete with Amazon — we represent the buyer'}
        </p>
      </section>

      {/* Pillars Section */}
      <section className="timeline-section">
        <div className="sec-title">
          <span>💎 {isRTL ? 'الركائز الأساسية للرؤية' : 'Core Vision Pillars'}</span>
          <button className="btn-mini" style={{ padding: '6px 12px' }} onClick={() => setShowAddPillar(true)}>+ Add Pillar</button>
        </div>
        <div className="pillars-list">
          {pillars.map(p => (
            <div key={p.id} className="pillar-card">
              <div className="card-actions">
                <button className="btn-mini" onClick={() => { setEditingPillar(p); setPillarForm({ title_en: p.title_en, title_ar: p.title_ar, subtitle_en: p.subtitle_en, subtitle_ar: p.subtitle_ar, icon: p.icon }); }}>✏️</button>
                <button className="btn-mini delete" onClick={() => handleDeletePillar(p.id)}>🗑️</button>
              </div>
              <span className="pillar-icon">{p.icon}</span>
              <h3 className="pillar-name">{isRTL ? p.title_ar : p.title_en}</h3>
              <p className="pillar-desc">{isRTL ? p.subtitle_ar : p.subtitle_en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Roadmaps */}
      <section className="timeline-section">
        <div className="sec-title">
          <span>🗺️ {isRTL ? 'المخطط الزمني للمشروع' : 'Project Timeline Roadmap'}</span>
          <button className="btn-mini" style={{ padding: '6px 12px' }} onClick={() => setShowAddTimeline(true)}>+ Add Milestone</button>
        </div>
        <div className="timeline-wrapper">
          {timeline.map((t, idx) => (
            <div key={t.id} className={`timeline-node ${idx === 0 ? 'active' : ''}`}>
              <div className="node-dot"></div>
              <div className="card-actions">
                <button className="btn-mini" onClick={() => { setEditingTimeline(t); setTimelineForm({ milestone_year: t.milestone_year, title_en: t.title_en, title_ar: t.title_ar, description_en: t.description_en, description_ar: t.description_ar }); }}>✏️</button>
                <button className="btn-mini delete" onClick={() => handleDeleteTimeline(t.id)}>🗑️</button>
              </div>
              <span className="node-year">{t.milestone_year}</span>
              <h4 className="node-title">{isRTL ? t.title_ar : t.title_en}</h4>
              <p className="node-desc">{isRTL ? t.description_ar : t.description_en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Future Ideas section */}
      <section className="timeline-section">
        <div className="sec-title">
          <span>💡 {isRTL ? 'أفكار مستقبلية كبرى للتوسع' : 'Big Future Expansion Ideas'}</span>
          <button className="btn-mini" style={{ padding: '6px 12px' }} onClick={() => setShowAddIdea(true)}>+ Add Concept</button>
        </div>
        <div className="ideas-grid">
          {ideas.map(idea => (
            <div key={idea.id} className="idea-card">
              <div className="card-actions">
                <button className="btn-mini" onClick={() => { setEditingIdea(idea); setIdeaForm({ title_en: idea.title_en, title_ar: idea.title_ar, description_en: idea.description_en, description_ar: idea.description_ar, target_phase: idea.target_phase, icon: idea.icon }); }}>✏️</button>
                <button className="btn-mini delete" onClick={() => handleDeleteIdea(idea.id)}>🗑️</button>
              </div>
              <span className="idea-icon-box">{idea.icon}</span>
              <div className="idea-content">
                <div className="idea-title-row">
                  <h4 className="idea-title">{isRTL ? idea.title_ar : idea.title_en}</h4>
                  <span className="idea-tag">{idea.target_phase}</span>
                </div>
                <p className="idea-desc">{isRTL ? idea.description_ar : idea.description_en}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modals */}
      {(showAddPillar || editingPillar) && (
        <div className="modal-overlay" onClick={() => { setShowAddPillar(false); setEditingPillar(null); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              💎 {editingPillar ? (isRTL ? 'تعديل الركيزة' : 'Edit Pillar') : (isRTL ? 'إضافة ركيزة رؤية جديدة' : 'Add Vision Pillar')}
            </h3>
            <form onSubmit={handleSavePillar}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'الأيقونة' : 'Icon emoji'}</label>
                  <input type="text" value={pillarForm.icon} onChange={e => setPillarForm({ ...pillarForm, icon: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العنوان بالإنجليزية' : 'Title (English)'}</label>
                  <input type="text" required value={pillarForm.title_en} onChange={e => setPillarForm({ ...pillarForm, title_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العنوان بالعربية' : 'Title (Arabic)'}</label>
                  <input type="text" required value={pillarForm.title_ar} onChange={e => setPillarForm({ ...pillarForm, title_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف بالإنجليزية' : 'Subtitle (English)'}</label>
                  <input type="text" required value={pillarForm.subtitle_en} onChange={e => setPillarForm({ ...pillarForm, subtitle_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف بالعربية' : 'Subtitle (Arabic)'}</label>
                  <input type="text" required value={pillarForm.subtitle_ar} onChange={e => setPillarForm({ ...pillarForm, subtitle_ar: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" disabled={isPending} className="submit-btn">{isPending ? 'Saving...' : 'Save 💾'}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => { setShowAddPillar(false); setEditingPillar(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showAddTimeline || editingTimeline) && (
        <div className="modal-overlay" onClick={() => { setShowAddTimeline(false); setEditingTimeline(null); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              🗺️ {editingTimeline ? (isRTL ? 'تعديل المرحلة' : 'Edit Milestone') : (isRTL ? 'إضافة مرحلة زمنية جديدة' : 'Add Timeline Milestone')}
            </h3>
            <form onSubmit={handleSaveTimeline}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'السنة المستهدفة' : 'Target Year (e.g. 2026)'}</label>
                  <input type="text" required value={timelineForm.milestone_year} onChange={e => setTimelineForm({ ...timelineForm, milestone_year: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العنوان بالإنجليزية' : 'Title (English)'}</label>
                  <input type="text" required value={timelineForm.title_en} onChange={e => setTimelineForm({ ...timelineForm, title_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العنوان بالعربية' : 'Title (Arabic)'}</label>
                  <input type="text" required value={timelineForm.title_ar} onChange={e => setTimelineForm({ ...timelineForm, title_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف والتفاصيل بالإنجليزية' : 'Description (English)'}</label>
                  <textarea rows={3} required value={timelineForm.description_en} onChange={e => setTimelineForm({ ...timelineForm, description_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف والتفاصيل بالعربية' : 'Description (Arabic)'}</label>
                  <textarea rows={3} required value={timelineForm.description_ar} onChange={e => setTimelineForm({ ...timelineForm, description_ar: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" disabled={isPending} className="submit-btn">{isPending ? 'Saving...' : 'Save 💾'}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => { setShowAddTimeline(false); setEditingTimeline(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showAddIdea || editingIdea) && (
        <div className="modal-overlay" onClick={() => { setShowAddIdea(false); setEditingIdea(null); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              💡 {editingIdea ? (isRTL ? 'تعديل الفكرة المستقبلية' : 'Edit Concept') : (isRTL ? 'إضافة فكرة مستقبلية كبرى' : 'Add Future Expansion Concept')}
            </h3>
            <form onSubmit={handleSaveIdea}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'الأيقونة' : 'Icon emoji'}</label>
                  <input type="text" value={ideaForm.icon} onChange={e => setIdeaForm({ ...ideaForm, icon: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العنوان بالإنجليزية' : 'Title (English)'}</label>
                  <input type="text" required value={ideaForm.title_en} onChange={e => setIdeaForm({ ...ideaForm, title_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العنوان بالعربية' : 'Title (Arabic)'}</label>
                  <input type="text" required value={ideaForm.title_ar} onChange={e => setIdeaForm({ ...ideaForm, title_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'المرحلة المستهدفة للبناء' : 'Target Phase (e.g. +Phase 14 ⏰)'}</label>
                  <input type="text" required value={ideaForm.target_phase} onChange={e => setIdeaForm({ ...ideaForm, target_phase: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف والتفاصيل بالإنجليزية' : 'Description (English)'}</label>
                  <textarea rows={3} required value={ideaForm.description_en} onChange={e => setIdeaForm({ ...ideaForm, description_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الوصف والتفاصيل بالعربية' : 'Description (Arabic)'}</label>
                  <textarea rows={3} required value={ideaForm.description_ar} onChange={e => setIdeaForm({ ...ideaForm, description_ar: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" disabled={isPending} className="submit-btn">{isPending ? 'Saving...' : 'Save 💾'}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => { setShowAddIdea(false); setEditingIdea(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
