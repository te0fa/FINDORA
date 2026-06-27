'use client'

import React, { useState } from 'react'

export default function TaskReviewClient({ locale, initialClaims }: { locale: string, initialClaims: any[] }) {
  const isAr = locale === 'ar'
  const [claims, setClaims] = useState(initialClaims)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const handleReview = async (claimId: string, action: 'approve' | 'reject') => {
    setProcessingId(claimId)
    try {
      const res = await fetch('/api/staff/tasks/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action, notes: notes[claimId] || '' })
      })
      const data = await res.json()
      if (data.success) {
        setClaims(prev => prev.filter(c => c.id !== claimId))
        alert(isAr ? 'تم تقييم المهمة بنجاح.' : 'Task reviewed successfully.')
      } else {
        alert(data.error || 'Failed to review task')
      }
    } catch (e) {
      alert('Error processing review')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4">
        {isAr ? 'المراجعات المعلقة ⏳' : 'Pending Reviews ⏳'}
      </h2>
      
      {claims.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center text-[hsl(220,10%,60%)]">
          {isAr ? 'لا توجد مهام معلقة للمراجعة.' : 'No tasks pending review.'}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {claims.map(claim => {
            const task = claim.platform_tasks
            const contributor = claim.contributors
            const submission = claim.submission_data || {}

            return (
              <div key={claim.id} className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">{isAr ? task.title_ar : task.title_en}</h3>
                    <p className="text-sm text-[hsl(220,10%,60%)]">By: <span className="font-bold text-white">{contributor.full_name}</span> (Trust: {contributor.trust_score})</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-[hsl(43,96%,56%,0.2)] text-[hsl(43,96%,56%)] text-xs font-bold rounded">
                      {new Date(claim.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-black/40 rounded-lg p-4 mb-4 border border-white/5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{isAr ? 'البيانات المسلمة' : 'Submission Data'}</h4>
                  {submission.price_reported && (
                    <div className="mb-2">
                      <span className="text-[hsl(220,10%,60%)]">{isAr ? 'السعر المُبلغ عنه:' : 'Reported Price:'} </span>
                      <span className="font-bold text-[hsl(152,69%,51%)]">{submission.price_reported} EGP</span>
                    </div>
                  )}
                  {submission.notes && (
                    <div>
                      <span className="text-[hsl(220,10%,60%)]">{isAr ? 'ملاحظات المندوب:' : 'Contributor Notes:'} </span>
                      <p className="text-white text-sm mt-1 bg-black/20 p-2 rounded">{submission.notes}</p>
                    </div>
                  )}
                </div>

                <textarea
                  placeholder={isAr ? 'ملاحظات المراجعة (اختياري)...' : 'Review notes (optional)...'}
                  value={notes[claim.id] || ''}
                  onChange={e => setNotes({ ...notes, [claim.id]: e.target.value })}
                  className="w-full rounded-lg bg-black/50 p-3 text-sm text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none mb-4"
                  rows={2}
                ></textarea>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleReview(claim.id, 'approve')}
                    disabled={processingId === claim.id}
                    className="flex-1 rounded-lg bg-[hsl(152,69%,51%)] py-3 font-bold text-black transition hover:bg-[hsl(152,69%,55%)] disabled:opacity-50"
                  >
                    {isAr ? 'قبول وصرف المكافأة' : 'Approve & Pay'}
                  </button>
                  <button
                    onClick={() => handleReview(claim.id, 'reject')}
                    disabled={processingId === claim.id}
                    className="flex-1 rounded-lg bg-[hsl(0,84%,60%,0.2)] py-3 font-bold text-[hsl(0,84%,60%)] transition hover:bg-[hsl(0,84%,60%,0.4)] disabled:opacity-50"
                  >
                    {isAr ? 'رفض' : 'Reject'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
