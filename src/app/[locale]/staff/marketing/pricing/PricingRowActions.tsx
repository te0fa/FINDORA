'use client'

import { useState, useTransition } from 'react'
import { handleTogglePricingActive, handleDeletePricingVersion, handleRestorePricingVersion } from './actions'

interface PricingRowActionsProps {
  id: string
  isActive: boolean
  isDeleted?: boolean
  locale: string
  isRTL: boolean
}

export default function PricingRowActions({ id, isActive, isDeleted, locale, isRTL }: PricingRowActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = () => {
    setError(null)
    startTransition(async () => {
      const res = await handleTogglePricingActive(id, !isActive, locale)
      if (res?.error) setError(res.error)
    })
  }

  const handleDelete = () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من رغبتك في حذف هذا الإصدار؟' : 'Are you sure you want to delete this version?')) return
    setError(null)
    startTransition(async () => {
      const res = await handleDeletePricingVersion(id, locale)
      if (res?.error) setError(res.error)
    })
  }

  const handleRestore = () => {
    setError(null)
    startTransition(async () => {
      const res = await handleRestorePricingVersion(id, locale)
      if (res?.error) setError(res.error)
    })
  }

  if (isDeleted) {
    return (
      <div className="flex items-center gap-2 mt-2">
        {error && <span className="text-xs text-rose-500">{error}</span>}
        
        <button
          onClick={handleRestore}
          disabled={isPending}
          className="px-3 py-1 text-xs rounded font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
        >
          {isPending 
            ? (isRTL ? 'جاري الاستعادة...' : 'Restoring...') 
            : (isRTL ? 'استعادة' : 'Restore')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {error && <span className="text-xs text-rose-500">{error}</span>}
      
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`px-3 py-1 text-xs rounded font-medium transition-all ${
          isActive 
            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' 
            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
        }`}
      >
        {isPending 
          ? (isRTL ? 'جاري الحفظ...' : 'Saving...') 
          : isActive 
            ? (isRTL ? 'إلغاء التنشيط' : 'Deactivate') 
            : (isRTL ? 'تنشيط' : 'Activate')}
      </button>

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-1 text-xs rounded font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
      >
        {isRTL ? 'حذف' : 'Delete'}
      </button>
    </div>
  )
}
