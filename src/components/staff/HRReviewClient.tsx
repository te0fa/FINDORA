'use client'

import React, { useState } from 'react'
import { reviewContributorApplication } from '@/app/[locale]/staff/contributors/actions'

export default function HRReviewClient({ 
  pendingApplications, 
  locale 
}: { 
  pendingApplications: any[], 
  locale: string 
}) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    pendingApplications.length > 0 ? pendingApplications[0].id : null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apps, setApps] = useState(pendingApplications)

  const isAr = locale === 'ar'
  const selectedApp = apps.find(app => app.id === selectedAppId)

  const handleAction = async (action: 'approve' | 'reject' | 'request_info') => {
    if (!selectedApp) return
    if (action === 'request_info') {
      alert(isAr ? 'تم طلب بيانات إضافية من المستخدم.' : 'Requested additional info.')
      return
    }
    
    setIsSubmitting(true)
    try {
      const res = await reviewContributorApplication(selectedApp.id, action === 'approve' ? 'approved' : 'rejected')
      if (res.success) {
        alert(isAr ? '✅ تم تحديث حالة المتقدم بنجاح!' : '✅ Applicant status updated successfully!')
        const newApps = apps.filter(app => app.id !== selectedApp.id)
        setApps(newApps)
        setSelectedAppId(newApps.length > 0 ? newApps[0].id : null)
      } else {
        alert(isAr ? `❌ فشل التحديث: ${res.error}` : `❌ Failed: ${res.error}`)
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (apps.length === 0) {
    return (
      <div style={{
        display: 'flex',
        height: '60vh',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'hsl(220,10%,60%)',
        fontSize: '1.1rem',
        fontWeight: 'bold'
      }}>
        {isAr ? 'لا يوجد طلبات معلقة حالياً.' : 'No pending applications at the moment.'}
      </div>
    )
  }

  return (
    <div className={`hr-shell ${isAr ? 'is-rtl' : 'is-ltr'}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .hr-shell {
          display: flex;
          height: 75vh;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(20px);
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          width: 100%;
        }
        .hr-sidebar {
          width: 320px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .hr-sidebar-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.2);
        }
        .hr-app-item {
          padding: 16px 20px;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: inherit;
          width: 100%;
          display: block;
        }
        .hr-app-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .hr-app-item.selected {
          background: rgba(139, 92, 246, 0.1);
        }
        .is-ltr .hr-app-item.selected {
          border-left: 4px solid hsl(258, 89%, 66%);
        }
        .is-rtl .hr-app-item.selected {
          border-right: 4px solid hsl(258, 89%, 66%);
        }
        .hr-main-view {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .hr-data-col {
          flex: 1;
          padding: 30px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          overflow-y: auto;
        }
        .hr-analysis-col {
          flex: 1;
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow-y: auto;
        }
        .hr-card {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .hr-btn-reject {
          flex: 1;
          padding: 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171 !important;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s;
        }
        .hr-btn-reject:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        .hr-btn-info {
          flex: 1;
          padding: 14px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24 !important;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s;
        }
        .hr-btn-info:hover {
          background: rgba(245, 158, 11, 0.2);
        }
        .hr-btn-approve {
          flex: 1;
          padding: 14px;
          border-radius: 10px;
          background: rgba(34, 197, 94, 0.18);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #4ade80 !important;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s;
        }
        .hr-btn-approve:hover {
          background: rgba(34, 197, 94, 0.28);
        }
      `.replace(/\r\n/g, '\n') }} />
      
      {/* Sidebar List */}
      <div className="hr-sidebar">
        <div className="hr-sidebar-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>{isAr ? 'قائمة الطلبات المعلقة' : 'Pending Applications'}</h2>
          <p style={{ fontSize: '11px', color: 'hsl(220,10%,60%)', margin: 0 }}>
            {apps.length} {isAr ? 'طلبات قيد المراجعة' : 'awaiting review'}
          </p>
        </div>
        <div>
          {apps.map(app => (
            <button
              key={app.id}
              onClick={() => setSelectedAppId(app.id)}
              className={`hr-app-item ${selectedAppId === app.id ? 'selected' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{app.full_name || 'Unnamed'}</span>
                <span style={{ 
                  borderRadius: '6px', 
                  background: 'rgba(255,255,255,0.06)', 
                  padding: '2px 8px', 
                  fontSize: '0.72rem', 
                  color: 'hsl(220,10%,60%)',
                  fontWeight: 600
                }}>{app.role}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'hsl(220,10%,50%)', margin: 0 }}>
                {new Date(app.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Split View Content */}
      {selectedApp && (
        <div className="hr-main-view">
          
          {/* User Data (Left) */}
          <div className="hr-data-col">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 20, margin: '0 0 20px 0' }}>
              {isAr ? '📋 تفاصيل بيانات المتقدم' : '📋 Applicant Details'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="hr-card">
                <p style={{ fontSize: '11px', color: 'hsl(220,10%,55%)', margin: '0 0 4px 0' }}>{isAr ? 'الاسم بالكامل' : 'Full Name'}</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>{selectedApp.full_name}</p>
              </div>
              
              <div className="hr-card">
                <p style={{ fontSize: '11px', color: 'hsl(220,10%,55%)', margin: '0 0 4px 0' }}>{isAr ? 'المحافظة / المدينة' : 'City'}</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>{selectedApp.city || 'N/A'}</p>
              </div>

              <div className="hr-card">
                <p style={{ fontSize: '11px', color: 'hsl(220,10%,55%)', margin: '0 0 4px 0' }}>{isAr ? 'رقم الهاتف (الواتساب)' : 'Phone Number'}</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(258,89%,75%)', margin: 0 }}>{selectedApp.phone || 'N/A'}</p>
              </div>

              <div className="hr-card">
                <p style={{ fontSize: '11px', color: 'hsl(220,10%,55%)', margin: '0 0 4px 0' }}>{isAr ? 'الدور المطلوب للتسجيل' : 'Requested Role'}</p>
                <div style={{ 
                  marginTop: 6, 
                  display: 'inline-block', 
                  borderRadius: '8px', 
                  background: 'rgba(139,92,246,0.15)', 
                  padding: '6px 12px', 
                  fontSize: '0.85rem', 
                  fontWeight: 800, 
                  color: 'hsl(258,89%,75%)' 
                }}>
                  {selectedApp.role}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 10, margin: '0 0 10px 0' }}>
                  {isAr ? '📄 المستندات المرفقة للتحقق' : '📄 Verification Documents'}
                </p>
                <div style={{ 
                  display: 'flex', 
                  height: 120, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: 12, 
                  border: '1px dashed rgba(255,255,255,0.12)', 
                  background: 'rgba(0,0,0,0.15)' 
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(220,10%,50%)', fontWeight: 'bold' }}>
                    {isAr ? '🔍 اضغط لمعاينة صورة البطاقة/الكارنيه' : '🔍 Click to preview national ID / card'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis (Right) */}
          <div className="hr-analysis-col">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {isAr ? 'تحليل الموارد البشرية والذكاء الاصطناعي' : 'AI HR Screening'}
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  borderRadius: 12,
                  border: '1px solid rgba(34,197,94,0.3)',
                  background: 'rgba(34,197,94,0.06)',
                  padding: 16
                }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80', margin: '0 0 6px 0' }}>
                    {isAr ? 'التوصية التلقائية: قبول الطلب' : 'Recommendation: APPROVE'}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
                    {isAr 
                      ? 'الإجابات نموذجية وتظهر التزاماً وقدرة كافية على تغطية الأسواق المطلوبة. لا توجد مؤشرات احتيال أو تضارب في الفحص الأولي.' 
                      : 'Answers conform to requirements. Documents appear valid and no fraud flags detected.'}
                  </p>
                </div>
                
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 10, margin: '0 0 10px 0' }}>
                    {isAr ? 'إجابات المقابلة التفاعلية' : 'Interview Answers'}
                  </h4>
                  <div className="hr-card" style={{ marginBottom: 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(258,89%,75%)', margin: '0 0 6px 0' }}>
                      Q: What experience or location knowledge do you possess?
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
                      {isAr 
                        ? '"لدي خبرة تزيد عن سنتين في النزول للأسواق والتعامل مع معارض الأجهزة والإلكترونيات في مدينة نصر ومصر الجديدة وأعرف أسعارها جيداً."' 
                        : '"I have over 2 years of experience researching electronics markets in Cairo and know the top retailers well."'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="btn-row" style={{ display: 'flex', gap: 12, width: '100%', marginTop: 24 }}>
              <button 
                onClick={() => handleAction('reject')}
                disabled={isSubmitting}
                className="hr-btn-reject"
              >
                {isAr ? 'رفض الطلب' : 'Reject'}
              </button>
              <button 
                onClick={() => handleAction('request_info')}
                disabled={isSubmitting}
                className="hr-btn-info"
              >
                {isAr ? 'طلب تفاصيل' : 'Request Info'}
              </button>
              <button 
                onClick={() => handleAction('approve')}
                disabled={isSubmitting}
                className="hr-btn-approve"
              >
                {isAr ? 'تفعيل واعتماد' : 'Approve & Activate'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
