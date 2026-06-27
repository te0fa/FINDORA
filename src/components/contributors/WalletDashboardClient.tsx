'use client'

import React, { useState } from 'react'

interface Transaction {
  id: string
  created_at: string
  tx_type: string
  amount_egp: number
  amount_points: number
  metadata: any
}

interface WalletClientProps {
  locale: string
  contributor: {
    id: string
    role: string
    trust_score: number
  }
  wallet: {
    balance_egp: number
    points_balance: number
    lifetime_earned_egp: number
    pending_withdrawal_egp: number
  }
  transactions: Transaction[]
}

export default function WalletDashboardClient({ locale, contributor, wallet, transactions }: WalletClientProps) {
  const isAr = locale === 'ar'
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  // Hybrid Rules
  const canWithdrawCash = contributor.role === 'field_scout' || contributor.role === 'store_insider'
  const isCashLocked = !canWithdrawCash
  const minWithdrawal = 100 // Example
  const hasEnoughCash = wallet.balance_egp >= minWithdrawal
  const trustScoreHighEnough = contributor.trust_score >= 50

  const handleWithdraw = async () => {
    setIsWithdrawing(true)
    setTimeout(() => {
      alert(isAr ? 'تم إرسال طلب السحب بنجاح للمراجعة' : 'Withdrawal request submitted for review')
      setIsWithdrawing(false)
    }, 1500)
  }

  return (
    <div className="space-y-8">
      
      {/* 1. BALANCES (HYBRID) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cash Balance */}
        <div className={`relative overflow-hidden rounded-2xl border ${isCashLocked ? 'border-white/10' : 'border-[hsl(152,69%,51%,0.3)]'} bg-black/20 p-8 shadow-xl backdrop-blur-md`}>
          {isCashLocked && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <span className="mb-2 text-4xl">🔒</span>
              <p className="text-sm font-bold text-white">
                {isAr ? 'الكاش غير متاح لهذا الدور' : 'Cash withdrawal locked for this role'}
              </p>
            </div>
          )}
          <h2 className="mb-2 text-lg font-bold text-white">{isAr ? 'الرصيد النقدي' : 'Cash Balance'}</h2>
          <p className="mb-6 text-4xl font-black text-[hsl(152,69%,51%)]">
            {wallet.balance_egp.toFixed(2)} <span className="text-base text-white/50">{isAr ? 'ج.م' : 'EGP'}</span>
          </p>

          <button 
            onClick={handleWithdraw}
            disabled={isWithdrawing || !hasEnoughCash || !trustScoreHighEnough || isCashLocked}
            className="w-full rounded-lg bg-[hsl(152,69%,51%)] py-3 font-bold text-white hover:bg-[hsl(152,69%,55%)] disabled:opacity-50"
          >
            {isWithdrawing ? '...' : (isAr ? 'سحب الكاش' : 'Withdraw Cash')}
          </button>
          
          {!hasEnoughCash && !isCashLocked && (
            <p className="mt-2 text-center text-xs text-[hsl(220,10%,60%)]">
              {isAr ? `الحد الأدنى للسحب ${minWithdrawal} ج.م` : `Minimum withdrawal ${minWithdrawal} EGP`}
            </p>
          )}
        </div>

        {/* Points Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-[hsl(258,89%,66%,0.3)] bg-black/20 p-8 shadow-xl backdrop-blur-md">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(258,89%,66%)] opacity-10 blur-3xl"></div>
          <h2 className="mb-2 text-lg font-bold text-white">{isAr ? 'رصيد النقاط' : 'Points Balance'}</h2>
          <p className="mb-6 text-4xl font-black text-[hsl(258,89%,66%)]">
            {wallet.points_balance} <span className="text-base text-white/50">{isAr ? 'نقطة' : 'PTS'}</span>
          </p>
          <button 
            className="w-full rounded-lg bg-[hsl(258,89%,66%)] py-3 font-bold text-white hover:bg-[hsl(258,89%,70%)]"
          >
            {isAr ? 'استبدال النقاط' : 'Redeem Points'}
          </button>
          <p className="mt-2 text-center text-xs text-[hsl(220,10%,60%)]">
            {isAr ? 'استخدم النقاط لخصومات ومميزات المنصة' : 'Use points for discounts and premium features'}
          </p>
        </div>
      </div>

      {/* 2. HISTORY */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-bold text-white">{isAr ? 'سجل العمليات' : 'Transaction History'}</h2>
        
        {transactions.length === 0 ? (
          <p className="text-center text-[hsl(220,10%,60%)]">{isAr ? 'لا يوجد عمليات حتى الآن' : 'No transactions yet'}</p>
        ) : (
          <div className="space-y-4">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    tx.amount_egp > 0 ? 'bg-[hsl(152,69%,51%,0.2)] text-[hsl(152,69%,51%)]' :
                    tx.amount_points > 0 ? 'bg-[hsl(258,89%,66%,0.2)] text-[hsl(258,89%,66%)]' :
                    'bg-white/10 text-white'
                  }`}>
                    {tx.amount_egp > 0 ? '💰' : tx.amount_points > 0 ? '🎯' : '💳'}
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {isAr 
                        ? (tx.tx_type === 'task_reward' ? 'مكافأة مهمة' : tx.tx_type === 'withdrawal' ? 'سحب نقدي' : tx.tx_type)
                        : tx.tx_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-[hsl(220,10%,60%)]">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  {tx.amount_egp !== 0 && (
                    <p className={`font-black ${tx.amount_egp > 0 ? 'text-[hsl(152,69%,51%)]' : 'text-white'}`}>
                      {tx.amount_egp > 0 ? '+' : ''}{tx.amount_egp} {isAr ? 'ج.م' : 'EGP'}
                    </p>
                  )}
                  {tx.amount_points !== 0 && (
                    <p className="text-sm font-bold text-[hsl(258,89%,66%)]">
                      {tx.amount_points > 0 ? '+' : ''}{tx.amount_points} {isAr ? 'نقطة' : 'PTS'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
