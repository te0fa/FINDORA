"use client"

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Deal {
  id: string
  slug: string
  title_en: string
  title_ar: string
  description_en?: string
  description_ar?: string
  original_price?: number
  deal_price: number
  currency_code: string
  image_path?: string
  category?: string
  featured_on_homepage?: boolean
}

interface DealsListProps {
  deals: Deal[]
  locale: string
  isRTL: boolean
  dict: any
}

export default function DealsList({ deals, locale, isRTL, dict }: DealsListProps) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [minDiscount, setMinDiscount] = useState<number>(0)
  const [sortBy, setSortBy] = useState<string>('featured')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Waitlist States
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)

  const handleJoinWaitlist = async () => {
    if (!searchQuery.trim()) return
    setWaitlistLoading(true)
    setWaitlistError(null)
    setWaitlistSuccess(false)
    try {
      const res = await fetch('/api/customers/waitlists/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: searchQuery,
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        setWaitlistSuccess(true)
      } else {
        setWaitlistError(data.error || (isRTL ? 'فشل الانضمام لقائمة الانتظار. تأكد من تسجيل الدخول.' : 'Failed to join waitlist. Make sure you are logged in.'))
      }
    } catch (err: any) {
      setWaitlistError(err.message || 'Error joining waitlist')
    } finally {
      setWaitlistLoading(false)
    }
  }

  // Deal Hunter States
  const [showHunterModal, setShowHunterModal] = useState(false)
  const [hunterProductName, setHunterProductName] = useState('')
  const [hunterPrice, setHunterPrice] = useState('')
  const [hunterStoreName, setHunterStoreName] = useState('')
  const [hunterCategory, setHunterCategory] = useState('')
  const [hunterProofUrl, setHunterProofUrl] = useState('')
  const [hunterLoading, setHunterLoading] = useState(false)
  const [hunterSuccess, setHunterSuccess] = useState(false)
  const [hunterError, setHunterError] = useState<string | null>(null)

  const handleHunterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hunterProductName || !hunterPrice || !hunterStoreName) return
    setHunterLoading(true)
    setHunterError(null)
    setHunterSuccess(false)
    try {
      const res = await fetch('/api/deals/hunter/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: hunterProductName,
          discoveredPrice: Number(hunterPrice),
          storeName: hunterStoreName,
          category: hunterCategory || undefined,
          proofUrl: hunterProofUrl || undefined
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setHunterSuccess(true)
        setHunterProductName('')
        setHunterPrice('')
        setHunterStoreName('')
        setHunterCategory('')
        setHunterProofUrl('')
        setTimeout(() => {
          setShowHunterModal(false)
          setHunterSuccess(false)
        }, 3000)
      } else {
        setHunterError(data.error || (isRTL ? 'فشل إرسال العرض. يرجى التأكد من تسجيل الدخول.' : 'Failed to submit deal. Please make sure you are logged in.'))
      }
    } catch (err: any) {
      setHunterError(err.message || 'Error submitting deal')
    } finally {
      setHunterLoading(false)
    }
  }

  // Get unique categories dynamically
  const categories = useMemo(() => {
    const rawCats = deals.map(d => d.category).filter(Boolean) as string[]
    return ['all', ...Array.from(new Set(rawCats))]
  }, [deals])

  // Get min/max prices from all deals to guide limits
  const priceLimits = useMemo(() => {
    if (deals.length === 0) return { min: 0, max: 1000 }
    const prices = deals.map(d => d.deal_price)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }, [deals])

  // Compute filtered & sorted deals
  const filteredAndSortedDeals = useMemo(() => {
    return deals
      .filter(deal => {
        // 1. Search Query filter (matches title and description in both languages)
        const query = searchQuery.toLowerCase().trim()
        if (query) {
          const matchTitleEn = deal.title_en?.toLowerCase().includes(query)
          const matchTitleAr = deal.title_ar?.toLowerCase().includes(query)
          const matchDescEn = deal.description_en?.toLowerCase().includes(query)
          const matchDescAr = deal.description_ar?.toLowerCase().includes(query)
          if (!matchTitleEn && !matchTitleAr && !matchDescEn && !matchDescAr) {
            return false
          }
        }

        // 2. Category filter
        if (selectedCategory !== 'all' && deal.category !== selectedCategory) {
          return false
        }

        // 3. Price range filter
        if (minPrice !== '' && deal.deal_price < minPrice) return false
        if (maxPrice !== '' && deal.deal_price > maxPrice) return false

        // 4. Discount percentage filter
        const hasDiscount = deal.original_price && deal.original_price > deal.deal_price
        const discountPercentage = hasDiscount
          ? Math.round(((deal.original_price! - deal.deal_price) / deal.original_price!) * 100)
          : 0
        if (minDiscount > 0 && discountPercentage < minDiscount) return false

        return true
      })
      .sort((a, b) => {
        // 5. Sorting logic
        if (sortBy === 'price-low') {
          return a.deal_price - b.deal_price
        }
        if (sortBy === 'price-high') {
          return b.deal_price - a.deal_price
        }
        if (sortBy === 'discount') {
          const discA = a.original_price ? (a.original_price - a.deal_price) / a.original_price : 0
          const discB = b.original_price ? (b.original_price - b.deal_price) / b.original_price : 0
          return discB - discA
        }
        if (sortBy === 'featured') {
          // Featured on homepage first
          const featA = a.featured_on_homepage ? 1 : 0
          const featB = b.featured_on_homepage ? 1 : 0
          return featB - featA
        }
        return 0 // default unsorted
      })
  }, [deals, searchQuery, selectedCategory, minPrice, maxPrice, minDiscount, sortBy])

  const getCategoryLabel = (cat: string) => {
    if (cat === 'all') return isRTL ? 'كل الفئات' : 'All Categories'
    return cat
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setMinPrice('')
    setMaxPrice('')
    setMinDiscount(0)
    setSortBy('featured')
  }

  return (
    <div className="store-layout" dir={isRTL ? "rtl" : "ltr"}>
      {/* Mobile Filters Trigger */}
      <div className="mobile-bar">
        <button className="mobile-toggle-btn" onClick={() => setShowMobileFilters(!showMobileFilters)}>
          {isRTL ? '⚙️ التصفية والترتيب' : '⚙️ Filter & Sort'}
        </button>
        <span className="results-count">
          {isRTL ? `وجدنا ${filteredAndSortedDeals.length} عرض` : `${filteredAndSortedDeals.length} deals found`}
        </span>
      </div>

      <div className="store-container">
        {/* Sidebar Filters */}
        <aside className={`store-sidebar ${showMobileFilters ? 'mobile-visible' : ''}`}>
          <div className="sidebar-header">
            <h3>{isRTL ? 'خيارات التصفية' : 'Filter Options'}</h3>
            <button className="clear-all-btn" onClick={clearFilters}>
              {isRTL ? 'إعادة ضبط' : 'Clear All'}
            </button>
          </div>

          {/* Deal Hunter Promotion */}
          <div className="filter-section" style={{ background: 'linear-gradient(135deg, rgba(212,166,60,0.15), rgba(0,0,0,0))', border: '1px solid rgba(212,166,60,0.2)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎯</span>
              <span>{isRTL ? 'صائد الصفقات' : 'Deal Hunter'}</span>
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
              {isRTL 
                ? 'هل وجدت عرضاً رائعاً في متجر آخر؟ شاركه معنا واكسب 25 نقطة VIP!' 
                : 'Found a great deal elsewhere? Share it and earn 25 VIP points!'}
            </p>
            <button 
              className="btn-accent" 
              onClick={() => setShowHunterModal(true)}
              style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {isRTL ? 'شارك عرضاً الآن' : 'Share a Deal'}
            </button>
          </div>

          {/* Search box */}
          <div className="filter-section">
            <label className="filter-label">{isRTL ? 'البحث عن منتج' : 'Search Product'}</label>
            <input
              type="text"
              className="store-input"
              placeholder={isRTL ? 'اسم المنتج أو كلمة البحث...' : 'Product title or keyword...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort selection */}
          <div className="filter-section">
            <label className="filter-label">{isRTL ? 'الترتيب حسب' : 'Sort By'}</label>
            <select
              className="store-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">{isRTL ? 'المميز أولاً' : 'Featured First'}</option>
              <option value="price-low">{isRTL ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
              <option value="price-high">{isRTL ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
              <option value="discount">{isRTL ? 'الأعلى خصماً %' : 'Biggest Discount %'}</option>
            </select>
          </div>

          {/* Categories Selector */}
          <div className="filter-section">
            <label className="filter-label">{isRTL ? 'التصنيف' : 'Category'}</label>
            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`category-pill-btn ${selectedCategory === category ? 'active' : ''}`}
                >
                  {getCategoryLabel(category)}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="filter-section">
            <label className="filter-label">{isRTL ? 'نطاق السعر (ج.م)' : 'Price Range (EGP)'}</label>
            <div className="price-inputs">
              <input
                type="number"
                className="store-input price-input"
                placeholder={isRTL ? 'الأدنى' : 'Min'}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span className="price-separator">-</span>
              <input
                type="number"
                className="store-input price-input"
                placeholder={isRTL ? 'الأقصى' : 'Max'}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div className="price-limits-hint">
              {isRTL 
                ? `الأسعار المتوفرة: من ${priceLimits.min} إلى ${priceLimits.max} ج.م` 
                : `Available: ${priceLimits.min} to ${priceLimits.max} EGP`}
            </div>
          </div>

          {/* Discount Percentage Filter */}
          <div className="filter-section">
            <label className="filter-label">{isRTL ? 'الحد الأدنى للخصم' : 'Minimum Discount'}</label>
            <div className="discount-options">
              {[0, 10, 20, 30, 50].map((percentage) => (
                <label key={percentage} className="discount-radio-label">
                  <input
                    type="radio"
                    name="minDiscount"
                    checked={minDiscount === percentage}
                    onChange={() => setMinDiscount(percentage)}
                    className="discount-radio"
                  />
                  <span>
                    {percentage === 0 
                      ? (isRTL ? 'أي خصم' : 'Any Discount') 
                      : (isRTL ? `%${percentage} أو أكثر` : `${percentage}% or more`)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Grid View */}
        <main className="store-main">
          {/* Active filter badges summary */}
          <div className="filters-summary">
            <span className="results-badge">
              {isRTL ? `وجدنا ${filteredAndSortedDeals.length} عرض` : `${filteredAndSortedDeals.length} deals found`}
            </span>
            {(searchQuery || selectedCategory !== 'all' || minPrice !== '' || maxPrice !== '' || minDiscount > 0) && (
              <button className="reset-inline-btn" onClick={clearFilters}>
                {isRTL ? 'إلغاء التصفية ✕' : 'Clear filters ✕'}
              </button>
            )}
          </div>

          {filteredAndSortedDeals.length > 0 ? (
            <div className="deals-grid">
              {filteredAndSortedDeals.map((deal) => {
                const hasDiscount = deal.original_price && deal.original_price > deal.deal_price
                const discountPercentage = hasDiscount
                  ? Math.round(((deal.original_price! - deal.deal_price) / deal.original_price!) * 100)
                  : 0

                return (
                  <div
                    key={deal.id}
                    className="store-card group"
                    data-testid="public-deal-card"
                  >
                    {/* Image Box */}
                    <div className="card-image-wrapper">
                      {deal.image_path ? (
                        <Image
                          src={deal.image_path}
                          alt={isRTL ? deal.title_ar : deal.title_en}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 250px"
                          className="card-image transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="card-image-fallback">
                          <span>FINDORA</span>
                        </div>
                      )}

                      {/* Overlays */}
                      <div className="card-badge-container">
                        {hasDiscount && (
                          <span className="badge-discount">
                            {isRTL ? `خصم ${discountPercentage}%` : `${discountPercentage}% OFF`}
                          </span>
                        )}
                        {deal.featured_on_homepage && (
                          <span className="badge-featured" title={isRTL ? "مميز" : "Featured"}>
                            ★
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Box */}
                    <div className="card-content">
                      <div className="card-meta">
                        <span className="card-category">
                          {deal.category || (isRTL ? 'عام' : 'General')}
                        </span>
                      </div>

                      <h3 className="card-title" data-testid="public-deal-title">
                        {isRTL ? deal.title_ar : deal.title_en}
                      </h3>

                      <p className="card-description">
                        {isRTL ? deal.description_ar : deal.description_en}
                      </p>

                      <div className="card-bottom">
                        <div className="price-block">
                          {hasDiscount && (
                            <span className="price-original" data-testid="public-deal-original-price">
                              {deal.original_price} {deal.currency_code}
                            </span>
                          )}
                          <span className="price-current" data-testid="public-deal-price">
                            {deal.deal_price} <span className="price-currency">{deal.currency_code}</span>
                          </span>
                        </div>

                        <Link
                          href={`/${locale}/customer/checkout/simulate?sessionId=sim_${deal.id}&amount=${deal.deal_price}&dealId=${deal.id}`}
                          className="card-btn"
                          data-testid="buy-deal-btn"
                        >
                          <span>{isRTL ? 'أشترِ الآن' : 'Buy Now'}</span>
                          <span className="btn-arrow">{isRTL ? '←' : '→'}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="store-empty-state" data-testid="public-deal-empty-state">
              <span className="empty-icon">🔍</span>
              <h4>{isRTL ? 'لا توجد نتائج مطابقة' : 'No matching results'}</h4>
              <p>{isRTL ? 'حاول تغيير خيارات البحث أو التصفية للوصول للمنتجات.' : 'Try changing your search keywords or filter settings.'}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button className="btn-secondary" onClick={clearFilters}>
                  {isRTL ? 'عرض كل العروض' : 'Show All Deals'}
                </button>
              </div>

              {searchQuery.trim() && (
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', background: 'rgba(255,255,255,0.01)', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                    {isRTL 
                      ? `هل تبحث عن "${searchQuery}"؟ انضم لقائمة الانتظار وسنرسل لك تنبيهاً فور قيام بائع بتوفير هذا العرض!` 
                      : `Looking for "${searchQuery}"? Join our waitlist and get notified immediately when a supplier bids on it!`}
                  </p>
                  {waitlistSuccess ? (
                    <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓</span>
                      <span>{isRTL ? 'تمت إضافتك بنجاح!' : 'Successfully added!'}</span>
                    </div>
                  ) : (
                    <>
                      <button 
                        className="btn-accent" 
                        onClick={handleJoinWaitlist} 
                        disabled={waitlistLoading}
                        style={{ width: 'auto', padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        {waitlistLoading 
                          ? (isRTL ? 'جاري الانضمام...' : 'Joining...') 
                          : (isRTL ? 'انضم لقائمة الانتظار' : 'Join Waitlist')}
                      </button>
                      {waitlistError && (
                        <div style={{ color: '#f87171', fontSize: '0.8rem' }}>
                          {waitlistError}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showHunterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'inherit' }}>
          <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '2rem', maxWidth: '480px', width: '100%', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', direction: isRTL ? 'rtl' : 'ltr' }}>
            <button 
              onClick={() => setShowHunterModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer', outline: 'none' }}
            >
              ✕
            </button>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>
              {isRTL ? '🎯 شارك صفقة واكسب نقاط!' : '🎯 Share a Deal & Earn Points!'}
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
              {isRTL 
                ? 'أدخل تفاصيل الصفقة التي وجدتها بالأسواق. بعد مراجعة الإدارة وتوثيقها، ستحصل تلقائياً على 25 نقطة VIP في حسابك!' 
                : 'Enter the details of the deal you found. Once approved by our team, you will receive 25 VIP points in your balance!'}
            </p>

            {hunterSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#4ade80' }}>
                <span style={{ fontSize: '3rem' }}>🎉</span>
                <h4 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {isRTL ? 'تم تقديم العرض بنجاح!' : 'Submission Successful!'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRTL ? 'يجري مراجعة العرض من الإدارة لتفعيل النقاط.' : 'Our team will review it shortly to award your points.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleHunterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>
                    {isRTL ? 'اسم المنتج *' : 'Product Name *'}
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder={isRTL ? 'مثال: تكييف شارب 1.5 حصان' : 'e.g. Sharp Air Conditioner 1.5 HP'}
                    value={hunterProductName}
                    onChange={e => setHunterProductName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>
                      {isRTL ? 'السعر (ج.م) *' : 'Price (EGP) *'}
                    </label>
                    <input 
                      type="number" 
                      required 
                      placeholder="18500"
                      value={hunterPrice}
                      onChange={e => setHunterPrice(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>
                      {isRTL ? 'اسم المتجر/البائع *' : 'Store/Seller Name *'}
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder={isRTL ? 'مثال: بي تك' : 'e.g. B.Tech'}
                      value={hunterStoreName}
                      onChange={e => setHunterStoreName(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>
                      {isRTL ? 'الفئة (اختياري)' : 'Category (Optional)'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={isRTL ? 'مثال: أجهزة منزلية' : 'e.g. Appliances'}
                      value={hunterCategory}
                      onChange={e => setHunterCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>
                      {isRTL ? 'رابط الإثبات / السعر' : 'Proof Link / Reference'}
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://..."
                      value={hunterProofUrl}
                      onChange={e => setHunterProofUrl(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {hunterError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' }}>
                    {hunterError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    type="submit" 
                    disabled={hunterLoading}
                    className="btn-accent"
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 750 }}
                  >
                    {hunterLoading ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال العرض' : 'Submit Deal')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowHunterModal(false)}
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '0.75rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem', margin: 0 }}
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        /* Store Layout Wrapper */
        .store-layout {
          width: 100%;
          font-family: inherit;
        }

        /* Mobile controls */
        .mobile-bar {
          display: none;
          justify-content: space-between;
          align-items: center;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 16px;
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .mobile-toggle-btn {
          background: #d4a63c;
          color: #000;
          font-weight: 800;
          font-size: 0.8rem;
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          width: auto;
        }
        .results-count {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Core container layout */
        .store-container {
          display: flex;
          gap: 32px;
          align-items: start;
        }

        /* Sidebar Filter System */
        .store-sidebar {
          flex: 0 0 280px;
          width: 280px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          position: sticky;
          top: 140px;
          backdrop-filter: blur(16px);
        }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .sidebar-header h3 {
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0;
          color: #fff;
        }
        .clear-all-btn {
          background: transparent;
          border: none;
          color: #d4a63c;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          padding: 0;
          width: auto;
          text-decoration: underline;
        }
        .clear-all-btn:hover {
          color: #e5b955;
        }

        /* Filter elements style */
        .filter-section {
          margin-bottom: 24px;
        }
        .filter-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }
        .store-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .store-input:focus {
          border-color: rgba(212, 166, 60, 0.4);
        }
        .store-select {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-size: 0.85rem;
          outline: none;
          cursor: pointer;
        }
        .store-select option {
          background: #0f172a;
          color: #fff;
        }

        /* Category pill group inside sidebar */
        .category-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .category-pill-btn {
          background: transparent;
          border: 1px solid transparent;
          color: rgba(255, 255, 255, 0.6);
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.8rem;
          text-align: start;
          transition: all 0.2s;
          cursor: pointer;
          width: 100%;
        }
        .category-pill-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
        }
        .category-pill-btn.active {
          background: rgba(212, 166, 60, 0.1);
          color: #d4a63c;
          border-color: rgba(212, 166, 60, 0.2);
          font-weight: 800;
        }

        /* Price inputs */
        .price-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .price-input {
          text-align: center;
          padding: 8px;
        }
        .price-separator {
          color: rgba(255, 255, 255, 0.3);
          font-weight: 800;
        }
        .price-limits-hint {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.3);
          margin-top: 6px;
        }

        /* Discount radios */
        .discount-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .discount-radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: color 0.2s;
        }
        .discount-radio-label:hover {
          color: #fff;
        }
        .discount-radio {
          width: 16px;
          height: 16px;
          accent-color: #d4a63c;
          cursor: pointer;
        }

        /* Main Viewport layout */
        .store-main {
          flex: 1;
        }
        .filters-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .results-badge {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
        }
        .reset-inline-btn {
          background: transparent;
          border: none;
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          padding: 0;
          width: auto;
        }
        .reset-inline-btn:hover {
          text-decoration: underline;
        }

        /* Products Grid */
        .deals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 24px;
        }

        /* Store Product Card (Vertical Grid Item) */
        .store-card {
          display: flex;
          flex-direction: column;
          background: linear-gradient(
            145deg,
            rgba(15, 23, 42, 0.7),
            rgba(15, 23, 42, 0.3)
          );
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 100%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .store-card:hover {
          border-color: rgba(212, 166, 60, 0.3);
          transform: translateY(-6px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(212, 166, 60, 0.05);
        }

        /* Card Image Box */
        .card-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          overflow: hidden;
        }
        .card-image {
          object-fit: cover;
        }
        .card-image-fallback {
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom right, rgba(212, 166, 60, 0.08), transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(212, 166, 60, 0.2);
          font-size: 1.25rem;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        /* Image Overlays Badges */
        .card-badge-container {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: none;
        }
        .badge-discount {
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 900;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
        }
        .badge-featured {
          background: #d4a63c;
          color: #000;
          font-size: 0.7rem;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          box-shadow: 0 4px 10px rgba(212, 166, 60, 0.3);
        }

        /* Card Content Box */
        .card-content {
          padding: 16px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }
        .card-meta {
          margin-bottom: 6px;
        }
        .card-category {
          font-size: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #d4a63c;
          font-weight: 800;
        }
        .card-title {
          font-size: 0.95rem;
          font-weight: 800;
          line-height: 1.35;
          color: #fff;
          margin: 0 0 6px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 2.7em;
        }
        .card-description {
          font-size: 0.75rem;
          color: rgba(248, 250, 252, 0.5);
          line-height: 1.45;
          margin: 0 0 16px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 2.9em;
        }
        .card-bottom {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Price block layout */
        .price-block {
          display: flex;
          flex-direction: column;
        }
        .price-original {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.35);
          text-decoration: line-through;
          margin-bottom: 1px;
        }
        .price-current {
          font-size: 1.2rem;
          font-weight: 900;
          color: #fff;
        }
        .price-currency {
          font-size: 0.7rem;
          color: #d4a63c;
          font-weight: 700;
        }

        /* Card Button styling */
        .card-btn {
          width: 100%;
          background: #d4a63c;
          color: #000;
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none !important;
        }
        .card-btn:hover {
          background: #e5b955;
          box-shadow: 0 6px 12px rgba(212, 166, 60, 0.2);
        }
        .btn-arrow {
          font-size: 0.95rem;
          transition: transform 0.2s;
        }
        .card-btn:hover .btn-arrow {
          transform: translateX(3px);
        }
        [dir="rtl"] .card-btn:hover .btn-arrow {
          transform: translateX(-3px);
        }

        /* Empty State */
        .store-empty-state {
          text-align: center;
          padding: 60px 24px;
          background: rgba(15, 23, 42, 0.3);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 24px;
        }
        .empty-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 16px;
        }
        .store-empty-state h4 {
          font-size: 1.2rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 8px 0;
        }
        .store-empty-state p {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0 0 24px 0;
        }

        /* RTL alignments adjustment */
        [dir="rtl"] .category-pill-btn {
          text-align: right;
        }

        /* Responsive Breakpoints */
        @media (max-width: 991px) {
          .store-container {
            flex-direction: column;
            gap: 24px;
          }
          .store-sidebar {
            width: 100%;
            flex: none;
            position: static;
            display: none;
          }
          .store-sidebar.mobile-visible {
            display: block;
          }
          .mobile-bar {
            display: flex;
          }
        }
      `}</style>
    </div>
  )
}
