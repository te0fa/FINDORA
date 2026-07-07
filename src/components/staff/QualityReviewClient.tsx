'use client'

import React, { useState } from 'react'
import { reviewSubmissionAction } from '@/app/[locale]/staff/contributors/submissions/actions'

interface Submission {
  id: string
  submission_type: string
  price_reported: number | null
  details: any
  created_at: string
  contributor: {
    full_name: string
    role: string
  }
}

export default function QualityReviewClient({ 
  pendingSubmissions, 
  locale 
}: { 
  pendingSubmissions: Submission[], 
  locale: string 
}) {
  const isAr = locale === 'ar'
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id)
    try {
      const res = await reviewSubmissionAction(id, action)
      if (res.success) {
        // Relies on revalidatePath
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (pendingSubmissions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        height: '240px',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '16px',
        border: '1px dashed rgba(255,255,255,0.12)',
        background: 'rgba(15, 23, 42, 0.2)',
        color: 'hsl(220,10%,60%)',
        fontSize: '1rem',
        fontWeight: 'bold'
      }}>
        <p>{isAr ? '📭 لا يوجد طلبات مراجعة جديدة لبيانات السوق حالياً' : '📭 No pending submissions for quality review.'}</p>
      </div>
    )
  }

  return (
    <div className="review-grid">
      <style dangerouslySetInnerHTML={{ __html: `
        .review-grid {
          display: grid;
          gap: 24px;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          width: 100%;
        }
        .review-card {
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(20px);
          transition: transform 0.2s, border-color 0.2s;
        }
        .review-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }
        .review-card-header {
          background: rgba(0, 0, 0, 0.25);
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .review-card-body {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .review-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .review-pill-green {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80 !important;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .review-pill-red {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171 !important;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .review-pill-yellow {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24 !important;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .review-btn-reject {
          flex: 1;
          padding: 12px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171 !important;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
          border-radius: 8px;
        }
        .review-btn-reject:hover {
          background: rgba(239, 68, 68, 0.22);
        }
        .review-btn-approve {
          flex: 1;
          padding: 12px;
          background: rgba(34, 197, 94, 0.18);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #4ade80 !important;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
          border-radius: 8px;
        }
        .review-btn-approve:hover {
          background: rgba(34, 197, 94, 0.28);
        }
      `.replace(/\r\n/g, '\n') }} />

      {pendingSubmissions.map(sub => {
        const aiScore = sub.details?.ai_analysis?.confidence_score || 0
        const flags = sub.details?.ai_analysis?.flags || []
        const isHighConfidence = aiScore >= 80
        const isSuspicious = aiScore < 50 || flags.length > 0

        return (
          <div key={sub.id} className="review-card">
            {/* Header */}
            <div className="review-card-header">
              <div>
                <span style={{ fontSize: '10px', fontWeight: 900, color: 'hsl(258,89%,75%)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {sub.submission_type.replace('_', ' ').toUpperCase()}
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                  {sub.details?.product_name || (isAr ? 'منتج غير محدد الاسم' : 'Unnamed Product')}
                </h4>
              </div>
              <span style={{ fontSize: '1.5rem' }}>
                {sub.submission_type === 'vendor_offer' ? '🏪' : '📸'}
              </span>
            </div>

            {/* Body */}
            <div className="review-card-body">
              <div className="review-info-row">
                <span style={{ fontSize: '12px', color: 'hsl(220,10%,60%)' }}>{isAr ? 'المساهم' : 'Contributor'}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'block' }}>
                    {sub.contributor?.full_name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'hsl(220,10%,55%)' }}>
                    {sub.contributor?.role ? sub.contributor.role.replace('_', ' ') : ''}
                  </span>
                </div>
              </div>

              {sub.price_reported && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'hsl(220,10%,55%)', display: 'block', marginBottom: 4 }}>
                    {isAr ? 'السعر المُرسل' : 'Reported Price'}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4ade80' }}>
                    {sub.price_reported.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              )}

              {sub.details?.notes && (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12 }}>
                  <span style={{ fontSize: '11px', color: 'hsl(220,10%,55%)', display: 'block', marginBottom: 4 }}>
                    {isAr ? 'ملاحظات التقديم' : 'Notes'}
                  </span>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4 }}>
                    {sub.details.notes}
                  </p>
                </div>
              )}

              {/* AI Analysis Block */}
              <div className={`rounded-lg border p-3 ${
                isSuspicious ? 'review-pill-red' : 
                isHighConfidence ? 'review-pill-green' : 
                'review-pill-yellow'
              }`} style={{ display: 'block', borderRadius: 10, border: '1px solid', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                    🤖 {isAr ? 'ثقة الذكاء الاصطناعي' : 'AI Confidence Score'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900 }}>
                    {aiScore}%
                  </span>
                </div>
                
                {flags.length > 0 ? (
                  <ul style={{ fontSize: '11px', color: '#f87171', margin: '6px 0 0 0', paddingLeft: 16 }}>
                    {flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                ) : (
                  <p style={{ fontSize: '11px', margin: 0, opacity: 0.9 }}>
                    {isAr ? 'تقرير متسق وضمن معدلات الأسعار الطبيعية للمنتج.' : 'Values correspond to normal market prices.'}
                  </p>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '0 20px 20px 20px', display: 'flex', gap: 12 }}>
              <button 
                onClick={() => handleReview(sub.id, 'reject')}
                disabled={processingId === sub.id}
                className="review-btn-reject"
              >
                {isAr ? 'رفض' : 'Reject'}
              </button>
              <button 
                onClick={() => handleReview(sub.id, 'approve')}
                disabled={processingId === sub.id}
                className="review-btn-approve"
              >
                {isAr ? 'قبول واعتماد' : 'Approve'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
