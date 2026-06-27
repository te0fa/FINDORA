'use client'

import { useState } from 'react'

interface ServiceOption {
  id: string
  service_key: string
  title_en: string
  title_ar: string
  currentBasePrice: number | null
  activePricingId: string | null
}

interface PromoServiceSelectorProps {
  services: ServiceOption[]
  isRTL: boolean
}

export default function PromoServiceSelector({ services, isRTL }: PromoServiceSelectorProps) {
  const [selectedKey, setSelectedKey] = useState('')

  const selectedService = services.find(s => s.service_key === selectedKey)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKey(e.target.value)
  }

  return (
    <>
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-1">
          {isRTL ? 'الخدمة' : 'Service'}
        </label>
        <select
          name="service_key"
          value={selectedKey}
          onChange={handleChange}
          className="w-full bg-slate-950/80 border border-white/10 text-slate-100 rounded-lg p-2.5 text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
          data-testid="pricing-service-select"
          required
        >
          <option value="">{isRTL ? 'اختر خدمة' : 'Select Service'}</option>
          {services.map(s => (
            <option key={s.id} value={s.service_key}>
              {isRTL ? s.title_ar : s.title_en}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-filled base price hint when a service is selected */}
      {selectedService && selectedService.currentBasePrice !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-gold/5 border border-brand-gold/15 text-[11px] text-slate-300">
          <span className="text-brand-gold font-bold text-sm">{selectedService.currentBasePrice}</span>
          <span className="text-slate-400">EGP</span>
          <span className="text-slate-500">
            {isRTL ? '← السعر الأساسي الحالي للخدمة' : '← current base price of this service'}
          </span>
        </div>
      )}
    </>
  )
}
