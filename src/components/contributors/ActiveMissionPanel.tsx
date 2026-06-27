'use client'

import React, { useState, useEffect } from 'react'

export default function ActiveMissionPanel({ locale, claim, onSuccess }: { locale: string, claim: any, onSuccess: () => void }) {
  const isAr = locale === 'ar'
  const task = claim.platform_tasks
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const expiry = new Date(claim.expires_at).getTime()
      const now = new Date().getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft(isAr ? 'انتهى الوقت' : 'Expired')
        clearInterval(timer)
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${m}m ${s}s`)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [claim.expires_at, isAr])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const payload = {
      price_reported: price,
      notes: notes,
      submitted_at: new Date().toISOString()
    }

    try {
      const res = await fetch('/api/contributors/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.id, submissionData: payload })
      })
      const data = await res.json()
      if (data.success) {
        onSuccess()
      } else {
        alert(data.error || 'Failed to submit')
      }
    } catch (err) {
      alert('Error submitting task')
    } finally {
      setSubmitting(false)
    }
  }

  if (claim.status === 'submitted') {
    return (
      <div className="rounded-2xl border border-[hsl(43,96%,56%,0.3)] bg-[hsl(43,96%,56%,0.05)] p-6 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-[hsl(43,96%,56%)] mb-2 flex items-center gap-2">
          ⏳ {isAr ? 'جاري مراجعة المهمة' : 'Mission Under Review'}
        </h2>
        <p className="text-[hsl(220,10%,80%)]">
          {isAr ? `لقد قمت بتسليم "${task.title_ar}". يرجى الانتظار حتى تتم المراجعة لإضافة الأرباح.` : `You have submitted "${task.title_en}". Please wait for review to receive your rewards.`}
        </p>
      </div>
    )
  }

  if (claim.status !== 'in_progress') return null

  return (
    <div className="rounded-2xl border border-[hsl(258,89%,66%,0.5)] bg-[hsl(220,20%,12%)] p-6 shadow-2xl mb-8 relative overflow-hidden">
      {/* Animated glow background */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[hsl(258,89%,66%)] opacity-20 blur-3xl rounded-full pointer-events-none"></div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-[hsl(258,89%,66%,0.2)] text-[hsl(258,89%,66%)] text-xs font-bold uppercase tracking-wider mb-3 inline-block">
            {isAr ? 'مهمة نشطة' : 'Active Mission'}
          </span>
          <h2 className="text-2xl font-extrabold text-white">{isAr ? task.title_ar : task.title_en}</h2>
          <p className="text-[hsl(220,10%,60%)] mt-1">{isAr ? task.description_ar : task.description_en}</p>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'الوقت المتبقي' : 'Time Left'}</div>
          <div className={`text-xl font-mono font-bold ${timeLeft.includes('Expired') ? 'text-red-500' : 'text-emerald-400'}`}>
            {timeLeft}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-black/30 p-5 rounded-xl border border-white/5">
        {task.task_type === 'price_quote' && (
          <div>
            <label className="block text-sm font-bold text-[hsl(220,10%,80%)] mb-2">
              {isAr ? 'السعر الذي وجدته (جنيه)' : 'Reported Price (EGP)'}
            </label>
            <input 
              type="number" 
              required
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
              placeholder="0.00"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-[hsl(220,10%,80%)] mb-2">
            {isAr ? 'ملاحظات / تفاصيل' : 'Notes / Details'}
          </label>
          <textarea 
            required
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            placeholder={isAr ? 'اكتب أي معلومات إضافية هنا...' : 'Enter any additional info here...'}
          ></textarea>
        </div>

        <button 
          type="submit"
          disabled={submitting || timeLeft.includes('Expired')}
          className="w-full rounded-lg bg-[hsl(152,69%,51%)] py-4 font-extrabold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition hover:bg-[hsl(152,69%,55%)] disabled:opacity-50"
        >
          {submitting ? (isAr ? 'جاري التسليم...' : 'Submitting...') : (isAr ? 'تسليم المهمة 🚀' : 'Submit Mission 🚀')}
        </button>
      </form>
    </div>
  )
}
