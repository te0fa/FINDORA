'use client'

import React from 'react'
import Link from 'next/link'

export default function CustomerDashboardClient({ locale, requests }: { locale: string, requests: any[] }) {
  const isAr = locale === 'ar'

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 bg-black/20 rounded-2xl border border-white/5">
        <div className="text-4xl mb-4">🛒</div>
        <h3 className="text-xl font-bold text-white mb-2">{isAr ? 'لا توجد طلبات بعد' : 'No requests yet'}</h3>
        <p className="text-[hsl(220,10%,60%)] mb-6">{isAr ? 'ابدأ أول طلب لك ودع شبكتنا تبحث لك عن أفضل العروض.' : 'Start your first request and let our network hunt for the best deals.'}</p>
        <Link href={`/${locale}/start-request`} className="px-6 py-3 bg-[hsl(258,89%,66%)] text-white font-bold rounded-xl hover:bg-[hsl(258,89%,76%)] transition shadow-lg inline-block">
          {isAr ? 'ابدأ البحث الآن' : 'Start Searching Now'}
        </Link>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-[hsl(43,96%,56%,0.2)] text-[hsl(43,96%,56%)] border-[hsl(43,96%,56%,0.5)]'
      case 'in_progress': return 'bg-[hsl(258,89%,66%,0.2)] text-[hsl(258,89%,66%)] border-[hsl(258,89%,66%,0.5)]'
      case 'completed': return 'bg-[hsl(152,69%,51%,0.2)] text-[hsl(152,69%,51%)] border-[hsl(152,69%,51%,0.5)]'
      default: return 'bg-white/10 text-white border-white/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return isAr ? '🔍 جاري البحث' : '🔍 Searching...'
      case 'in_progress': return isAr ? '🏃 مندوبين يعملون' : '🏃 Scouts Active'
      case 'completed': return isAr ? '✅ عروض جاهزة' : '✅ Offers Ready'
      default: return status
    }
  }

  return (
    <div className="grid gap-4">
      {requests.map(req => (
        <Link 
          href={`/${locale}/customer/request/${req.id}`} 
          key={req.id} 
          className="p-6 rounded-2xl border border-white/10 bg-black/40 hover:bg-[hsl(220,20%,12%)] hover:border-[hsl(258,89%,66%,0.5)] transition group block"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(req.status)}`}>
                  {getStatusLabel(req.status || 'open')}
                </span>
                <span className="text-xs text-[hsl(220,10%,60%)] font-mono">{new Date(req.created_at).toLocaleDateString()}</span>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-[hsl(258,89%,66%)] transition">
                {req.product_name}
              </h2>
              <p className="text-sm text-[hsl(220,10%,60%)] mt-1">
                📍 {req.target_location} {req.max_price ? `| 💰 Max: ${req.max_price} EGP` : ''}
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-sm font-bold text-[hsl(258,89%,66%)] group-hover:underline">
                {isAr ? 'عرض التفاصيل ←' : 'View Details →'}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
