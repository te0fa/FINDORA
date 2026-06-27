'use client'

import React, { useState } from 'react'
import { approveWithdrawal, adjustWalletBalance } from '@/lib/staff/finance'
import { useRouter } from 'next/navigation'

export default function ScoutsWalletsClient({ 
  wallets, 
  pendingWithdrawals, 
  staffId,
  isRTL 
}: { 
  wallets: any[], 
  pendingWithdrawals: any[],
  staffId: string,
  isRTL: boolean 
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = useState('')

  // State for manual balance adjustment form
  const [activeAdjustmentWalletId, setActiveAdjustmentWalletId] = useState<string | null>(null)
  const [adjustEgp, setAdjustEgp] = useState<number>(0)
  const [adjustPoints, setAdjustPoints] = useState<number>(0)
  const [adjustType, setAdjustType] = useState<'manual_adjustment' | 'fraud_clawback'>('manual_adjustment')
  const [adjustDescEn, setAdjustDescEn] = useState('')
  const [adjustDescAr, setAdjustDescAr] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)

  const handleApprove = async (withdrawalId: string) => {
    const url = receiptUrls[withdrawalId]
    if (!url || url.trim() === '') {
      setErrorMsg(isRTL ? 'يجب إدخال رابط صورة التحويل/الإيصال' : 'A receipt URL is required to approve.')
      return
    }

    setLoadingId(withdrawalId)
    setErrorMsg('')

    try {
      const res = await approveWithdrawal(withdrawalId, url, staffId)
      if (res.success) {
        setReceiptUrls(prev => {
          const next = { ...prev }
          delete next[withdrawalId]
          return next
        })
        router.refresh()
      } else {
        setErrorMsg(res.error || 'Failed to approve withdrawal')
      }
    } catch (e) {
      setErrorMsg('An unexpected error occurred.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleAdjust = async (walletId: string) => {
    if (adjustEgp === 0 && adjustPoints === 0) {
      setErrorMsg(isRTL ? 'يجب إدخال قيمة لتعديل النقاط أو الرصيد المالي.' : 'Please enter a non-zero value for EGP or points adjustment.')
      return
    }
    if (!adjustDescEn.trim() || !adjustDescAr.trim()) {
      setErrorMsg(isRTL ? 'يجب إدخال سبب التعديل باللغتين العربية والإنجليزية.' : 'A reason description in both English and Arabic is required.')
      return
    }

    setAdjustLoading(true)
    setErrorMsg('')

    try {
      const res = await adjustWalletBalance(
        walletId,
        adjustEgp,
        adjustPoints,
        adjustType,
        adjustDescEn,
        adjustDescAr,
        staffId
      )
      if (res.success) {
        setActiveAdjustmentWalletId(null)
        router.refresh()
      } else {
        setErrorMsg(res.error || 'Failed to adjust wallet balance.')
      }
    } catch (e) {
      setErrorMsg('An unexpected error occurred.')
    } finally {
      setAdjustLoading(false)
    }
  }

  return (
    <div className="space-y-12">
      {errorMsg && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {errorMsg}
        </div>
      )}

      {/* PENDING WITHDRAWALS SECTION */}
      <section className="rounded-2xl border border-amber-500/20 bg-[hsl(220,20%,12%)] shadow-2xl overflow-hidden">
        <div className="border-b border-amber-500/10 bg-amber-500/5 p-6">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            {isRTL ? 'طلبات سحب معلقة' : 'Pending Withdrawals'}
          </h2>
          <p className="mt-1 text-sm text-[hsl(220,10%,60%)]">
            {isRTL 
              ? 'قم بمراجعة طلبات السحب، قم بتحويل المبلغ، ثم أرفق رابط صورة التحويل لتأكيد الدفع.'
              : 'Review withdrawal requests, transfer the funds, then attach the receipt URL to mark as paid.'}
          </p>
        </div>
        <div className="p-6 overflow-x-auto">
          {pendingWithdrawals.length === 0 ? (
            <div className="text-center py-8 text-[hsl(220,10%,50%)]">
              {isRTL ? 'لا توجد طلبات معلقة حالياً.' : 'No pending withdrawals at the moment.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5 text-[hsl(220,10%,50%)] text-sm">
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المندوب' : 'Scout ID'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'طريقة الدفع' : 'Method'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التفاصيل' : 'Details'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المبلغ' : 'Amount'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'صورة الإيصال (رابط)' : 'Receipt URL'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pendingWithdrawals.map(req => (
                  <tr key={req.id} className="hover:bg-white/5 transition">
                    <td className="py-4">
                      <div className="font-mono text-xs text-white/70">{req.contributor_id.slice(0, 8)}...</div>
                      <div className="text-xs text-[hsl(220,10%,50%)]">{req.contributors?.role}</div>
                    </td>
                    <td className="py-4 text-sm">
                      <span className="inline-block rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                        {req.payment_method}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-[hsl(220,10%,70%)]">
                      {req.payment_method === 'instapay' && (req.payment_details as any)?.instapay_address}
                      {req.payment_method === 'vodafone_cash' && (req.payment_details as any)?.wallet_number}
                    </td>
                    <td className="py-4 font-bold text-emerald-400">
                      EGP {req.amount_egp}
                    </td>
                    <td className="py-4 pr-4">
                      <input 
                        type="url" 
                        placeholder="https://..."
                        className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                        value={receiptUrls[req.id] || ''}
                        onChange={e => setReceiptUrls({ ...receiptUrls, [req.id]: e.target.value })}
                        disabled={loadingId === req.id}
                      />
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={loadingId === req.id}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
                      >
                        {loadingId === req.id 
                          ? '...' 
                          : isRTL ? 'تم الدفع ✔' : 'Mark Paid ✔'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ALL WALLETS SECTION */}
      <section className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] shadow-2xl overflow-hidden">
        <div className="border-b border-white/5 bg-black/20 p-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="text-2xl">💰</span>
            {isRTL ? 'قاعدة محافظ المناديب والمساهمين' : 'Scouts Wallets Database'}
          </h2>
          <p className="mt-1 text-sm text-[hsl(220,10%,60%)]">
            {isRTL 
              ? 'جميع أرصدة المناديب النشطة والمعلقة.'
              : 'All active and pending scout balances.'}
          </p>
        </div>
        <div className="p-6 overflow-x-auto">
          {wallets.length === 0 ? (
            <div className="text-center py-8 text-[hsl(220,10%,50%)]">
              {isRTL ? 'لا توجد محافظ مسجلة حتى الآن.' : 'No wallets registered yet.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5 text-[hsl(220,10%,50%)] text-sm">
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>ID</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الرصيد المتاح' : 'Available EGP'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رصيد النقاط' : 'Points'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'أرباح معلقة للسحب' : 'Pending EGP'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'إجمالي الأرباح' : 'Lifetime EGP'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'تقييم الأداء' : 'Performance'}</th>
                  <th className={`pb-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'إجراءات إدارية' : 'Admin Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {wallets.map(w => {
                  const isAdjusting = activeAdjustmentWalletId === w.id
                  const trust = w.contributors?.trust_score ?? 50
                  const health = w.contributors?.network_health_score ?? 100
                  const multiplier = w.contributors?.earning_multiplier ?? 1.0

                  return (
                    <React.Fragment key={w.id}>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-4">
                          <div className="font-mono text-xs text-white/70">{w.contributor_id.slice(0, 8)}...</div>
                          <div className="text-xs text-[hsl(220,10%,50%)]">{w.contributors?.role}</div>
                        </td>
                        <td className="py-4 font-bold text-emerald-400">EGP {w.balance_egp}</td>
                        <td className="py-4 font-bold text-purple-400">{w.points_balance} pts</td>
                        <td className="py-4 font-semibold text-amber-500">EGP {w.pending_withdrawal_egp}</td>
                        <td className="py-4 text-[hsl(220,10%,60%)]">EGP {w.lifetime_earned_egp}</td>
                        <td className="py-4 text-xs">
                          <div className="flex flex-col gap-1">
                            <span>
                              {isRTL ? 'الثقة:' : 'Trust:'} <strong className="text-amber-400">{trust}%</strong>
                            </span>
                            <span>
                              {isRTL ? 'الصحة:' : 'Health:'} <strong className="text-blue-400">{health}%</strong>
                            </span>
                            <span>
                              {isRTL ? 'المضاعف:' : 'Multiplier:'} <strong className="text-purple-400">{multiplier}x</strong>
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => {
                              if (isAdjusting) {
                                setActiveAdjustmentWalletId(null)
                              } else {
                                setActiveAdjustmentWalletId(w.id)
                                setAdjustEgp(0)
                                setAdjustPoints(0)
                                setAdjustType('manual_adjustment')
                                setAdjustDescEn('')
                                setAdjustDescAr('')
                              }
                            }}
                            className="rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                          >
                            {isAdjusting 
                              ? (isRTL ? 'إلغاء' : 'Cancel') 
                              : (isRTL ? 'تعديل الرصيد' : 'Adjust Balance')}
                          </button>
                        </td>
                      </tr>

                      {isAdjusting && (
                        <tr>
                          <td colSpan={7} className="bg-black/40 p-4 border-t border-b border-white/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                              <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                  <span>⚙️</span> {isRTL ? 'تعديل يدوي للرصيد والنقاط' : 'Manual Balance & Points Adjustment'}
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">{isRTL ? 'تعديل الجنيه (EGP)' : 'EGP Adjustment'}</label>
                                    <input 
                                      type="number" 
                                      placeholder="e.g. 100 or -50"
                                      className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                                      value={adjustEgp || ''}
                                      onChange={e => setAdjustEgp(parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">{isRTL ? 'تعديل النقاط' : 'Points Adjustment'}</label>
                                    <input 
                                      type="number" 
                                      placeholder="e.g. 500 or -100"
                                      className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                                      value={adjustPoints || ''}
                                      onChange={e => setAdjustPoints(parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">{isRTL ? 'نوع المعاملة' : 'Transaction Type'}</label>
                                  <select
                                    className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                                    value={adjustType}
                                    onChange={e => setAdjustType(e.target.value as any)}
                                  >
                                    <option value="manual_adjustment">{isRTL ? 'تعديل إداري يدوي' : 'Manual Admin Adjustment'}</option>
                                    <option value="fraud_clawback">{isRTL ? 'استرداد احتيال (Clawback)' : 'Fraud Clawback'}</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-3 flex flex-col justify-between">
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">{isRTL ? 'السبب (إنجليزي)' : 'Reason (English)'}</label>
                                  <input 
                                    type="text" 
                                    placeholder="Reason for change"
                                    className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-sm text-white focus:border-amber-500 focus:outline-none mb-2"
                                    value={adjustDescEn}
                                    onChange={e => setAdjustDescEn(e.target.value)}
                                  />
                                  <label className="block text-xs text-slate-400 mb-1">{isRTL ? 'السبب (عربي)' : 'Reason (Arabic)'}</label>
                                  <input 
                                    type="text" 
                                    placeholder="سبب التعديل"
                                    className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                                    value={adjustDescAr}
                                    onChange={e => setAdjustDescAr(e.target.value)}
                                  />
                                </div>
                                <div className="text-right">
                                  <button
                                    onClick={() => handleAdjust(w.id)}
                                    disabled={adjustLoading}
                                    className="w-full md:w-auto rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                                  >
                                    {adjustLoading ? '...' : (isRTL ? 'تطبيق التعديل' : 'Apply Adjustment')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

