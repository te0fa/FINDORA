'use client'

import React, { useState } from 'react'
import { adminOverrideStreak, adminAwardBadge } from '@/lib/contributors/gamification/actions'

export default function GamificationAdminClient({ locale, contributors }: { locale: string, contributors: any[] }) {
  const isAr = locale === 'ar'
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [newStreak, setNewStreak] = useState<number>(0)
  const [badgeEn, setBadgeEn] = useState('')
  const [badgeAr, setBadgeAr] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUpdateStreak = async () => {
    if (!selectedUser) return
    setIsProcessing(true)
    try {
      await adminOverrideStreak(selectedUser, newStreak)
      alert(isAr ? 'تم تحديث الأيام المتتالية (Streak) بنجاح' : 'Streak updated successfully')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAwardBadge = async () => {
    if (!selectedUser || !badgeEn || !badgeAr) return
    setIsProcessing(true)
    try {
      await adminAwardBadge(selectedUser, badgeEn, badgeAr)
      alert(isAr ? 'تم منح الوسام بنجاح' : 'Badge awarded successfully')
      setBadgeEn('')
      setBadgeAr('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Target Selector */}
      <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-white">{isAr ? 'اختر المساهم المستهدف' : 'Select Target Contributor'}</h2>
        <select 
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full max-w-md rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-[hsl(258,89%,66%)]"
        >
          <option value="">{isAr ? '-- اختر مساهماً --' : '-- Select Contributor --'}</option>
          {contributors.map(c => (
            <option key={c.id} value={c.id}>{c.full_name} ({c.role})</option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Streak Override */}
          <div className="rounded-2xl border border-[hsl(43,96%,56%,0.3)] bg-[hsl(220,20%,12%)] p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-[hsl(43,96%,56%)]">🔥 {isAr ? 'تعديل التفاعل اليومي (Streak)' : 'Override Daily Streak'}</h3>
            <p className="mb-4 text-sm text-[hsl(220,10%,60%)]">
              {isAr ? 'يمكنك ضبط أيام التفاعل يدوياً لحل مشاكل تقنية أو تعويض مستخدم.' : 'Manually adjust the daily streak for support or compensation reasons.'}
            </p>
            <div className="flex gap-4">
              <input 
                type="number" 
                value={newStreak}
                onChange={(e) => setNewStreak(parseInt(e.target.value) || 0)}
                className="flex-1 rounded-lg border border-white/10 bg-black/30 p-3 text-white"
              />
              <button 
                onClick={handleUpdateStreak}
                disabled={isProcessing}
                className="rounded-lg bg-[hsl(43,96%,56%)] px-6 py-3 font-bold text-black transition hover:bg-[hsl(43,96%,60%)] disabled:opacity-50"
              >
                {isAr ? 'تحديث' : 'Update'}
              </button>
            </div>
          </div>

          {/* Custom Badge Award */}
          <div className="rounded-2xl border border-[hsl(258,89%,66%,0.3)] bg-[hsl(220,20%,12%)] p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-[hsl(258,89%,66%)]">🎖️ {isAr ? 'منح وسام استثنائي' : 'Award Custom Badge'}</h3>
            <p className="mb-4 text-sm text-[hsl(220,10%,60%)]">
              {isAr ? 'قم بمنح أوسمة خاصة تقديراً للأداء المتميز.' : 'Grant custom badges to recognize exceptional performance.'}
            </p>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder={isAr ? 'اسم الوسام (إنجليزي)' : 'Badge Name (EN)'}
                value={badgeEn}
                onChange={(e) => setBadgeEn(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white"
              />
              <input 
                type="text" 
                placeholder={isAr ? 'اسم الوسام (عربي)' : 'Badge Name (AR)'}
                value={badgeAr}
                onChange={(e) => setBadgeAr(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white"
              />
              <button 
                onClick={handleAwardBadge}
                disabled={isProcessing || !badgeEn || !badgeAr}
                className="w-full rounded-lg bg-[hsl(258,89%,66%)] py-3 font-bold text-white transition hover:bg-[hsl(258,89%,70%)] disabled:opacity-50"
              >
                {isAr ? 'منح الوسام' : 'Award Badge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
