'use client'

import { useState, useTransition } from 'react'
import { handleBulkDeletePricingVersions } from './actions'
import PricingRowActions from './PricingRowActions'

interface ExpiredPricingListProps {
  expiredPricing: any[]
  locale: string
  isRTL: boolean
}

export default function ExpiredPricingList({ expiredPricing, locale, isRTL }: ExpiredPricingListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === expiredPricing.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(expiredPricing.map(v => v.id))
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    const confirmMessage = isRTL 
      ? `هل أنت متأكد من رغبتك في حذف ${selectedIds.length} من العروض المحددة؟`
      : `Are you sure you want to delete ${selectedIds.length} selected offers?`
      
    if (!confirm(confirmMessage)) return

    setError(null)
    startTransition(async () => {
      const res = await handleBulkDeletePricingVersions(selectedIds, locale)
      if (res?.error) {
        setError(res.error)
      } else {
        setSelectedIds([])
      }
    })
  }

  const allSelected = expiredPricing.length > 0 && selectedIds.length === expiredPricing.length

  return (
    <div className="space-y-6">
      {/* Premium Bulk actions bar */}
      {expiredPricing.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-white/10 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                id="select-all-expired"
                checked={allSelected}
                onChange={handleSelectAll}
                className="peer shrink-0 appearance-none w-5 h-5 rounded bg-slate-950 border border-white/20 checked:border-brand-gold checked:bg-brand-gold focus:outline-none transition-all cursor-pointer"
              />
              <svg
                className="absolute w-3.5 h-3.5 pointer-events-none stroke-slate-950 fill-none stroke-[3.5] hidden peer-checked:block"
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <label htmlFor="select-all-expired" className="cursor-pointer text-sm font-bold select-none text-slate-300 hover:text-white transition-colors">
              {isRTL ? 'تحديد كل العروض المنتهية' : 'Select All Expired'} ({selectedIds.length} / {expiredPricing.length})
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {error && <span className="text-xs text-rose-400 font-semibold">{error}</span>}
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0 || isPending}
              className={`px-5 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-300 transform active:scale-95 flex items-center gap-2 ${
                selectedIds.length > 0 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 border border-rose-500/20 cursor-pointer' 
                  : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5 opacity-50'
              }`}
            >
              <span>🗑️</span>
              <span>
                {isPending 
                  ? (isRTL ? 'جاري المسح...' : 'Deleting...') 
                  : (isRTL ? 'حذف العروض المحددة دفعة واحدة' : 'Delete Selected Bulk')}
              </span>
            </button>
          </div>
        </div>
      )}

      {expiredPricing.length === 0 ? (
        <p className="text-muted text-sm italic py-12 text-center bg-white/2 rounded-2xl border border-white/5">
          {isRTL ? 'لا توجد عروض منتهية حالياً.' : 'No expired promotions at the moment.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {expiredPricing.map((v: any) => {
            const is_promo = v.is_promo === true
            const showPromo = is_promo && v.status === 'active'
            const isChecked = selectedIds.includes(v.id)

            return (
              <div 
                key={v.id} 
                className={`bg-slate-900/40 p-5 rounded-2xl border flex flex-col justify-between hover:border-brand-gold/30 hover:bg-slate-900/60 transition-all duration-300 group shadow-md ${
                  isChecked ? 'border-brand-gold/60 bg-brand-gold/5 shadow-brand-gold/5' : 'border-white/5'
                }`}
                id={`pricing-version-${v.id}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <div className="flex items-start gap-3">
                      {/* Premium Custom Styled Checkbox */}
                      <div className="relative flex items-center justify-center shrink-0 mt-1">
                        <input
                          type="checkbox"
                          id={`check-${v.id}`}
                          checked={isChecked}
                          onChange={() => handleToggleSelect(v.id)}
                          className="peer shrink-0 appearance-none w-5 h-5 rounded bg-slate-950 border border-white/20 checked:border-brand-gold checked:bg-brand-gold focus:outline-none transition-all cursor-pointer"
                        />
                        <svg
                          className="absolute w-3.5 h-3.5 pointer-events-none stroke-slate-950 fill-none stroke-[3.5] hidden peer-checked:block"
                          viewBox="0 0 24 24"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-white group-hover:text-brand-gold transition-colors flex flex-wrap items-center gap-1.5 leading-snug">
                          <label htmlFor={`check-${v.id}`} className="cursor-pointer">
                            {v.serviceTitle}
                          </label>
                          {v.promo_label_ar && isRTL && (
                            <span className="text-[10px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-2 py-0.5 rounded-full font-bold">
                              {v.promo_label_ar}
                            </span>
                          )}
                          {v.promo_label_en && !isRTL && (
                            <span className="text-[10px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-2 py-0.5 rounded-full font-bold">
                              {v.promo_label_en}
                            </span>
                          )}
                        </h4>
                        <code className="text-[10px] text-slate-500 bg-white/2 px-1.5 py-0.5 rounded inline-block">{v.service_key} (v{v.version_no})</code>
                      </div>
                    </div>
                  </div>

                  {showPromo ? (
                    <div className="flex items-baseline gap-2 mb-4 pl-8">
                      <span className="text-2xl font-extrabold text-brand-gold">
                        {v.current_price} {v.currency_code}
                      </span>
                      {v.original_price && (
                        <span className="text-sm text-slate-500 line-through">
                          {v.original_price} {v.currency_code}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 mb-4 pl-8">
                      <span className="text-2xl font-extrabold text-brand-gold">
                        {v.current_price} {v.currency_code}
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 space-y-1.5 mt-3 border-t border-white/5 pt-3 pl-8">
                    <div className="flex items-center gap-1.5">
                      <span>📅</span>
                      <span>
                        {isRTL ? 'تاريخ البدء:' : 'Start Date:'}{' '}
                        <span className="text-slate-300 font-semibold">
                          {v.starts_at ? new Date(v.starts_at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') : (isRTL ? 'فوري' : 'Immediately')}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>⏰</span>
                      <span>
                        {isRTL ? 'تاريخ الانتهاء:' : 'Expiration:'}{' '}
                        <span className="text-slate-300 font-semibold">
                          {v.ends_at || v.expires_at 
                            ? new Date(v.ends_at || v.expires_at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') 
                            : (isRTL ? 'مستمر' : 'Never expires')}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pl-8 pt-4 border-t border-white/5 mt-4 flex justify-end">
                  <PricingRowActions 
                    id={v.id} 
                    isActive={v.is_active} 
                    isDeleted={false}
                    locale={locale} 
                    isRTL={isRTL} 
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
