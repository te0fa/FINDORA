'use client'

import React, { useState } from 'react'

interface Partner {
  id: string
  display_name: string
  points_balance: number
}

interface Transaction {
  id: string
  partner_id: string
  points: number
  action_type: string
  created_at: string
  partner?: {
    id: string
    display_name: string
  } | null
}

interface PointsManagerClientProps {
  locale: string
  initialPartners: Partner[]
  initialTransactions: Transaction[]
  initialInsights?: any[]
}

export default function PointsManagerClient({
  locale,
  initialPartners,
  initialTransactions,
  initialInsights = []
}: PointsManagerClientProps) {
  const isAr = locale === 'ar'
  
  const [activeTab, setActiveTab] = useState<'partners' | 'transactions' | 'insights'>('partners')
  const [partners, setPartners] = useState<Partner[]>(initialPartners)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [insights, setInsights] = useState<any[]>(initialInsights)
  
  const handleInsightAction = async (insightId: string, status: 'approved_as_offer' | 'rejected') => {
    try {
      const res = await fetch('/api/staff/insights/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, status })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setInsights(prev => prev.filter(i => i.id !== insightId))
        alert(isAr ? 'تم تحديث حالة العرض ومكافأة صياد العروض بـ 25 نقطة!' : 'Insight updated and hunter rewarded 25 points successfully!')
      } else {
        alert(data.error || (isAr ? 'فشلت العملية' : 'Action failed'))
      }
    } catch (err) {
      alert(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    }
  }

  // Form states
  const [selectedPartnerId, setSelectedPartnerId] = useState(partners[0]?.id || '')
  const [pointsChange, setPointsChange] = useState('50')
  const [actionType, setActionType] = useState('valid_bid_placed')
  const [formSuccess, setFormSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle Manual adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPartnerId || !pointsChange) return

    setIsSubmitting(true)
    setFormSuccess('')

    const points = Number(pointsChange)

    try {
      const res = await fetch('/api/staff/points/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: selectedPartnerId,
          points,
          actionType
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setFormSuccess(isAr ? 'تم تعديل نقاط الشريك وتسجيل الحركة بنجاح!' : 'Partner points adjusted successfully!')
        
        // Update local state to avoid refresh
        setPartners(prev => prev.map(p => {
          if (p.id === selectedPartnerId) {
            return { ...p, points_balance: p.points_balance + points }
          }
          return p
        }))

        const selectedPartnerObj = partners.find(p => p.id === selectedPartnerId)

        const newTx: Transaction = {
          id: Math.random().toString(),
          partner_id: selectedPartnerId,
          points,
          action_type: actionType,
          created_at: new Date().toISOString(),
          partner: selectedPartnerObj ? { id: selectedPartnerObj.id, display_name: selectedPartnerObj.display_name } : null
        }
        setTransactions(prev => [newTx, ...prev])
        setPointsChange('50')
      } else {
        alert(data.error || (isAr ? 'فشلت العملية' : 'Adjustment failed'))
      }
    } catch (err) {
      alert(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      valid_bid_placed: isAr ? 'تقديم عرض صحيح' : 'Valid Bid Placed',
      lead_confirmed: isAr ? 'تأكيد العميل المحتمل' : 'Lead Confirmed',
      sale_completed: isAr ? 'إتمام البيع والتأكيد' : 'Sale Completed',
      payout: isAr ? 'تسوية مالية وكاش' : 'Cash Payout / Redemption'
    }
    return labels[type] || type.replace(/_/g, ' ')
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('partners')}
          className={`px-6 py-3 rounded-xl font-bold transition duration-200 cursor-pointer ${activeTab === 'partners' ? 'bg-[hsl(258,89%,66%)] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          {isAr ? 'قائمة الشركاء (Partners)' : 'Partners & Scouts'}
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-3 rounded-xl font-bold transition duration-200 cursor-pointer ${activeTab === 'transactions' ? 'bg-[hsl(43,96%,56%)] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          {isAr ? 'سجل حركات النقاط (Audit Ledger)' : 'Audit Ledger'}
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={`px-6 py-3 rounded-xl font-bold transition duration-200 cursor-pointer ${activeTab === 'insights' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          {isAr ? 'اكتشافات صائدي العروض' : 'Deal Hunter Submissions'}
        </button>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Content block (based on active tab) */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'partners' && (
            <div className="grid gap-4">
              {partners.length === 0 ? (
                <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10 text-[hsl(220,10%,60%)]">
                  {isAr ? 'لا يوجد شركاء مسجلين حالياً.' : 'No registered partners found.'}
                </div>
              ) : (
                partners.map(p => (
                  <div key={p.id} className="bg-black/40 border border-white/10 rounded-2xl p-5 flex justify-between items-center backdrop-blur-xl hover:border-white/20 transition duration-200">
                    <div>
                      <h3 className="text-lg font-bold text-white">{p.display_name}</h3>
                      <p className="text-xs text-[hsl(220,10%,50%)] mt-1 font-mono">ID: {p.id}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[hsl(220,10%,60%)] font-bold block mb-1">{isAr ? 'النقاط المتراكمة' : 'Point Balance'}</span>
                      <span className="text-2xl font-black text-[hsl(43,96%,56%)]">{p.points_balance} <span className="text-xs">VIP</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4 text-right">{isAr ? 'الشريك' : 'Partner'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحدث' : 'Event'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'النقاط' : 'Points'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-white/40">
                        {isAr ? 'لا توجد حركات نقاط مسجلة.' : 'No transaction logs found.'}
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => {
                      const isEarn = tx.points > 0
                      return (
                        <tr key={tx.id} className="hover:bg-white/5 transition">
                          <td className="py-4 px-4 text-right font-bold text-white">
                            {tx.partner?.display_name || (isAr ? 'شريك مجهول' : 'Unknown Partner')}
                          </td>
                          <td className="py-4 px-4 text-center text-white/70">
                            {getActionLabel(tx.action_type)}
                          </td>
                          <td className="py-4 px-4 text-center text-white/40 font-mono">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                          <td className={`py-4 px-4 text-center font-black text-sm ${
                            isEarn ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isEarn ? '+' : ''}{tx.points}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4 text-right">{isAr ? 'اسم المنتج' : 'Product Name'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'السعر' : 'Price'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المتجر' : 'Store'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المساهم' : 'Contributor'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'رابط الإثبات' : 'Proof Link'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {insights.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-white/40">
                        {isAr ? 'لا توجد عروض معلقة للمراجعة.' : 'No pending submissions found.'}
                      </td>
                    </tr>
                  ) : (
                    insights.map((insight: any) => {
                      const proofUrl = insight.location_data?.proof_url || '#'
                      return (
                        <tr key={insight.id} className="hover:bg-white/5 transition">
                          <td className="py-4 px-4 text-right font-bold text-white">
                            {insight.product_name}
                          </td>
                          <td className="py-4 px-4 text-center text-white/70 font-mono">
                            {insight.discovered_price} EGP
                          </td>
                          <td className="py-4 px-4 text-center text-white/70">
                            {insight.store_name}
                          </td>
                          <td className="py-4 px-4 text-center text-white/40">
                            {insight.contributor?.full_name || (isAr ? 'مساهم' : 'Contributor')}
                          </td>
                          <td className="py-4 px-4 text-center font-mono">
                            {proofUrl !== '#' ? (
                              <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-[hsl(43,96%,56%)] hover:underline">
                                {isAr ? 'رابط' : 'Link'}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <button 
                                onClick={() => handleInsightAction(insight.id, 'approved_as_offer')}
                                className="px-2 py-1 bg-green-500 text-black font-bold rounded text-[10px] hover:bg-green-400 cursor-pointer"
                              >
                                {isAr ? 'موافقة (+25)' : 'Approve (+25)'}
                              </button>
                              <button 
                                onClick={() => handleInsightAction(insight.id, 'rejected')}
                                className="px-2 py-1 bg-red-500 text-white font-bold rounded text-[10px] hover:bg-red-400 cursor-pointer"
                              >
                                {isAr ? 'رفض' : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar: Adjust points form (Admin controls) */}
        <div className="lg:col-span-1 bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl h-fit">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>⚙️</span>
            <span>{isAr ? 'تعديل يدوي للرصيد' : 'Manual Point Adjust'}</span>
          </h2>
          
          <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[hsl(220,10%,60%)] mb-1">{isAr ? 'اختر الشريك' : 'Select Partner'}</label>
              <select 
                value={selectedPartnerId}
                onChange={e => setSelectedPartnerId(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
              >
                {partners.map(p => <option key={p.id} value={p.id} className="bg-black">{p.display_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[hsl(220,10%,60%)] mb-1">
                {isAr ? 'عدد النقاط (سالب للخصم/الكاش)' : 'Points Change (Negative to deduct)'}
              </label>
              <input 
                type="number"
                value={pointsChange}
                onChange={e => setPointsChange(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
                placeholder="50"
              />
            </div>

            <div>
              <label className="block text-xs text-[hsl(220,10%,60%)] mb-1">{isAr ? 'نوع الحركة' : 'Action Type'}</label>
              <select 
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
              >
                <option value="valid_bid_placed" className="bg-black">{isAr ? 'تقديم عرض صحيح' : 'Valid Bid Placed'}</option>
                <option value="lead_confirmed" className="bg-black">{isAr ? 'تأكيد العميل المحتمل' : 'Lead Confirmed'}</option>
                <option value="sale_completed" className="bg-black">{isAr ? 'إتمام البيع والتأكيد' : 'Sale Completed'}</option>
                <option value="payout" className="bg-black">{isAr ? 'تسوية مالية وكاش' : 'Cash Payout'}</option>
              </select>
            </div>

            {formSuccess && (
              <div className="text-xs text-green-400 font-medium bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-right">
                {formSuccess}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting || !selectedPartnerId}
              className="w-full py-3 bg-[hsl(258,89%,66%)] text-white font-extrabold rounded-lg hover:bg-[hsl(258,89%,76%)] transition duration-200 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (isAr ? 'جاري التعديل...' : 'Adjusting...') : (isAr ? 'تحديث رصيد الشريك' : 'Update Balance')}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
