'use client'

import { handleDeleteDeal, handleHardDeleteDeal } from './actions'

interface Props {
  id: string
  locale: string
}

export function ArchiveDealButton({ id, locale }: Props) {
  const isRTL = locale === 'ar'
  return (
    <form 
      action={handleDeleteDeal} 
      onSubmit={(e) => {
        if (!window.confirm(isRTL ? 'هل أنت متأكد من أرشفة هذا المنتج؟' : 'Archive this product?')) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', border: 'none', color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}
      >
        {isRTL ? 'أرشفة' : 'Archive'}
      </button>
    </form>
  )
}

export function HardDeleteDealButton({ id, locale }: Props) {
  const isRTL = locale === 'ar'
  return (
    <form 
      action={handleHardDeleteDeal} 
      onSubmit={(e) => {
        if (!window.confirm(isRTL ? 'سيتم مسح المنتج نهائياً من قاعدة البيانات، هل أنت متأكد؟' : 'Permanently delete this product? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', border: 'none', color: 'white', background: '#dc2626' }}
      >
        {isRTL ? 'حذف نهائي ⚠️' : 'Hard Delete ⚠️'}
      </button>
    </form>
  )
}

import { handleToggleFeatureDeal } from './actions'

interface FeatureProps {
  id: string
  locale: string
  isFeatured: boolean
}

export function ToggleFeatureButton({ id, locale, isFeatured }: FeatureProps) {
  const isRTL = locale === 'ar'
  return (
    <form action={handleToggleFeatureDeal}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="featured" value={(!isFeatured).toString()} />
      <button 
        type="submit" 
        style={{ 
          padding: '0.3rem 0.6rem', 
          borderRadius: '999px', 
          fontSize: '0.65rem', 
          fontWeight: 800, 
          cursor: 'pointer', 
          color: isFeatured ? '#60a5fa' : 'rgba(255,255,255,0.5)', 
          background: isFeatured ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
          border: isFeatured ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.2s'
        }}
      >
        ★ {isFeatured ? (isRTL ? 'مميز بالرئيسية' : 'FEATURED') : (isRTL ? 'عرض بالرئيسية' : 'SET FEATURED')}
      </button>
    </form>
  )
}

export function CategoryFilter({ locale, tab, edit, defaultCategory, categories }: { locale: string, tab: string, edit?: string, defaultCategory: string, categories: { value: string, labelAr: string, labelEn: string }[] }) {
  const isRTL = locale === 'ar'
  return (
    <form method="get" action={`/${locale}/staff/marketing/deals`} style={{ display: 'inline-block' }}>
      <input type="hidden" name="tab" value={tab} />
      {edit && <input type="hidden" name="edit" value={edit} />}
      <select 
        name="category" 
        defaultValue={defaultCategory}
        onChange={(e) => e.target.form?.submit()}
        style={{ 
          background: 'rgba(255,255,255,0.05)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '10px', 
          padding: '0.4rem 1.5rem 0.4rem 0.8rem', 
          color: 'white', 
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          appearance: 'none'
        }}
      >
        <option value="all" style={{ color: '#000' }}>{isRTL ? 'جميع الأقسام' : 'All Categories'}</option>
        {categories.map(c => (
          <option key={c.value} value={c.value} style={{ color: '#000' }}>{isRTL ? c.labelAr : c.labelEn}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>▼</span>
    </form>
  )
}
