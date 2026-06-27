'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveStaffHrDetailsAction, saveStaffPerformanceReviewAction, saveStaffDepartmentAction } from '../customers/actions';

interface StaffMember {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  staff_role: string | null;
  team_code: string | null;
  is_active: boolean | null;
  can_approve_requests: boolean | null;
  can_manage_merchants: boolean | null;
  can_view_financials: boolean | null;
  extra_roles?: string[];
}

interface Department {
  id: string;
  name_en: string;
  name_ar: string;
  manager_id?: string;
  strengths_en?: string;
  strengths_ar?: string;
  weaknesses_en?: string;
  weaknesses_ar?: string;
  challenges_en?: string;
  challenges_ar?: string;
  alert_message_en?: string;
  alert_message_ar?: string;
}

interface HrDetails {
  staff_id: string;
  phone?: string;
  email?: string;
  base_salary: number;
  commission_pct: number;
  primary_role?: string;
  secondary_roles?: string[];
  performance_rating: number;
  review_notes?: string;
  department_id?: string;
}

interface PerformanceReview {
  id: string;
  staff_id: string;
  reviewer_id?: string;
  review_period: string;
  is_manager_review: boolean;
  score_leadership: number;
  score_execution: number;
  score_communication: number;
  score_quality: number;
  achievements?: string;
  weaknesses?: string;
  improvement_plan?: string;
  created_at: string;
  reviewer?: {
    full_name: string;
  };
}

interface HRDashboardClientProps {
  locale: string;
  initialStaff: StaffMember[];
  departments: Department[];
  hrDetails: HrDetails[];
  reviews: PerformanceReview[];
}

export default function HRDashboardClient({
  locale,
  initialStaff,
  departments: initialDepartments,
  hrDetails: initialHrDetails,
  reviews: initialReviews
}: HRDashboardClientProps) {
  const isRTL = locale === 'ar';
  const [activeTab, setActiveTab] = useState<'departments' | 'directory'>('departments');
  const [isPending, startTransition] = useTransition();

  // Database lists
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [hrDetails, setHrDetails] = useState<HrDetails[]>(initialHrDetails);
  const [reviews, setReviews] = useState<PerformanceReview[]>(initialReviews);

  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [showDeptForm, setShowDeptForm] = useState(false);

  // Forms states
  const [hrForm, setHrForm] = useState({
    phone: '',
    email: '',
    base_salary: 0,
    commission_pct: 0,
    primary_role: '',
    secondary_roles: '',
    performance_rating: 5,
    review_notes: '',
    department_id: ''
  });

  const [reviewForm, setReviewForm] = useState({
    review_period: 'Q2 2026',
    is_manager_review: false,
    score_leadership: 5,
    score_execution: 5,
    score_communication: 5,
    score_quality: 5,
    achievements: '',
    weaknesses: '',
    improvement_plan: ''
  });

  const [deptForm, setDeptForm] = useState({
    name_en: '',
    name_ar: '',
    manager_id: '',
    strengths_en: '',
    strengths_ar: '',
    weaknesses_en: '',
    weaknesses_ar: '',
    challenges_en: '',
    challenges_ar: '',
    alert_message_en: '',
    alert_message_ar: ''
  });

  // Handle staff selection
  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    const details = hrDetails.find(d => d.staff_id === staffId);
    const staff = initialStaff.find(s => s.id === staffId);

    setHrForm({
      phone: details?.phone || '',
      email: details?.email || '',
      base_salary: details?.base_salary || 0,
      commission_pct: details?.commission_pct || 0,
      primary_role: details?.primary_role || staff?.staff_role || '',
      secondary_roles: details?.secondary_roles?.join(', ') || staff?.extra_roles?.join(', ') || '',
      performance_rating: details?.performance_rating || 5,
      review_notes: details?.review_notes || '',
      department_id: details?.department_id || ''
    });

    setReviewForm({
      review_period: 'Q2 2026',
      is_manager_review: staff?.staff_role === 'admin' || staff?.staff_role === 'owner',
      score_leadership: 5,
      score_execution: 5,
      score_communication: 5,
      score_quality: 5,
      achievements: '',
      weaknesses: '',
      improvement_plan: ''
    });
  };

  // Handle saving HR details
  const handleSaveHrDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    startTransition(async () => {
      try {
        const payload = {
          staff_id: selectedStaffId,
          ...hrForm,
          secondary_roles: hrForm.secondary_roles ? hrForm.secondary_roles.split(',').map(r => r.trim()) : []
        };
        await saveStaffHrDetailsAction(payload, locale);

        setHrDetails(prev => {
          const exists = prev.some(d => d.staff_id === selectedStaffId);
          if (exists) {
            return prev.map(d => d.staff_id === selectedStaffId ? { ...d, ...payload } : d);
          } else {
            return [...prev, payload as any];
          }
        });
        alert(isRTL ? 'تم حفظ بيانات الموظف بنجاح 💾' : 'HR Contract details saved! 💾');
      } catch (err: any) {
        alert(err.message || 'Error saving details');
      }
    });
  };

  // Handle saving Review
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    startTransition(async () => {
      try {
        const payload = {
          staff_id: selectedStaffId,
          ...reviewForm
        };
        await saveStaffPerformanceReviewAction(payload, locale);

        const newReview: PerformanceReview = {
          id: Math.random().toString(),
          staff_id: selectedStaffId,
          review_period: reviewForm.review_period,
          is_manager_review: reviewForm.is_manager_review,
          score_leadership: reviewForm.score_leadership,
          score_execution: reviewForm.score_execution,
          score_communication: reviewForm.score_communication,
          score_quality: reviewForm.score_quality,
          achievements: reviewForm.achievements,
          weaknesses: reviewForm.weaknesses,
          improvement_plan: reviewForm.improvement_plan,
          created_at: new Date().toISOString()
        };

        setReviews([newReview, ...reviews]);
        setReviewForm({
          ...reviewForm,
          achievements: '',
          weaknesses: '',
          improvement_plan: ''
        });
        alert(isRTL ? 'تم تسجيل التقييم بنجاح 📈' : 'Performance review logged! 📈');
      } catch (err: any) {
        alert(err.message || 'Error saving review');
      }
    });
  };

  // Open Edit Department
  const handleEditDept = (dept: Department) => {
    setEditingDeptId(dept.id);
    setDeptForm({
      name_en: dept.name_en,
      name_ar: dept.name_ar,
      manager_id: dept.manager_id || '',
      strengths_en: dept.strengths_en || '',
      strengths_ar: dept.strengths_ar || '',
      weaknesses_en: dept.weaknesses_en || '',
      weaknesses_ar: dept.weaknesses_ar || '',
      challenges_en: dept.challenges_en || '',
      challenges_ar: dept.challenges_ar || '',
      alert_message_en: dept.alert_message_en || '',
      alert_message_ar: dept.alert_message_ar || ''
    });
    setShowDeptForm(true);
  };

  // Save Department
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          id: editingDeptId || undefined,
          ...deptForm
        };
        await saveStaffDepartmentAction(payload, locale);
        
        window.location.reload(); // Quick refresh to reload relations
      } catch (err: any) {
        alert(err.message || 'Error saving department');
      }
    });
  };

  return (
    <div className="hr-dashboard" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .hr-dashboard { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Tabs bar */
        .tabs-bar { display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; }
        .tab-btn { background: transparent; border: none; font-size: 1rem; font-weight: 850; color: rgba(255,255,255,0.4); cursor: pointer; padding: 8px 16px; transition: all 0.2s; border-radius: 8px; }
        .tab-btn.active { color: #3b82f6; background: rgba(59,130,246,0.08); }

        /* Grid */
        .dept-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 40px; }
        .dept-card { background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.04); border-radius: 24px; padding: 25px; position: relative; }
        .dept-title { font-size: 1.3rem; font-weight: 900; color: white; margin: 0 0 10px; display: flex; justify-content: space-between; align-items: center; }
        .dept-manager { font-size: 0.85rem; color: #f59e0b; margin-bottom: 20px; font-weight: 800; }
        
        .dept-metric { margin-bottom: 15px; }
        .dept-metric-label { font-size: 0.75rem; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 800; margin-bottom: 4px; }
        .dept-metric-value { font-size: 0.9rem; line-height: 1.5; color: rgba(255,255,255,0.85); }
        .dept-metric-value.strength { color: #10b981; }
        .dept-metric-value.weakness { color: #f59e0b; }
        .dept-metric-value.challenge { color: #ef4444; }

        .dept-alert { background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.1); border-radius: 12px; padding: 12px; font-size: 0.85rem; color: #f59e0b; margin-top: 15px; }

        /* Staff Directory Split Panel */
        .directory-layout { display: grid; grid-template-columns: 350px 1fr; gap: 30px; }
        @media (max-width: 900px) { .directory-layout { grid-template-columns: 1fr; } }

        .staff-list { display: flex; flex-direction: column; gap: 10px; }
        .staff-list-item { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); border-radius: 16px; padding: 15px 20px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: space-between; }
        .staff-list-item:hover, .staff-list-item.active { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); }
        
        .staff-name { font-weight: 800; color: white; }
        .staff-role { font-size: 0.75rem; color: rgba(255,255,255,0.45); text-transform: uppercase; margin-top: 2px; }

        /* Forms Card */
        .details-panel { background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.04); border-radius: 24px; padding: 30px; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full-width { grid-column: span 2; }
        .form-group label { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .form-group input, .form-group select, .form-group textarea { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 12px; color: white; font-size: 0.9rem; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #3b82f6; outline: none; }

        .submit-btn { padding: 12px 24px; background: #3b82f6; color: white; border: none; font-weight: 850; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .submit-btn:hover { background: #2563eb; }

        .badge-list { display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; }
        .tag-badge { background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; color: rgba(255,255,255,0.6); font-weight: 800; }

        /* Modal Dept Form */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { width: 100%; max-width: 600px; background: #0b0f19; border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 30px; max-height: 90vh; overflow-y: auto; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'إدارة الموارد البشرية والتقييم 🛡️' : 'HR & Staff Performance 🛡️'}</h1>
          <p className="subtitle">
            {isRTL ? 'تقييم أداء الموظفين والمدراء وتوزيع المهام وصلاحيات الخزانة والعمولات.' : 'Manage staff evaluations, salaries, commissions, and department-level strengths/weaknesses.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← ذكاء المنصة' : '← Back to Intel'}
        </Link>
      </header>

      {/* Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => setActiveTab('departments')}>
          💼 {isRTL ? 'أداء الأقسام والمشرفين' : 'Departments & Performance'}
        </button>
        <button className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`} onClick={() => setActiveTab('directory')}>
          👥 {isRTL ? 'دليل الموظفين والتقييم الفردي' : 'Staff Directory & Individual Review'}
        </button>
      </div>

      {activeTab === 'departments' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button className="submit-btn" onClick={() => { setEditingDeptId(null); setDeptForm({ name_en: '', name_ar: '', manager_id: '', strengths_en: '', strengths_ar: '', weaknesses_en: '', weaknesses_ar: '', challenges_en: '', challenges_ar: '', alert_message_en: '', alert_message_ar: '' }); setShowDeptForm(true); }}>
              + {isRTL ? 'قسم جديد' : 'New Department'}
            </button>
          </div>

          <div className="dept-grid">
            {departments.map(dept => {
              const manager = initialStaff.find(s => s.id === dept.manager_id);
              const members = initialStaff.filter(s => {
                const details = hrDetails.find(d => d.staff_id === s.id);
                return details?.department_id === dept.id;
              });

              return (
                <div key={dept.id} className="dept-card">
                  <div className="dept-title">
                    <span>{isRTL ? dept.name_ar : dept.name_en}</span>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => handleEditDept(dept)}>✏️</button>
                  </div>
                  <div className="dept-manager">
                    👑 {isRTL ? 'المدير المسؤول:' : 'Manager:'} {manager ? manager.full_name : (isRTL ? 'غير معين' : 'Not assigned')}
                  </div>

                  <div className="dept-metric">
                    <div className="dept-metric-label">{isRTL ? 'نقاط القوة المحددة' : 'Identified Strengths'}</div>
                    <div className="dept-metric-value strength">✓ {isRTL ? dept.strengths_ar : dept.strengths_en || '-'}</div>
                  </div>

                  <div className="dept-metric">
                    <div className="dept-metric-label">{isRTL ? 'نقاط الضعف' : 'Identified Weaknesses'}</div>
                    <div className="dept-metric-value weakness">⚠️ {isRTL ? dept.weaknesses_ar : dept.weaknesses_en || '-'}</div>
                  </div>

                  <div className="dept-metric">
                    <div className="dept-metric-label">{isRTL ? 'العوائق والمشاكل' : 'Challenges & Latency'}</div>
                    <div className="dept-metric-value challenge">🚧 {isRTL ? dept.challenges_ar : dept.challenges_en || '-'}</div>
                  </div>

                  {/* Members */}
                  <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                    <div className="dept-metric-label">{isRTL ? 'أعضاء القسم' : 'Team Members'} ({members.length})</div>
                    <div className="badge-list">
                      {members.map(m => (
                        <span key={m.id} className="tag-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{m.full_name}</span>
                      ))}
                      {members.length === 0 && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{isRTL ? 'لا يوجد موظفون' : 'No staff members'}</span>}
                    </div>
                  </div>

                  {(dept.alert_message_en || dept.alert_message_ar) && (
                    <div className="dept-alert">
                      💡 <strong>{isRTL ? 'تنبيه إداري:' : 'HR Alert:'}</strong> {isRTL ? dept.alert_message_ar : dept.alert_message_en}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Staff Directory view */
        <div className="directory-layout">
          {/* List */}
          <div className="staff-list">
            {initialStaff.map(st => {
              const details = hrDetails.find(d => d.staff_id === st.id);
              const rating = details?.performance_rating || 5;

              return (
                <div key={st.id} className={`staff-list-item ${selectedStaffId === st.id ? 'active' : ''}`} onClick={() => handleSelectStaff(st.id)}>
                  <div>
                    <div className="staff-name">{st.full_name}</div>
                    <div className="staff-role">{st.staff_role}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>⭐ {rating}</span>
                    <span className="role-badge" style={{ fontSize: '0.65rem' }}>{st.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Side */}
          {selectedStaffId ? (
            <div className="details-panel">
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
                {initialStaff.find(s => s.id === selectedStaffId)?.full_name}
              </h2>

              <form onSubmit={handleSaveHrDetails} style={{ marginBottom: '40px' }}>
                <h3 className="founder-card-title">{isRTL ? 'البيانات المالية والعقد 💼' : 'HR Contract & Financials 💼'}</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>{isRTL ? 'الهاتف' : 'Phone'}</label>
                    <input type="text" value={hrForm.phone} onChange={e => setHrForm({ ...hrForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input type="email" value={hrForm.email} onChange={e => setHrForm({ ...hrForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'المرتب الأساسي (جنيه)' : 'Base Salary (EGP)'}</label>
                    <input type="number" min={0} value={hrForm.base_salary} onChange={e => setHrForm({ ...hrForm, base_salary: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'نسبة العمولة %' : 'Commission Percentage %'}</label>
                    <input type="number" step="0.1" min={0} value={hrForm.commission_pct} onChange={e => setHrForm({ ...hrForm, commission_pct: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'الدور الأساسي' : 'Primary Role'}</label>
                    <input type="text" value={hrForm.primary_role} onChange={e => setHrForm({ ...hrForm, primary_role: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'القسم المسؤول' : 'Department'}</label>
                    <select value={hrForm.department_id} onChange={e => setHrForm({ ...hrForm, department_id: e.target.value })}>
                      <option value="">{isRTL ? 'اختر القسم...' : 'Select department...'}</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{isRTL ? d.name_ar : d.name_en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'التقييم العام الحالي (0 - 5) ⭐' : 'Current performance rating (0-5) ⭐'}</label>
                    <input type="number" step="0.1" min={0} max={5} value={hrForm.performance_rating} onChange={e => setHrForm({ ...hrForm, performance_rating: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'الأدوار الجانبية والمهام (مفصولة بفاصلة)' : 'Secondary roles (comma-separated)'}</label>
                    <input type="text" placeholder="Scout Manager, Approver..." value={hrForm.secondary_roles} onChange={e => setHrForm({ ...hrForm, secondary_roles: e.target.value })} />
                  </div>
                  <div className="form-group full-width">
                    <label>{isRTL ? 'ملاحظات وتنبيهات إدارية' : 'HR review notes'}</label>
                    <textarea rows={2} value={hrForm.review_notes} onChange={e => setHrForm({ ...hrForm, review_notes: e.target.value })} />
                  </div>
                </div>

                <button type="submit" disabled={isPending} className="submit-btn" style={{ marginTop: '15px' }}>
                  {isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ عقد الموظف 💾' : 'Save Employee Contract 💾')}
                </button>
              </form>

              {/* Review Logger Form */}
              <form onSubmit={handleSaveReview} style={{ marginBottom: '40px' }}>
                <h3 className="founder-card-title">{isRTL ? 'تسجيل تقييم أداء جديد 📈' : 'Log New Performance Review 📈'}</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>{isRTL ? 'فترة التقييم' : 'Review Period'}</label>
                    <input type="text" value={reviewForm.review_period} onChange={e => setReviewForm({ ...reviewForm, review_period: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{isRTL ? 'نوع الموظف' : 'Staff Type'}</label>
                    <select value={reviewForm.is_manager_review ? 'true' : 'false'} onChange={e => setReviewForm({ ...reviewForm, is_manager_review: e.target.value === 'true' })}>
                      <option value="false">{isRTL ? 'موظف عادي (تقييم تنفيذ)' : 'Employee (Execution review)'}</option>
                      <option value="true">{isRTL ? 'مدير/مشرف (تقييم قيادة)' : 'Manager (Leadership review)'}</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>{reviewForm.is_manager_review ? (isRTL ? 'القيادة والقرارات ⭐' : 'Leadership & decisions ⭐') : (isRTL ? 'التنفيذ وسرعة العمل ⭐' : 'Execution & speed ⭐')}</label>
                    <input type="number" step="0.1" min={0} max={5} value={reviewForm.is_manager_review ? reviewForm.score_leadership : reviewForm.score_execution} onChange={e => setReviewForm({ ...reviewForm, score_leadership: Number(e.target.value), score_execution: Number(e.target.value) })} />
                  </div>

                  <div className="form-group">
                    <label>{isRTL ? 'جودة وتدقيق العمل ⭐' : 'Quality of work ⭐'}</label>
                    <input type="number" step="0.1" min={0} max={5} value={reviewForm.score_quality} onChange={e => setReviewForm({ ...reviewForm, score_quality: Number(e.target.value) })} />
                  </div>

                  <div className="form-group">
                    <label>{isRTL ? 'التواصل وروح الفريق ⭐' : 'Communication & team score ⭐'}</label>
                    <input type="number" step="0.1" min={0} max={5} value={reviewForm.score_communication} onChange={e => setReviewForm({ ...reviewForm, score_communication: Number(e.target.value) })} />
                  </div>

                  <div className="form-group">
                    <label>{isRTL ? 'الانضباط والالتزام بالوقت ⭐' : 'Punctuality & deadline score ⭐'}</label>
                    <input type="number" step="0.1" min={0} max={5} value={reviewForm.score_quality} />
                  </div>

                  <div className="form-group full-width">
                    <label>{isRTL ? 'أبرز الإنجازات والنجاحات' : 'Major Achievements & Wins'}</label>
                    <textarea rows={2} value={reviewForm.achievements} onChange={e => setReviewForm({ ...reviewForm, achievements: e.target.value })} />
                  </div>

                  <div className="form-group full-width">
                    <label>{isRTL ? 'نقاط الضعف وعوامل التقصير' : 'Identified Weaknesses / Gaps'}</label>
                    <textarea rows={2} value={reviewForm.weaknesses} onChange={e => setReviewForm({ ...reviewForm, weaknesses: e.target.value })} />
                  </div>

                  <div className="form-group full-width">
                    <label>{isRTL ? 'خطة التحسين والتطوير المطلوبة' : 'Improvement Plan'}</label>
                    <textarea rows={2} value={reviewForm.improvement_plan} onChange={e => setReviewForm({ ...reviewForm, improvement_plan: e.target.value })} />
                  </div>
                </div>

                <button type="submit" disabled={isPending} className="submit-btn" style={{ marginTop: '15px', background: '#10b981' }}>
                  {isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'تسجيل التقييم 💾' : 'Log Review 💾')}
                </button>
              </form>

              {/* Past reviews log */}
              <div>
                <h3 className="founder-card-title">{isRTL ? 'سجل تقييمات الأداء السابقة' : 'Past Review Logs'}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {reviews.filter(r => r.staff_id === selectedStaffId).map(r => (
                    <div key={r.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '20px', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                        <span>Period: {r.review_period}</span>
                        <span>{r.reviewer?.full_name ? `Reviewer: ${r.reviewer.full_name}` : ''}</span>
                      </div>
                      
                      {r.achievements && <p style={{ fontSize: '0.9rem', margin: '0 0 8px' }}>🏆 <strong>Wins:</strong> {r.achievements}</p>}
                      {r.weaknesses && <p style={{ fontSize: '0.9rem', margin: '0 0 8px', color: '#f59e0b' }}>⚠️ <strong>Gaps:</strong> {r.weaknesses}</p>}
                      {r.improvement_plan && <p style={{ fontSize: '0.9rem', margin: '0', color: '#60a5fa' }}>💡 <strong>Plan:</strong> {r.improvement_plan}</p>}
                    </div>
                  ))}
                  {reviews.filter(r => r.staff_id === selectedStaffId).length === 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{isRTL ? 'لا توجد تقييمات مسجلة بعد لهذا الموظف' : 'No review logs saved yet'}</div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', height: '300px', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>
              {isRTL ? 'اختر موظفاً من القائمة الجانبية لتعديل بياناته وتقييمه' : 'Select an employee from directory to view HR details & log reviews'}
            </div>
          )}
        </div>
      )}

      {/* Modal for adding/editing Department */}
      {showDeptForm && (
        <div className="modal-overlay" onClick={() => setShowDeptForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: '20px' }}>
              {editingDeptId ? (isRTL ? 'تعديل بيانات القسم' : 'Edit Department') : (isRTL ? 'إنشاء قسم جديد' : 'Create New Department')}
            </h3>

            <form onSubmit={handleSaveDept}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
                  <input type="text" required value={deptForm.name_en} onChange={e => setDeptForm({ ...deptForm, name_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                  <input type="text" required value={deptForm.name_ar} onChange={e => setDeptForm({ ...deptForm, name_ar: e.target.value })} />
                </div>
                <div className="form-group full-width">
                  <label>{isRTL ? 'المدير المسؤول' : 'Department Manager'}</label>
                  <select value={deptForm.manager_id} onChange={e => setDeptForm({ ...deptForm, manager_id: e.target.value })}>
                    <option value="">{isRTL ? 'اختر مشرفاً...' : 'Select manager...'}</option>
                    {initialStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'نقاط القوة (بالإنجليزية)' : 'Strengths (English)'}</label>
                  <textarea rows={2} value={deptForm.strengths_en} onChange={e => setDeptForm({ ...deptForm, strengths_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'نقاط القوة (بالعربية)' : 'Strengths (Arabic)'}</label>
                  <textarea rows={2} value={deptForm.strengths_ar} onChange={e => setDeptForm({ ...deptForm, strengths_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'نقاط الضعف (بالإنجليزية)' : 'Weaknesses (English)'}</label>
                  <textarea rows={2} value={deptForm.weaknesses_en} onChange={e => setDeptForm({ ...deptForm, weaknesses_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'نقاط الضعف (بالعربية)' : 'Weaknesses (Arabic)'}</label>
                  <textarea rows={2} value={deptForm.weaknesses_ar} onChange={e => setDeptForm({ ...deptForm, weaknesses_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العوائق والمشاكل (بالإنجليزية)' : 'Challenges (English)'}</label>
                  <textarea rows={2} value={deptForm.challenges_en} onChange={e => setDeptForm({ ...deptForm, challenges_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'العوائق والمشاكل (بالعربية)' : 'Challenges (Arabic)'}</label>
                  <textarea rows={2} value={deptForm.challenges_ar} onChange={e => setDeptForm({ ...deptForm, challenges_ar: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'تنبيه القسم 💡 (بالإنجليزية)' : 'Department Alert 💡 (English)'}</label>
                  <input type="text" value={deptForm.alert_message_en} onChange={e => setDeptForm({ ...deptForm, alert_message_en: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'تنبيه القسم 💡 (بالعربية)' : 'Department Alert 💡 (Arabic)'}</label>
                  <input type="text" value={deptForm.alert_message_ar} onChange={e => setDeptForm({ ...deptForm, alert_message_ar: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" disabled={isPending} className="submit-btn">{isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ القسم 💾' : 'Save Department 💾')}</button>
                <button type="button" className="submit-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setShowDeptForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

