'use client'

import React, { useState, useEffect } from 'react'

const MOCK_EVENTS_EN = [
  "A Store Insider in Nasr City just earned 50 EGP! 💸",
  "High demand detected in Maadi: 3 new tasks opened 🚀",
  "Ali M. just reached Pro Level! 🏆",
  "A Field Scout near you submitted an insight and earned 150 Points! ⭐",
  "Trending: iPhone 15 Pro Max prices are shifting. New tasks available! 📱"
]

const MOCK_EVENTS_AR = [
  "مندوب مبيعات في مدينة نصر ربح للتو 50 جنيه! 💸",
  "طلب عالي في المعادي: تم فتح 3 مهام جديدة 🚀",
  "علي م. وصل للتو إلى مستوى المحترفين! 🏆",
  "مندوب بالقرب منك رفع بيانات سوق وحصل على 150 نقطة! ⭐",
  "تريند: أسعار آيفون 15 تتغير. مهام جديدة متاحة! 📱"
]

export default function ViralActivityFeed({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const eventsPool = isAr ? MOCK_EVENTS_AR : MOCK_EVENTS_EN
  const [events, setEvents] = useState<{ id: number, text: string }[]>([])

  useEffect(() => {
    // Initial load
    setEvents([
      { id: Date.now(), text: eventsPool[Math.floor(Math.random() * eventsPool.length)] }
    ])

    // Simulate real-time feed updates every 8-15 seconds
    const interval = setInterval(() => {
      setEvents(prev => {
        const newEvent = { id: Date.now(), text: eventsPool[Math.floor(Math.random() * eventsPool.length)] }
        // Keep only last 3
        return [newEvent, ...prev].slice(0, 3)
      })
    }, Math.floor(Math.random() * 7000) + 8000)

    return () => clearInterval(interval)
  }, [eventsPool])

  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 p-4 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(258,89%,66%)] opacity-10 blur-3xl rounded-full"></div>
      
      <h3 className="text-sm font-bold text-[hsl(220,10%,60%)] mb-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152,69%,51%)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(152,69%,51%)]"></span>
        </span>
        {isAr ? 'نشاط الشبكة المباشر' : 'Live Network Activity'}
      </h3>

      <div className="space-y-3">
        {events.map((ev, idx) => (
          <div 
            key={ev.id} 
            className={`p-3 rounded-lg border border-white/5 bg-[hsl(220,20%,12%)] text-sm text-white shadow-sm transition-all duration-500 ${idx === 0 ? 'animate-slide-down opacity-100' : 'opacity-60'}`}
          >
            {ev.text}
          </div>
        ))}
      </div>
    </div>
  )
}
