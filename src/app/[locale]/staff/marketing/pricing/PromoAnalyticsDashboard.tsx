'use client'

import { useState } from 'react'

interface PromoRun {
  id: string
  serviceKey: string
  serviceTitleEn: string
  serviceTitleAr: string
  promoLabelEn: string
  promoLabelAr: string
  versionNo: number
  price: number
  originalPrice: number | null
  currency: string
  startsAt: string
  endsAt: string | null
  isActive: boolean
  durationDays: number
  customersCount: number
  revenue: number
  rating: number
}

interface PromoAnalyticsDashboardProps {
  promos: PromoRun[]
  isRTL: boolean
}

export default function PromoAnalyticsDashboard({ promos, isRTL }: PromoAnalyticsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('ALL')
  const [ratingFilter, setRatingFilter] = useState('ALL')

  // Calculate totals for high-impact overview cards
  const totalPromos = promos.length
  const activePromosCount = promos.filter(p => p.isActive).length
  const totalRevenue = promos.reduce((sum, p) => sum + p.revenue, 0)
  const totalCustomers = promos.reduce((sum, p) => sum + p.customersCount, 0)

  // Filtered list
  const filteredPromos = promos.filter(p => {
    const title = isRTL ? p.promoLabelAr : p.promoLabelEn
    const serviceName = isRTL ? p.serviceTitleAr : p.serviceTitleEn
    const matchesSearch = 
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.serviceKey.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesService = serviceFilter === 'ALL' || p.serviceKey === serviceFilter
    
    const matchesRating = 
      ratingFilter === 'ALL' || 
      (ratingFilter === '5' && p.rating === 5) ||
      (ratingFilter === '4plus' && p.rating >= 4) ||
      (ratingFilter === '3plus' && p.rating >= 3) ||
      (ratingFilter === 'low' && p.rating <= 2 && p.rating > 0) ||
      (ratingFilter === 'none' && p.rating === 0)

    return matchesSearch && matchesService && matchesRating
  })

  const getRecommendationTag = (rating: number, isActive: boolean) => {
    if (isActive && rating === 0) {
      return {
        text: isRTL ? '⏱️ تم إطلاقه حديثاً' : '⏱️ Just Launched',
        classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      }
    }
    switch (rating) {
      case 5:
        return {
          text: isRTL ? '🔥 استثنائي - كرر فوراً' : '🔥 Exceptional - Repeat Now',
          classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
        }
      case 4:
        return {
          text: isRTL ? '✅ فعال - يوصى بالتكرار' : '✅ Highly Effective - Repeat Recommended',
          classes: 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
        }
      case 3:
        return {
          text: isRTL ? '⚖️ أداء متوسط' : '⚖️ Moderate Performance',
          classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }
      case 1:
      case 2:
        return {
          text: isRTL ? '⚠️ مردود ضعيف' : '⚠️ Underperforming',
          classes: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }
      default:
        return {
          text: isRTL ? '💤 لا توجد نتائج بعد' : '💤 No results yet',
          classes: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
        }
    }
  }

  return (
    <section className="glass-card p-6 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📊 {isRTL ? 'سجل وتحليلات العروض الترويجية' : 'Promotions Log & Analytics'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL 
              ? 'تتبع أداء جميع العروض السابقة، لمعرفة أي العروض حققت نتائج ممتازة وتستحق التكرار.' 
              : 'Track performance of past promotions, discover what worked best and identify repeat opportunities.'}
          </p>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/2 border border-white/5 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-semibold">{isRTL ? 'إجمالي العروض الترويجية' : 'Total Promos Run'}</div>
          <div className="text-2xl font-bold text-white mt-1">{totalPromos}</div>
          <div className="text-[10px] text-brand-gold mt-1">
            🟢 {activePromosCount} {isRTL ? 'نشط حالياً' : 'Currently active'}
          </div>
        </div>
        <div className="bg-white/2 border border-white/5 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-semibold">{isRTL ? 'العملاء المستفيدين' : 'Customers Reached'}</div>
          <div className="text-2xl font-bold text-teal-400 mt-1">{totalCustomers}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isRTL ? 'إجمالي العملاء المميزين' : 'Total unique customers'}
          </div>
        </div>
        <div className="bg-white/2 border border-white/5 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-semibold">{isRTL ? 'الأرباح / الإيرادات' : 'Generated Revenue'}</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {totalRevenue.toLocaleString('en-US')} <span className="text-xs font-normal">EGP</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isRTL ? 'من المدفوعات المؤكدة' : 'From confirmed payments'}
          </div>
        </div>
        <div className="bg-white/2 border border-white/5 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-semibold">{isRTL ? 'معدل النجاح' : 'Success Ratio'}</div>
          <div className="text-2xl font-bold text-brand-gold mt-1">
            {totalPromos > 0 
              ? Math.round((promos.filter(p => p.rating >= 3).length / totalPromos) * 100) 
              : 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isRTL ? 'عروض بتقييم 3 نجوم وأعلى' : 'Promos rated 3+ stars'}
          </div>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder={isRTL ? 'ابحث باسم العرض أو الخدمة...' : 'Search promo name or service...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 text-slate-100 rounded-lg p-2 text-sm focus:border-brand-gold outline-none"
          />
        </div>
        <div className="grid grid-cols-2 md:flex gap-3">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-slate-950/80 border border-white/10 text-slate-100 rounded-lg p-2 text-sm focus:border-brand-gold outline-none"
          >
            <option value="ALL">{isRTL ? 'كل الخدمات' : 'All Services'}</option>
            <option value="everyday_purchase">{isRTL ? 'مشتريات يومية' : 'Everyday Purchases'}</option>
            <option value="high_value_deals">{isRTL ? 'أصول عالية القيمة' : 'High-Value Assets'}</option>
            <option value="projects_supplies">{isRTL ? 'مشاريع وتوريدات' : 'Projects & Supplies'}</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-slate-950/80 border border-white/10 text-slate-100 rounded-lg p-2 text-sm focus:border-brand-gold outline-none"
          >
            <option value="ALL">{isRTL ? 'كل التقييمات' : 'All Ratings'}</option>
            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
            <option value="4plus">⭐⭐⭐⭐+ ({isRTL ? 'أداء ممتاز' : 'High Performance'})</option>
            <option value="3plus">⭐⭐⭐+ ({isRTL ? 'أداء مقبول' : 'Moderate+'})</option>
            <option value="low">⭐⭐ ({isRTL ? 'ضعيف' : 'Underperforming'})</option>
            <option value="none">{isRTL ? 'بدون نتائج' : 'No results'}</option>
          </select>
        </div>
      </div>

      {/* Main Promo Log Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-sm text-left rtl:text-right border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <th className="p-4">{isRTL ? 'العرض الترويجي' : 'Promotion Info'}</th>
              <th className="p-4">{isRTL ? 'سعر العرض / الأصلي' : 'Promo / Base Price'}</th>
              <th className="p-4">{isRTL ? 'مدة التشغيل' : 'Running Duration'}</th>
              <th className="p-4 text-center">{isRTL ? 'العملاء المستفيدين' : 'Benefited Customers'}</th>
              <th className="p-4 text-center">{isRTL ? 'الإيرادات المحققة' : 'Revenue Generated'}</th>
              <th className="p-4 text-center">{isRTL ? 'التقييم والحكم' : 'Rating & Evaluation'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-900/40">
            {filteredPromos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                  {isRTL ? 'لا توجد نتائج مطابقة لخيارات الفلترة الحالية.' : 'No promotions matched the current filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredPromos.map((p) => {
                const tag = getRecommendationTag(p.rating, p.isActive)
                return (
                  <tr key={p.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-white text-base">
                          {isRTL ? p.promoLabelAr : p.promoLabelEn}
                        </div>
                        <div className="text-xs text-brand-gold mt-0.5">
                          {isRTL ? p.serviceTitleAr : p.serviceTitleEn}{' '}
                          <span className="text-[10px] text-slate-500">({p.serviceKey})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {isRTL ? 'الإصدار' : 'Version'} v{p.versionNo}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {p.price} {p.currency}
                      </div>
                      {p.originalPrice && (
                        <div className="text-xs text-slate-400 line-through">
                          {p.originalPrice} {p.currency}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-300">
                        {p.durationDays} {isRTL ? 'يوم' : 'Days'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        📅 {new Date(p.startsAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                        {' -> '}
                        {p.endsAt ? new Date(p.endsAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : (isRTL ? 'مستمر' : 'Ongoing')}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full font-bold text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {p.customersCount}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-emerald-400">
                      {p.revenue.toLocaleString('en-US')} {p.currency}
                    </td>
                    <td className="p-4 text-center">
                      {/* Stars system */}
                      <div className="flex justify-center mb-1.5 text-brand-gold text-base tracking-wider" title={`${p.rating} / 5`}>
                        {p.customersCount === 0 ? (
                          <span className="text-xs text-slate-500 italic">{isRTL ? 'لا توجد بيانات' : 'No data'}</span>
                        ) : (
                          Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>{i < p.rating ? '★' : '☆'}</span>
                          ))
                        )}
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${tag.classes}`}>
                        {tag.text}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
