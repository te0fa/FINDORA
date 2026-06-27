'use client'

import React, { useState } from 'react'

interface SourcingRequest {
  id: string
  request_code: string
  title: string
  raw_description: string
  budget: number | null
  city: string | null
  priority: string | null
  accepts_used: boolean
  created_at: string
  customer_id: string
}

interface VendorAuctionsClientProps {
  vendor: {
    id: string
    display_name: string
    trust_score: number
  }
  requests: SourcingRequest[]
  reliabilityMap: Record<string, {
    purchase_rate: number
    response_rate: number
    reliability_score: number | null
  }>
  existingBids: Record<string, {
    id: string
    price_amount: number
    delivery_days: number
    warranty_months: number
    product_condition: 'new' | 'used' | 'refurbished'
    installation_included: boolean
    after_sales_service: string | null
    freebies: string | null
    deal_score: number
  }>
  demandIntel: {
    topProducts: Array<{ name: string; count: number }>
    topCities: Array<{ name: string; count: number }>
    averageRequestedPrices: Array<{ category: string; avgPrice: number }>
    supplyGaps: Array<{ category: string; title: string; count: number }>
  }
  locale: string
}

export default function VendorAuctionsClient({
  vendor,
  requests,
  reliabilityMap,
  existingBids,
  demandIntel,
  locale
}: VendorAuctionsClientProps) {
  const isRTL = locale === 'ar'
  const [activeTab, setActiveTab] = useState<'auctions' | 'demand'>('auctions')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  // Form States for Bid Submission
  const [price, setPrice] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState('12')
  const [condition, setCondition] = useState<'new' | 'used' | 'refurbished'>('new')
  const [installation, setInstallation] = useState(false)
  const [afterSales, setAfterSales] = useState('')
  const [freebies, setFreebies] = useState('')

  // AI Bidding feedback state
  const [submitting, setSubmitting] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<any | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectRequest = (reqId: string) => {
    setSelectedRequestId(reqId)
    setAiFeedback(null)
    setSuccess(false)
    setError(null)

    const existing = existingBids[reqId]
    if (existing) {
      setPrice(String(existing.price_amount))
      setDeliveryDays(String(existing.delivery_days))
      setWarrantyMonths(String(existing.warranty_months))
      setCondition(existing.product_condition)
      setInstallation(existing.installation_included)
      setAfterSales(existing.after_sales_service || '')
      setFreebies(existing.freebies || '')
    } else {
      setPrice('')
      setDeliveryDays('')
      setWarrantyMonths('12')
      setCondition('new')
      setInstallation(false)
      setAfterSales('')
      setFreebies('')
    }
  }

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequestId || !price || !deliveryDays) return

    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selectedRequestId,
          vendor_id: vendor.id,
          price_amount: Number(price),
          delivery_days: Number(deliveryDays),
          warranty_months: Number(warrantyMonths),
          product_condition: condition,
          installation_included: installation,
          after_sales_service: afterSales || undefined,
          freebies: freebies || undefined
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit offer')
      }

      setSuccess(true)
      setAiFeedback(data.aiFeedback)
      
      // Update local existingBids map
      existingBids[selectedRequestId] = data.bid
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRequest = requests.find(r => r.id === selectedRequestId)
  const buyerReliability = selectedRequest ? reliabilityMap[selectedRequest.customer_id] : null

  return (
    <div className="vendor-auctions-dashboard" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .vendor-auctions-dashboard {
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
        .page-title {
          font-size: 1.8rem;
          margin: 0;
        }
        .tabs-header {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .tab-btn {
          background: transparent;
          border: none;
          color: var(--secondary);
          font-size: 1rem;
          font-weight: bold;
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }
        .tab-btn:hover:not(.active) {
          color: #fff;
        }
        .layout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
        }
        .panel-title {
          font-size: 1.2rem;
          margin-bottom: 16px;
          color: var(--accent);
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        .request-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .request-card:hover, .request-card.selected {
          border-color: var(--accent);
          background: rgba(255,255,255,0.02);
        }
        .request-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .request-title {
          font-weight: bold;
          font-size: 1.1rem;
        }
        .request-code {
          font-family: monospace;
          color: var(--secondary);
        }
        .request-meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          font-size: 0.8rem;
          color: var(--secondary);
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
        }
        .badge-has-bid {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: bold;
          color: var(--secondary);
        }
        .form-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: #fff;
          padding: 8px 12px;
          font-size: 0.9rem;
          outline: none;
        }
        .form-input:focus {
          border-color: var(--accent);
        }
        .ai-feedback-card {
          background: rgba(200, 151, 59, 0.1);
          border: 1px solid rgba(200, 151, 59, 0.3);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ai-feedback-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: var(--accent);
        }
        .buyer-reliability-card {
          background: rgba(34, 197, 94, 0.05);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .intel-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 800px) {
          .intel-grid {
            grid-template-columns: 1fr;
          }
        }
        .intel-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .intel-item {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      ` }} />

      <div className="page-header">
        <h1 className="page-title">
          {isRTL ? 'بوابة تجار Findora — المناقصات وذكاء السوق 🏪' : 'Findora Merchant Portal — Auctions & Market Intel 🏪'}
        </h1>
        <div style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>
          {isRTL ? `مرحباً، ${vendor.display_name} (تقييمك: ${vendor.trust_score}%)` : `Welcome, ${vendor.display_name} (Trust: ${vendor.trust_score}%)`}
        </div>
      </div>

      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'auctions' ? 'active' : ''}`}
          onClick={() => setActiveTab('auctions')}
        >
          {isRTL ? 'المناقصات المتاحة ⚖️' : 'Active Auctions'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'demand' ? 'active' : ''}`}
          onClick={() => setActiveTab('demand')}
        >
          {isRTL ? 'تحليلات الطلب وذكاء السوق 📈' : 'Demand Heatmap & Market Intel'}
        </button>
      </div>

      {activeTab === 'auctions' ? (
        <div className="layout-grid">
          {/* LEFT PANEL: Sourcing Requests List */}
          <div className="panel" style={{ maxHeight: '700px', overflowY: 'auto' }}>
            <div className="panel-title">{isRTL ? 'طلبات الشراء النشطة' : 'Active Bidding Requests'}</div>
            {requests.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', opacity: 0.6 }}>
                {isRTL ? 'لا توجد طلبات جارية للمنافسة حالياً.' : 'No active requests available for bidding.'}
              </div>
            ) : (
              requests.map(req => {
                const hasBid = !!existingBids[req.id]
                return (
                  <div
                    key={req.id}
                    className={`request-card ${selectedRequestId === req.id ? 'selected' : ''}`}
                    onClick={() => handleSelectRequest(req.id)}
                  >
                    <div className="request-header">
                      <span className="request-title">{req.title}</span>
                      <span className="request-code">{req.request_code}</span>
                    </div>
                    
                    <div className="request-meta-grid">
                      <div>
                        <strong>{isRTL ? 'الميزانية:' : 'Budget:'}</strong>{' '}
                        <span style={{ color: 'var(--accent)' }}>
                          {req.budget ? `${req.budget.toLocaleString()} EGP` : '-'}
                        </span>
                      </div>
                      <div>
                        <strong>{isRTL ? 'المدينة:' : 'City:'}</strong> {req.city || '-'}
                      </div>
                      <div>
                        {hasBid && <span className="badge badge-has-bid">{isRTL ? 'تم تقديم عرض' : 'Offer Placed'}</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* RIGHT PANEL: Bid Submission & AI Feedback */}
          <div className="panel">
            <div className="panel-title">
              {isRTL ? 'تفاصيل تقديم العرض والذكاء الاصطناعي' : 'Bid Submission & AI Feedback'}
            </div>
            
            {!selectedRequestId ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', opacity: 0.5 }}>
                {isRTL ? 'اختر طلباً من القائمة اليسرى لتقديم عرضك ومنافسة التجار.' : 'Select a request from the left list to place your bid.'}
              </div>
            ) : (
              <div>
                {/* Buyer Reliability Card */}
                {buyerReliability && (
                  <div className="buyer-reliability-card">
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#4ade80' }}>
                        🛡️ {isRTL ? 'بطاقة موثوقية المشتري' : 'Buyer Reliability Index'}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>
                        {isRTL
                          ? `نسبة إتمام الشراء السابقة: ${buyerReliability.purchase_rate.toFixed(0)}%`
                          : `Past purchase completion rate: ${buyerReliability.purchase_rate.toFixed(0)}%`}
                      </div>
                    </div>
                    <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#4ade80' }}>
                      {buyerReliability.reliability_score !== null
                        ? `${buyerReliability.reliability_score.toFixed(0)}%`
                        : (isRTL ? 'عميل جديد' : 'New Buyer')}
                    </div>
                  </div>
                )}

                {/* AI Bidding Feedback Card */}
                {aiFeedback && (
                  <div className="ai-feedback-card">
                    <div className="ai-feedback-circle">
                      #{aiFeedback.rank}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        🤖 {isRTL ? 'توجيه المزاد العكسي AI' : 'Live Reverse Auction Guide'}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>
                        {isRTL ? aiFeedback.messageAr : aiFeedback.messageEn}
                      </div>
                    </div>
                  </div>
                )}

                {success && <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#4ade80', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
                  {isRTL ? 'تم حفظ العرض بنجاح وتحديث ترتيبك!' : 'Offer submitted successfully and rank updated!'}
                </div>}

                {error && <div style={{ color: '#ef4444', marginBottom: '16px', fontWeight: 'bold' }}>{error}</div>}

                <form onSubmit={handleSubmitBid}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">{isRTL ? 'سعر العرض (EGP)' : 'Bid Price (EGP)'}</label>
                      <input
                        type="number"
                        required
                        className="form-input"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="e.g. 9800"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isRTL ? 'مدة التوصيل (أيام)' : 'Delivery Time (Days)'}</label>
                      <input
                        type="number"
                        required
                        className="form-input"
                        value={deliveryDays}
                        onChange={e => setDeliveryDays(e.target.value)}
                        placeholder="e.g. 2"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isRTL ? 'الضمان (أشهر)' : 'Warranty (Months)'}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warrantyMonths}
                        onChange={e => setWarrantyMonths(e.target.value)}
                        placeholder="e.g. 12"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isRTL ? 'حالة المنتج' : 'Condition'}</label>
                      <select
                        className="form-input"
                        value={condition}
                        onChange={e => setCondition(e.target.value as any)}
                      >
                        <option value="new">{isRTL ? 'جديد كلياً' : 'New'}</option>
                        <option value="used">{isRTL ? 'مستعمل' : 'Used'}</option>
                        <option value="refurbished">{isRTL ? 'مجدد' : 'Refurbished'}</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1', flexDirection: 'row', gap: '8px', alignItems: 'center', margin: '6px 0' }}>
                      <input
                        type="checkbox"
                        id="installation"
                        checked={installation}
                        onChange={e => setInstallation(e.target.checked)}
                      />
                      <label htmlFor="installation" className="form-label" style={{ cursor: 'pointer' }}>
                        {isRTL ? 'العرض يشمل خدمات التركيب والتشغيل' : 'Installation / assembly included'}
                      </label>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">{isRTL ? 'خدمة ما بعد البيع' : 'After-sales support details'}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={afterSales}
                        onChange={e => setAfterSales(e.target.value)}
                        placeholder={isRTL ? 'مثال: صيانة مجانية أول 6 أشهر' : 'e.g. Free maintenance first 6 months'}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">{isRTL ? 'هدايا أو إضافات مجانية' : 'Gifts / free additions'}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={freebies}
                        onChange={e => setFreebies(e.target.value)}
                        placeholder={isRTL ? 'مثال: جراب وشاحن أصلي مجاناً' : 'e.g. Free original charger and cover'}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={submitting}
                    style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                  >
                    {submitting ? (isRTL ? 'جاري التقييم والتسجيل...' : 'Evaluating bid...') : (isRTL ? 'تقديم العرض والمنافسة' : 'Submit Bid & Compete')}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DEMAND INTELLIGENCE PANEL */
        <div className="intel-grid">
          {/* Top Products */}
          <div className="panel">
            <div className="panel-title">📦 {isRTL ? 'السلع الأكثر طلباً هذا الأسبوع' : 'Top Demanded Products This Week'}</div>
            <div className="intel-list">
              {demandIntel.topProducts.length === 0 ? (
                <div style={{ opacity: 0.6, padding: '12px' }}>{isRTL ? 'لا توجد بيانات طلبات كافية.' : 'No demand data available.'}</div>
              ) : (
                demandIntel.topProducts.map((p, idx) => (
                  <div key={idx} className="intel-item">
                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fde047' }}>
                      {p.count} {isRTL ? 'طلبات' : 'requests'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Cities */}
          <div className="panel">
            <div className="panel-title">📍 {isRTL ? 'المناطق والمدن الأكثر نشاطاً' : 'Most Active Purchasing Cities'}</div>
            <div className="intel-list">
              {demandIntel.topCities.length === 0 ? (
                <div style={{ opacity: 0.6, padding: '12px' }}>{isRTL ? 'لا توجد بيانات مدن.' : 'No city data available.'}</div>
              ) : (
                demandIntel.topCities.map((c, idx) => (
                  <div key={idx} className="intel-item">
                    <span style={{ fontWeight: 'bold' }}>{c.name}</span>
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                      {c.count} {isRTL ? 'طلبات' : 'requests'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Supply Gaps */}
          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-title">🔥 {isRTL ? 'فجوات السوق (منتجات مطلوبة بدون أي عروض تجارية)' : 'Supply Gaps (Requests with 0 bids)'}</div>
            <div className="intel-list">
              {demandIntel.supplyGaps.length === 0 ? (
                <div style={{ opacity: 0.6, padding: '12px', textAlign: 'center' }}>
                  {isRTL ? 'ممتاز! جميع الطلبات الجارية تلقت عروضاً بالفعل.' : 'Excellent! All active requests have received bids.'}
                </div>
              ) : (
                demandIntel.supplyGaps.map((gap, idx) => (
                  <div key={idx} className="intel-item" style={{ borderLeft: '3px solid #ef4444' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{gap.title}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{gap.category}</div>
                    </div>
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.8rem', padding: '6px 12px' }}>
                      {isRTL ? 'فرصة ذهبية: 0 عروض' : 'Golden Opportunity: 0 Bids'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
