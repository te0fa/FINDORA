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

export default function QualityReviewClient({ pendingSubmissions, locale }: { pendingSubmissions: Submission[], locale: string }) {
  const isAr = locale === 'ar'
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id)
    try {
      const res = await reviewSubmissionAction(id, action)
      if (res.success) {
        // Optimistic UI update or rely on revalidatePath
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (pendingSubmissions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[hsl(220,20%,12%)]">
        <p className="text-[hsl(220,10%,60%)]">{isAr ? 'لا يوجد طلبات جديدة للمراجعة' : 'No pending submissions for review'}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {pendingSubmissions.map(sub => {
        const aiScore = sub.details?.ai_analysis?.confidence_score || 0
        const flags = sub.details?.ai_analysis?.flags || []
        const isHighConfidence = aiScore >= 80
        const isSuspicious = aiScore < 50 || flags.length > 0

        return (
          <div key={sub.id} className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[hsl(220,20%,12%)] shadow-xl transition hover:border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between bg-black/20 p-4 border-b border-white/5">
              <div>
                <span className="text-xs font-bold text-[hsl(258,89%,66%)]">{sub.submission_type.replace('_', ' ').toUpperCase()}</span>
                <p className="font-bold text-white">{sub.details?.product_name || 'Unnamed Product'}</p>
              </div>
              <span className="text-2xl">{sub.submission_type === 'vendor_offer' ? '🏪' : '📸'}</span>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4">
              <div className="flex justify-between">
                <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'المساهم' : 'Contributor'}</p>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{sub.contributor?.full_name}</p>
                  <p className="text-xs text-[hsl(220,10%,60%)]">{sub.contributor?.role.replace('_', ' ')}</p>
                </div>
              </div>

              {sub.price_reported && (
                <div className="rounded bg-black/30 p-3 text-center">
                  <p className="text-xs text-[hsl(220,10%,60%)]">{isAr ? 'السعر المُبلغ عنه' : 'Reported Price'}</p>
                  <p className="text-xl font-black text-[hsl(152,69%,51%)]">{sub.price_reported} {isAr ? 'ج.م' : 'EGP'}</p>
                </div>
              )}

              {sub.details?.notes && (
                <div className="rounded bg-black/30 p-3">
                  <p className="text-xs text-[hsl(220,10%,60%)]">{isAr ? 'الملاحظات' : 'Notes'}</p>
                  <p className="text-sm text-white">{sub.details.notes}</p>
                </div>
              )}

              {/* AI Analysis Box */}
              <div className={`rounded-lg border p-3 ${
                isSuspicious ? 'border-[hsl(0,84%,60%,0.3)] bg-[hsl(0,84%,60%,0.05)]' : 
                isHighConfidence ? 'border-[hsl(152,69%,51%,0.3)] bg-[hsl(152,69%,51%,0.05)]' : 
                'border-white/10 bg-black/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white flex items-center gap-1">🤖 {isAr ? 'تحليل AI' : 'AI Analysis'}</p>
                  <span className={`text-xs font-bold ${
                    isSuspicious ? 'text-[hsl(0,84%,60%)]' : 
                    isHighConfidence ? 'text-[hsl(152,69%,51%)]' : 
                    'text-[hsl(43,96%,56%)]'
                  }`}>{aiScore}%</span>
                </div>
                {flags.length > 0 ? (
                  <ul className="text-xs text-[hsl(0,84%,60%)] list-disc pl-4">
                    {flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                ) : (
                  <p className="text-xs text-[hsl(220,10%,60%)]">{isAr ? 'يبدو التقرير سليماً ضمن متوسط السوق.' : 'Report appears valid within market averages.'}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex border-t border-white/5">
              <button 
                onClick={() => handleReview(sub.id, 'reject')}
                disabled={processingId === sub.id}
                className="flex-1 py-3 text-sm font-bold text-[hsl(0,84%,60%)] transition hover:bg-[hsl(0,84%,60%,0.1)] disabled:opacity-50"
              >
                {isAr ? 'رفض' : 'Reject'}
              </button>
              <div className="w-[1px] bg-white/5"></div>
              <button 
                onClick={() => handleReview(sub.id, 'approve')}
                disabled={processingId === sub.id}
                className="flex-1 py-3 text-sm font-bold text-[hsl(152,69%,51%)] transition hover:bg-[hsl(152,69%,51%,0.1)] disabled:opacity-50"
              >
                {isAr ? 'قبول (منح نقاط)' : 'Approve (Reward)'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
