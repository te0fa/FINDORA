'use client'

import { useState, useTransition } from 'react'
import { handleUpdateBasePrice } from './actions'

interface BasePriceEditorProps {
  serviceKey: string
  pricingId: string | undefined
  currentPrice: number | string
  locale: string
  isRTL: boolean
}

export default function BasePriceEditor({ serviceKey, pricingId, currentPrice, locale, isRTL }: BasePriceEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(String(currentPrice))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    const parsed = parseFloat(value)
    if (isNaN(parsed) || parsed < 0) {
      setError(isRTL ? 'سعر غير صالح' : 'Invalid price')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await handleUpdateBasePrice(serviceKey, pricingId, parsed, locale)
      if (res?.error) {
        setError(res.error)
      } else {
        setIsEditing(false)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setValue(String(currentPrice))
      setIsEditing(false)
      setError(null)
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            step="0.01"
            min="0"
            disabled={isPending}
            className="w-20 bg-slate-950 border border-brand-gold/60 text-slate-100 rounded px-2 py-1 text-xs text-right focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/40 outline-none font-bold"
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all font-semibold cursor-pointer"
            title={isRTL ? 'حفظ' : 'Save'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </button>
          <button
            onClick={() => { setIsEditing(false); setValue(String(currentPrice)); setError(null) }}
            disabled={isPending}
            className="p-1 rounded bg-white/5 text-slate-400 hover:bg-white/10 transition-all cursor-pointer"
            title={isRTL ? 'إلغاء' : 'Cancel'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {error && <span className="text-[9px] text-rose-400 font-medium">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5 group/edit justify-end">
        <span className="text-base font-extrabold text-brand-gold tracking-tight">{currentPrice} EGP</span>
        
        <button
          onClick={() => setIsEditing(true)}
          title={isRTL ? 'تعديل السعر الأساسي' : 'Edit base price'}
          className="p-1 rounded bg-white/5 border border-white/10 text-slate-400 group-hover/edit:text-brand-gold group-hover/edit:border-brand-gold/30 group-hover/edit:bg-brand-gold/10 transition-all duration-300 cursor-pointer shadow-sm shadow-black/20"
        >
          {/* Elite Small Vector Pencil Icon */}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
      </div>
      <div className="text-[9px] text-slate-500 tracking-wide font-medium">
        {!pricingId 
          ? (isRTL ? 'تحديد سعر ✏️' : 'Set price ✏️')
          : (isRTL ? 'انقر للتعديل' : 'Click pencil to edit')
        }
      </div>
    </div>
  )
}
