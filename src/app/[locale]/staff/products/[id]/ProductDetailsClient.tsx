'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  title_ar: string
  title_en: string | null
  brand: string | null
  category: string
  subcategory: string | null
  current_price: number | null
  currency_code: string
  image_url: string | null
  is_active: boolean
  specifications: Record<string, any>
  trend?: {
    trend_7d: string | null
    trend_30d: string | null
    trend_score: number | null
    lowest_price: number | null
    highest_price: number | null
    average_price: number | null
  }
}

interface PriceSnapshot {
  id: string
  price: number
  currency_code: string
  source: string | null
  captured_at: string
}

interface PriceEvent {
  id: string
  old_price: number
  new_price: number
  absolute_change: number
  percentage_change: number
  direction: 'up' | 'down' | 'no_change'
  created_at: string
}

interface AlternativeProduct {
  product: {
    id: string
    title_ar: string
    title_en: string | null
    brand: string | null
    category: string
    current_price: number | null
    currency_code: string
  }
  total_score: number
  category_score: number
  price_score: number
  spec_score: number
  popularity_score: number
}

interface ProductExplanation {
  product_id: string
  pros: Array<{ label_ar: string; label_en: string; magnitude: string }>
  cons: Array<{ label_ar: string; label_en: string; magnitude: string }>
  savings: {
    amount: number | null
    percentage: number | null
    more_expensive_by: number | null
  }
  verdict_ar: string
  verdict_en: string
  confidence: string
}

interface ProductDetailsClientProps {
  product: Product
  priceHistory: PriceSnapshot[]
  priceEvents: PriceEvent[]
  alternatives: AlternativeProduct[]
  explanations: ProductExplanation[]
  locale: string
  isAdmin?: boolean
}

export default function ProductDetailsClient({
  product,
  priceHistory,
  priceEvents,
  alternatives,
  explanations,
  locale,
  isAdmin
}: ProductDetailsClientProps) {
  const router = useRouter()
  const isRTL = locale === 'ar'

  // Price update states
  const [newPrice, setNewPrice] = useState('')
  const [priceSource, setPriceSource] = useState('staff_update')
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  // Archiving states
  const [archiving, setArchiving] = useState(false)

  // Alternatives explanations expanded states
  const [expandedAlternativeId, setExpandedAlternativeId] = useState<string | null>(null)

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPrice) return

    setUpdating(true)
    setUpdateError(null)
    setUpdateSuccess(false)

    try {
      const res = await fetch(`/api/products/${product.id}/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: Number(newPrice),
          source: priceSource
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update price')
      }

      setUpdateSuccess(true)
      setNewPrice('')
      router.refresh()
    } catch (err: any) {
      setUpdateError(err.message || 'An error occurred')
    } finally {
      setUpdating(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من أرشفة هذا المنتج؟' : 'Are you sure you want to archive this product?')) {
      return
    }

    setArchiving(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to archive product')
      }

      router.push(`/${locale}/staff/products`)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to archive')
    } finally {
      setArchiving(false)
    }
  }

  const toggleAlternative = (id: string) => {
    if (expandedAlternativeId === id) {
      setExpandedAlternativeId(null)
    } else {
      setExpandedAlternativeId(id)
    }
  }

  return (
    <div className="product-details-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .product-details-page {
          direction: ${isRTL ? 'rtl' : 'ltr'};
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
        }
        .header-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .back-link {
          color: var(--secondary);
          text-decoration: none;
          font-weight: bold;
          font-size: 1rem;
        }
        .back-link:hover {
          color: #fff;
        }
        .product-title {
          font-size: 2rem;
          margin: 4px 0 8px 0;
        }
        .product-meta-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .badge-category {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .badge-brand {
          background: rgba(234, 179, 8, 0.15);
          color: #fde047;
        }
        .badge-status {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }
        .btn-archive {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s ease;
        }
        .btn-archive:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        .details-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .details-grid {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .panel-title {
          font-size: 1.2rem;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          color: var(--accent);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--secondary);
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
        }
        .stat-value.price {
          color: var(--accent);
        }
        .trend-gauge-wrapper {
          display: flex;
          align-items: center;
          gap: 20px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          padding: 16px;
        }
        .trend-score-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid var(--accent);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.4rem;
          color: var(--accent);
        }
        .trend-score-info {
          flex: 1;
        }
        .price-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--secondary);
        }
        .form-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: #fff;
          padding: 10px 14px;
          font-size: 0.95rem;
          outline: none;
        }
        .form-input:focus {
          border-color: var(--accent);
        }
        .btn-update {
          background: var(--accent);
          color: #000;
          border: none;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.2s ease;
        }
        .btn-update:hover {
          background: #e5b35c;
        }
        .success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-weight: bold;
        }
        .specs-table {
          width: 100%;
          border-collapse: collapse;
        }
        .specs-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          font-size: 0.9rem;
        }
        .specs-table td.label-cell {
          color: var(--secondary);
          font-weight: bold;
          width: 40%;
        }
        .specs-table td.value-cell {
          color: #fff;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 300px;
          overflow-y: auto;
        }
        .history-item {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }
        .event-item {
          border-left: 3px solid #ccc;
          padding-left: 12px;
        }
        .event-item.up {
          border-left-color: #ef4444; /* red for rise */
        }
        .event-item.down {
          border-left-color: #22c55e; /* green for drop */
        }
        .event-change {
          font-weight: bold;
        }
        .event-change.up {
          color: #ef4444;
        }
        .event-change.down {
          color: #22c55e;
        }
        .alternatives-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .alternative-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .alternative-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .alternative-header:hover {
          background: rgba(255,255,255,0.02);
        }
        .alternative-title {
          font-weight: bold;
          font-size: 1rem;
        }
        .alternative-score {
          font-weight: bold;
          color: var(--accent);
          background: rgba(200, 151, 59, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
        }
        .explanation-panel {
          padding: 16px;
          background: rgba(0,0,0,0.15);
          border-top: 1px solid var(--border);
        }
        .explanation-verdict {
          font-weight: bold;
          margin-bottom: 12px;
          color: var(--accent);
        }
        .pro-con-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .pro-con-grid {
            grid-template-columns: 1fr;
          }
        }
        .pro-column, .con-column {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pro-item {
          color: #4ade80;
          font-size: 0.85rem;
        }
        .con-item {
          color: #f87171;
          font-size: 0.85rem;
        }
      ` }} />

      <div className="page-header">
        <div className="header-left">
          <Link href={`/${locale}/staff/products`} className="back-link">
            {isRTL ? '← العودة إلى الكتالوج' : '← Back to Catalog'}
          </Link>
          <h1 className="product-title">{product.title_ar}</h1>
          {product.title_en && <div style={{ opacity: 0.6, fontSize: '1rem', marginTop: '-4px' }}>{product.title_en}</div>}
          <div className="product-meta-badges">
            <span className="badge badge-brand">{product.brand || (isRTL ? 'ماركة غير معروفة' : 'Unknown Brand')}</span>
            <span className="badge badge-category">{product.category}</span>
            {product.is_active ? (
              <span className="badge badge-status">{isRTL ? 'نشط' : 'Active'}</span>
            ) : (
              <span className="badge badge-status" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                {isRTL ? 'مؤرشف' : 'Archived'}
              </span>
            )}
          </div>
        </div>
        {isAdmin && product.is_active && (
          <button className="btn-archive" onClick={handleArchive} disabled={archiving}>
            {archiving ? (isRTL ? 'جاري الأرشفة...' : 'Archiving...') : (isRTL ? 'أرشفة المنتج 🗑️' : 'Archive Product 🗑️')}
          </button>
        )}
      </div>

      <div className="details-grid">
        {/* LEFT COLUMN: Stats, Specifications, Recommendations */}
        <div>
          {/* Prices & Trend Score Panel */}
          <div className="panel">
            <div className="panel-title">{isRTL ? 'تحليل الأسعار والاتجاهات 📈' : 'Price Analysis & Trends 📈'}</div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">{isRTL ? 'السعر الحالي' : 'Current Price'}</div>
                <div className="stat-value price">
                  {product.current_price !== null
                    ? `${product.current_price.toLocaleString()} ${product.currency_code}`
                    : (isRTL ? 'غير مسعر' : 'Unpriced')}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{isRTL ? 'أدنى سعر' : 'Lowest Price'}</div>
                <div className="stat-value">
                  {product.trend?.lowest_price
                    ? `${product.trend.lowest_price.toLocaleString()} ${product.currency_code}`
                    : '-'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{isRTL ? 'أعلى سعر' : 'Highest Price'}</div>
                <div className="stat-value">
                  {product.trend?.highest_price
                    ? `${product.trend.highest_price.toLocaleString()} ${product.currency_code}`
                    : '-'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{isRTL ? 'متوسط السعر' : 'Average Price'}</div>
                <div className="stat-value">
                  {product.trend?.average_price
                    ? `${product.trend.average_price.toLocaleString()} ${product.currency_code}`
                    : '-'}
                </div>
              </div>
            </div>

            {product.trend?.trend_score !== undefined && (
              <div className="trend-gauge-wrapper">
                <div className="trend-score-circle">
                  {product.trend.trend_score}
                </div>
                <div className="trend-score-info">
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>
                    {isRTL ? 'مؤشر فرصة الشراء (0-100)' : 'Buying Opportunity Index (0-100)'}
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    {isRTL
                      ? `نقاط أعلى تعني فرصة شراء أفضل بناءً على القرب من أدنى سعر تاريخي. اتجاه الـ 30 يوماً الحالي: ${product.trend.trend_30d || 'مستقر'}`
                      : `Higher score means a better buying opportunity relative to historical lows. 30-day trend: ${product.trend.trend_30d || 'Stable'}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Specifications Panel */}
          <div className="panel">
            <div className="panel-title">{isRTL ? 'المواصفات الفنية للمنتج ⚙️' : 'Technical Specifications ⚙️'}</div>
            {Object.keys(product.specifications || {}).length === 0 ? (
              <div style={{ opacity: 0.6, fontStyle: 'italic', padding: '12px' }}>
                {isRTL ? 'لا توجد مواصفات فنية مسجلة لهذا المنتج.' : 'No specifications recorded for this product.'}
              </div>
            ) : (
              <table className="specs-table">
                <tbody>
                  {Object.entries(product.specifications || {}).map(([key, value]) => (
                    <tr key={key}>
                      <td className="label-cell">{key.replace(/_/g, ' ').toUpperCase()}</td>
                      <td className="value-cell">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Alternative Recommendations Panel */}
          <div className="panel">
            <div className="panel-title">{isRTL ? 'البدائل الذكية الموصى بها 🧠' : 'Recommended Smart Alternatives 🧠'}</div>
            {alternatives.length === 0 ? (
              <div style={{ opacity: 0.6, fontStyle: 'italic', padding: '12px' }}>
                {isRTL ? 'لا توجد بدائل كافية متوفرة لهذا المنتج.' : 'No alternative options available for this product.'}
              </div>
            ) : (
              <div className="alternatives-list">
                {alternatives.map((alt, idx) => {
                  const expl = explanations.find(e => e.product_id === alt.product.id)
                  const isExpanded = expandedAlternativeId === alt.product.id
                  return (
                    <div key={alt.product.id} className="alternative-card">
                      <div className="alternative-header" onClick={() => toggleAlternative(alt.product.id)}>
                        <div>
                          <span style={{ fontWeight: 'bold', color: 'var(--secondary)', marginRight: '8px' }}>#{idx + 1}</span>
                          <span className="alternative-title">{alt.product.title_ar}</span>
                          {alt.product.title_en && <div style={{ fontSize: '0.8rem', opacity: 0.5, paddingLeft: '22px' }}>{alt.product.title_en}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                            {alt.product.current_price?.toLocaleString()} {alt.product.currency_code}
                          </span>
                          <span className="alternative-score">
                            {isRTL ? `المطابقة: ${alt.total_score}%` : `Match: ${alt.total_score}%`}
                          </span>
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      
                      {isExpanded && expl && (
                        <div className="explanation-panel">
                          <div className="explanation-verdict">
                            💡 {isRTL ? expl.verdict_ar : expl.verdict_en}
                          </div>
                          
                          <div className="pro-con-grid">
                            <div className="pro-column">
                              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#4ade80', marginBottom: '4px' }}>
                                {isRTL ? 'الميزات (Pros):' : 'Pros:'}
                              </div>
                              {expl.pros.map((pro, pIdx) => (
                                <div key={pIdx} className="pro-item">
                                  ✓ {isRTL ? pro.label_ar : pro.label_en}
                                </div>
                              ))}
                              {expl.pros.length === 0 && <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>-</div>}
                            </div>
                            
                            <div className="con-column">
                              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#f87171', marginBottom: '4px' }}>
                                {isRTL ? 'العيوب (Cons):' : 'Cons:'}
                              </div>
                              {expl.cons.map((con, cIdx) => (
                                <div key={cIdx} className="con-item">
                                  ✗ {isRTL ? con.label_ar : con.label_en}
                                </div>
                              ))}
                              {expl.cons.length === 0 && <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>-</div>}
                            </div>
                          </div>
                          
                          {expl.savings.amount !== null && expl.savings.amount > 0 && (
                            <div style={{ marginTop: '12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#4ade80' }}>
                              💵 {isRTL
                                ? `مقدار التوفير المالي: ${expl.savings.amount.toLocaleString()} ج.م (${expl.savings.percentage}%)`
                                : `Potential Savings: EGP ${expl.savings.amount.toLocaleString()} (${expl.savings.percentage}%)`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Update Price, History Lists */}
        <div>
          {/* Price Update Form */}
          {isAdmin && product.is_active && (
            <div className="panel">
              <div className="panel-title">{isRTL ? 'تحديث سعر المنتج 🏷️' : 'Update Price 🏷️'}</div>
              {updateSuccess && <div className="success-message">{isRTL ? 'تم تحديث السعر بنجاح!' : 'Price updated successfully!'}</div>}
              {updateError && <div style={{ color: '#ef4444', marginBottom: '12px', fontWeight: 'bold' }}>{updateError}</div>}
              
              <form onSubmit={handleUpdatePrice} className="price-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{isRTL ? 'السعر الجديد (EGP)' : 'New Price (EGP)'}</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      value={newPrice}
                      onChange={e => setNewPrice(e.target.value)}
                      placeholder="e.g. 25000"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isRTL ? 'مصدر السعر' : 'Price Source'}</label>
                    <select
                      className="form-input"
                      value={priceSource}
                      onChange={e => setPriceSource(e.target.value)}
                    >
                      <option value="staff_update">{isRTL ? 'تعديل موظف يدوي' : 'Manual Staff Update'}</option>
                      <option value="vendor_feed">{isRTL ? 'تحديث المورد' : 'Vendor Feed'}</option>
                      <option value="auto_sync">{isRTL ? 'مزامنة تلقائية' : 'Auto Sync'}</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-update" disabled={updating}>
                  {updating ? (isRTL ? 'جاري التعديل...' : 'Updating...') : (isRTL ? 'تحديث السعر وتسجيل اللحظة' : 'Update Price & Capture Snapshot')}
                </button>
              </form>
            </div>
          )}

          {/* Price Events Panel */}
          <div className="panel">
            <div className="panel-title">{isRTL ? 'أحداث التغير في السعر ⚡' : 'Price Events History ⚡'}</div>
            {priceEvents.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: '0.85rem', padding: '12px' }}>
                {isRTL ? 'لم يتم تسجيل أي تغيرات في السعر بعد.' : 'No price change events recorded yet.'}
              </div>
            ) : (
              <div className="history-list">
                {priceEvents.map(event => {
                  const formattedDate = new Date(event.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                  return (
                    <div key={event.id} className={`history-item event-item ${event.direction}`}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {event.old_price.toLocaleString()} → {event.new_price.toLocaleString()} {product.currency_code}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{formattedDate}</div>
                      </div>
                      <div className={`event-change ${event.direction}`}>
                        {event.direction === 'up' ? '▲' : '▼'} {event.percentage_change.toFixed(2)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Price History Snapshots Panel */}
          <div className="panel">
            <div className="panel-title">{isRTL ? 'سجل لقطات الأسعار (snapshots) ⏱️' : 'Captured Price Snapshots ⏱️'}</div>
            {priceHistory.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: '0.85rem', padding: '12px' }}>
                {isRTL ? 'لا يوجد تاريخ أسعار مسجل.' : 'No price history snapshots available.'}
              </div>
            ) : (
              <div className="history-list">
                {priceHistory.map(snap => {
                  const formattedDate = new Date(snap.captured_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                  return (
                    <div key={snap.id} className="history-item">
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {snap.price.toLocaleString()} {snap.currency_code}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{formattedDate}</div>
                      </div>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--secondary)' }}>
                        {snap.source || 'system'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
