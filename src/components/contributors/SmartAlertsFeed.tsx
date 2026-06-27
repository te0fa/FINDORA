'use client'

import React from 'react'

interface Notification {
  id: string
  message_en: string
  message_ar: string
  type: 'warning' | 'success' | 'info' | 'critical'
  is_read: boolean
  created_at: string
}

interface SmartAlertsFeedProps {
  locale: string
  notifications: Notification[]
}

export default function SmartAlertsFeed({ locale, notifications }: SmartAlertsFeedProps) {
  const isAr = locale === 'ar'

  if (!notifications || notifications.length === 0) {
    return null
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] shadow-xl overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          🔔 {isAr ? 'تنبيهات الشبكة' : 'Network Alerts'}
          {unreadCount > 0 && (
            <span className="bg-[hsl(0,84%,60%)] text-white text-xs px-2 py-0.5 rounded-full font-black animate-pulse">
              {unreadCount}
            </span>
          )}
        </h2>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
        {notifications.map((n) => {
          let bg = 'bg-white/5'
          let border = 'border-white/10'
          let icon = 'ℹ️'

          if (n.type === 'warning') {
            bg = 'bg-[hsl(43,96%,56%,0.1)]'
            border = 'border-[hsl(43,96%,56%,0.3)]'
            icon = '⚠️'
          } else if (n.type === 'critical') {
            bg = 'bg-[hsl(0,84%,60%,0.1)]'
            border = 'border-[hsl(0,84%,60%,0.3)]'
            icon = '🚨'
          } else if (n.type === 'success') {
            bg = 'bg-[hsl(152,69%,51%,0.1)]'
            border = 'border-[hsl(152,69%,51%,0.3)]'
            icon = '✅'
          }

          return (
            <div key={n.id} className={`p-4 rounded-xl border ${bg} ${border} ${!n.is_read ? 'opacity-100' : 'opacity-60 grayscale'}`}>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-sm text-white font-medium">
                    {isAr ? n.message_ar : n.message_en}
                  </p>
                  <p className="text-xs text-[hsl(220,10%,60%)] mt-2">
                    {new Date(n.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
