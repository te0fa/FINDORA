'use client'

import React, { useState } from 'react'

export default function FraudReviewClient({ 
  locale, 
  openAlerts, 
  frozenAccounts, 
  delayedTransactions 
}: { 
  locale: string
  openAlerts: any[]
  frozenAccounts: any[]
  delayedTransactions: any[]
}) {
  const isAr = locale === 'ar'
  const [processing, setProcessing] = useState<string | null>(null)

  const handleAlertAction = async (alertId: string, action: 'resolve' | 'ignore') => {
    setProcessing(alertId)
    // Simulate API call to resolve alert
    setTimeout(() => {
      alert(isAr ? 'تم تحديث حالة التنبيه' : 'Alert updated successfully')
      setProcessing(null)
    }, 1000)
  }

  const handleTransactionAction = async (txId: string, action: 'approve' | 'reject') => {
    setProcessing(txId)
    // Simulate API call to process delayed transaction
    setTimeout(() => {
      alert(isAr ? `تم ${action === 'approve' ? 'الموافقة على' : 'رفض'} العملية` : `Transaction ${action}d successfully`)
      setProcessing(null)
    }, 1000)
  }

  const handleAccountAction = async (accountId: string, action: 'unfreeze' | 'suspend') => {
    setProcessing(accountId)
    // Simulate API call to unfreeze/suspend
    setTimeout(() => {
      alert(isAr ? `تم تحديث حالة الحساب` : `Account status updated`)
      setProcessing(null)
    }, 1000)
  }

  return (
    <div className="space-y-12">
      
      {/* 1. AI Alerts */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">
          {isAr ? 'تنبيهات محرك الذكاء الاصطناعي (AI Alerts)' : 'AI Engine Alerts'}
        </h2>
        {openAlerts.length === 0 ? (
          <div className="p-8 text-center text-[hsl(220,10%,60%)] border border-white/5 rounded-xl bg-black/20">
            ✅ {isAr ? 'لا توجد تنبيهات أمنية مفتوحة' : 'No open security alerts'}
          </div>
        ) : (
          <div className="grid gap-4">
            {openAlerts.map(alert => (
              <div key={alert.id} className={`p-5 rounded-xl border ${alert.alert_level === 'critical' ? 'border-[hsl(0,84%,60%,0.5)] bg-[hsl(0,84%,60%,0.05)]' : 'border-[hsl(43,96%,56%,0.5)] bg-[hsl(43,96%,56%,0.05)]'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${alert.alert_level === 'critical' ? 'bg-[hsl(0,84%,60%)] text-white' : 'bg-[hsl(43,96%,56%)] text-black'}`}>
                      {alert.alert_level}
                    </span>
                    <span className="text-sm font-mono text-[hsl(220,10%,60%)]">{alert.alert_type}</span>
                  </div>
                  <p className="text-white font-bold">{alert.description}</p>
                  <p className="text-sm text-[hsl(220,10%,60%)] mt-1">User: {alert.contributors?.full_name} | Score: {alert.contributors?.trust_score}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAlertAction(alert.id, 'resolve')} disabled={!!processing} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-lg transition">Resolve</button>
                  <button onClick={() => handleAlertAction(alert.id, 'ignore')} disabled={!!processing} className="px-4 py-2 text-[hsl(220,10%,60%)] hover:text-white text-sm font-bold rounded-lg transition">Ignore</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Delay Buffer (Pending Review) */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">
          {isAr ? 'العمليات المعلقة للمراجعة (Delay Buffer)' : 'Transactions Pending Review (Delay Buffer)'}
        </h2>
        {delayedTransactions.length === 0 ? (
          <div className="p-8 text-center text-[hsl(220,10%,60%)] border border-white/5 rounded-xl bg-black/20">
            ✅ {isAr ? 'لا توجد عمليات معلقة' : 'No transactions in delay buffer'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {delayedTransactions.map(tx => (
              <div key={tx.id} className="p-5 rounded-xl border border-[hsl(258,89%,66%,0.3)] bg-black/40 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-[hsl(258,89%,66%)] mb-1 font-mono uppercase">{tx.tx_type}</div>
                  <div className="text-2xl font-bold text-white">{tx.amount_egp} EGP</div>
                  <div className="text-sm text-[hsl(220,10%,60%)] mt-2">User: {tx.contributors?.full_name}</div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                  <button onClick={() => handleTransactionAction(tx.id, 'approve')} disabled={!!processing} className="flex-1 py-2 bg-[hsl(152,69%,51%,0.2)] text-[hsl(152,69%,51%)] hover:bg-[hsl(152,69%,51%,0.3)] text-sm font-bold rounded-lg transition border border-[hsl(152,69%,51%)]">Approve</button>
                  <button onClick={() => handleTransactionAction(tx.id, 'reject')} disabled={!!processing} className="flex-1 py-2 bg-[hsl(0,84%,60%,0.2)] text-[hsl(0,84%,60%)] hover:bg-[hsl(0,84%,60%,0.3)] text-sm font-bold rounded-lg transition border border-[hsl(0,84%,60%)]">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Frozen Accounts */}
      <section>
        <h2 className="text-xl font-bold text-[hsl(0,84%,60%)] mb-4 border-b border-white/10 pb-2">
          {isAr ? 'الحسابات المجمدة أمنياً (Frozen Accounts)' : 'Security Frozen Accounts'}
        </h2>
        {frozenAccounts.length === 0 ? (
          <div className="p-8 text-center text-[hsl(220,10%,60%)] border border-white/5 rounded-xl bg-black/20">
            ✅ {isAr ? 'لا توجد حسابات مجمدة' : 'No frozen accounts'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm text-[hsl(220,10%,80%)]">
              <thead className="bg-black/60 text-xs uppercase text-[hsl(220,10%,60%)]">
                <tr>
                  <th className="px-4 py-3">Contributor</th>
                  <th className="px-4 py-3">Trust Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last IP</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-black/20 divide-y divide-white/5">
                {frozenAccounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-white/5">
                    <td className="px-4 py-4 font-bold text-white">{acc.full_name}</td>
                    <td className="px-4 py-4"><span className="text-[hsl(0,84%,60%)]">{acc.trust_score}</span></td>
                    <td className="px-4 py-4"><span className="px-2 py-1 bg-[hsl(0,84%,60%,0.1)] text-[hsl(0,84%,60%)] rounded uppercase text-xs">{acc.status}</span></td>
                    <td className="px-4 py-4 font-mono text-xs">{acc.last_ip_address || 'Unknown'}</td>
                    <td className="px-4 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleAccountAction(acc.id, 'unfreeze')} className="px-3 py-1 bg-[hsl(152,69%,51%,0.2)] text-[hsl(152,69%,51%)] hover:bg-[hsl(152,69%,51%,0.3)] rounded text-xs font-bold border border-[hsl(152,69%,51%,0.5)]">Unfreeze</button>
                      <button onClick={() => handleAccountAction(acc.id, 'suspend')} className="px-3 py-1 bg-white/5 text-white hover:bg-white/10 rounded text-xs font-bold">Ban</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
