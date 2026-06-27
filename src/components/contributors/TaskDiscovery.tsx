'use client'

import React, { useState, useEffect } from 'react'

export default function TaskDiscovery({ locale, onClaimSuccess }: { locale: string, onClaimSuccess: () => void }) {
  const isAr = locale === 'ar'
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [baseMultiplier, setBaseMultiplier] = useState(1.0)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/contributors/tasks')
      const data = await res.json()
      if (data.tasks) setTasks(data.tasks)
      if (data.baseEffectiveMultiplier) setBaseMultiplier(data.baseEffectiveMultiplier)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleClaim = async (taskId: string) => {
    setClaimingId(taskId)
    try {
      const res = await fetch('/api/contributors/tasks/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })
      const data = await res.json()
      if (data.success) {
        onClaimSuccess()
      } else {
        alert(data.error || 'Failed to claim task')
      }
    } catch (e) {
      alert('Error claiming task')
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-white/50 animate-pulse">{isAr ? 'جاري البحث عن مهام...' : 'Scanning for tasks...'}</div>

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-8 text-center shadow-xl">
        <span className="text-4xl mb-4 block">📡</span>
        <h3 className="text-xl font-bold text-white mb-2">{isAr ? 'لا توجد مهام متاحة' : 'No tasks available'}</h3>
        <p className="text-[hsl(220,10%,60%)]">
          {isAr ? 'لم نجد مهام تناسب مستواك أو منطقتك حالياً. سنقوم بإبلاغك فور توفر مهام جديدة!' : 'No tasks matching your level or area right now. We will notify you when new tasks arrive!'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[hsl(152,69%,51%)] animate-pulse"></span>
        {isAr ? 'فرص متاحة حولك' : 'Available Opportunities'}
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((t) => {
          const finalEgp = (t.base_reward_egp * baseMultiplier).toFixed(2)
          return (
            <div key={t.id} className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-5 shadow-xl transition hover:border-[hsl(258,89%,66%,0.5)]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">{isAr ? t.title_ar : t.title_en}</h3>
                  <p className="text-xs text-[hsl(220,10%,60%)] mt-1">{isAr ? t.description_ar : t.description_en}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  {t.base_reward_egp > 0 && <div className="font-extrabold text-[hsl(152,69%,51%)]">{finalEgp} EGP</div>}
                  {t.base_reward_points > 0 && <div className="font-bold text-[hsl(43,96%,56%)] text-sm">{t.base_reward_points} Pts</div>}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <span className="px-2 py-1 rounded bg-black/50 text-[hsl(220,10%,60%)] text-[10px] font-bold">
                  ⏱️ {t.time_limit_minutes} {isAr ? 'دقيقة' : 'mins'}
                </span>
                {t.min_level > 1 && (
                  <span className="px-2 py-1 rounded bg-[hsl(258,89%,66%,0.2)] text-[hsl(258,89%,66%)] text-[10px] font-bold">
                    Lvl {t.min_level}+
                  </span>
                )}
              </div>

              <button
                onClick={() => handleClaim(t.id)}
                disabled={claimingId === t.id}
                className="w-full rounded-lg bg-[hsl(258,89%,66%)] py-3 font-bold text-white transition hover:bg-[hsl(258,89%,70%)] disabled:opacity-50"
              >
                {claimingId === t.id ? (isAr ? 'جاري القبول...' : 'Claiming...') : (isAr ? 'قبول المهمة' : 'Claim Task')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
