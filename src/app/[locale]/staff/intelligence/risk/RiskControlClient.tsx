'use client'

import React, { useState } from 'react'

interface Contributor {
  id: string
  full_name: string
  phone_number: string
  status: string
  trust_score: number
  contributor_wallets: Array<{
    id: string
    balance_egp: number
    points_balance: number
    credit_balance: number
    is_frozen: boolean
  }>
}

interface RiskControlClientProps {
  locale: string
  initialContributors: Contributor[]
}

export default function RiskControlClient({ locale, initialContributors }: RiskControlClientProps) {
  const isAr = locale === 'ar'
  const [contributors, setContributors] = useState<Contributor[]>(initialContributors)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filteredContributors = contributors.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone_number.includes(searchQuery)
  )

  const toggleFreeze = async (contributorId: string, walletId: string, currentStatus: boolean) => {
    setLoadingId(contributorId)
    try {
      const res = await fetch(`/api/staff/risk/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, isFrozen: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed')
      
      setContributors(prev => prev.map(c => {
        if (c.id === contributorId && c.contributor_wallets[0]) {
          return {
            ...c,
            contributor_wallets: [
              { ...c.contributor_wallets[0], is_frozen: !currentStatus }
            ]
          }
        }
        return c
      }))
    } catch (error) {
      alert(isAr ? 'حدث خطأ' : 'Error updating status')
    } finally {
      setLoadingId(null)
    }
  }

  const toggleSuspend = async (contributorId: string, currentStatus: string) => {
    setLoadingId(contributorId)
    const newStatus = currentStatus === 'suspended' ? 'approved' : 'suspended'
    try {
      const res = await fetch(`/api/staff/risk/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributorId, status: newStatus })
      })
      if (!res.ok) throw new Error('Failed')
      
      setContributors(prev => prev.map(c => {
        if (c.id === contributorId) return { ...c, status: newStatus }
        return c
      }))
    } catch (error) {
      alert(isAr ? 'حدث خطأ' : 'Error updating status')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-[hsl(0,84%,60%)]">{isAr ? 'لوحة التحكم والمخاطر 🚨' : 'Risk & Control Panel 🚨'}</h1>
        <p className="mt-1 text-[hsl(220,10%,60%)]">
          {isAr ? 'راقب نشاط المندوبين، وقم بتجميد المحافظ أو تعليق الحسابات عند اكتشاف احتيال.' : 'Monitor contributor activity, freeze wallets, and suspend accounts upon fraud detection.'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <input 
          type="text" 
          placeholder={isAr ? 'بحث بالاسم أو رقم الهاتف...' : 'Search by name or phone...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full max-w-md rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none mb-6"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-sm text-[hsl(220,10%,80%)]">
            <thead className="bg-black/50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">{isAr ? 'المندوب' : 'Contributor'}</th>
                <th className="px-6 py-4">{isAr ? 'المحفظة' : 'Wallet (EGP/Pts/Cr)'}</th>
                <th className="px-6 py-4">{isAr ? 'حالة الحساب' : 'Account Status'}</th>
                <th className="px-6 py-4">{isAr ? 'إجراءات الأمان' : 'Security Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredContributors.map((c) => {
                const wallet = c.contributor_wallets[0]
                const isFrozen = wallet?.is_frozen
                const isSuspended = c.status === 'suspended'
                
                return (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{c.full_name}</p>
                      <p className="text-xs text-slate-400">{c.phone_number}</p>
                      <p className={`text-xs mt-1 font-bold ${c.trust_score < 40 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isAr ? 'نقطة ثقة' : 'Trust Score'}: {c.trust_score}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {wallet ? (
                        <div className="space-y-1">
                          <p className="font-bold text-[hsl(152,69%,51%)]">{wallet.balance_egp} EGP</p>
                          <p className="text-xs text-[hsl(43,96%,56%)]">{wallet.points_balance} Pts</p>
                          <p className="text-xs text-[hsl(258,89%,66%)]">{wallet.credit_balance} Cr</p>
                        </div>
                      ) : (
                        <span className="text-slate-500">No Wallet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${isSuspended ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {isSuspended ? (isAr ? 'موقوف' : 'Suspended') : (isAr ? 'نشط' : 'Active')}
                      </span>
                      {isFrozen && (
                        <span className="ml-2 rtl:mr-2 px-3 py-1 rounded-full text-xs font-bold bg-[hsl(43,96%,56%,0.2)] text-[hsl(43,96%,56%)]">
                          {isAr ? 'محفظة مجمدة' : 'Frozen Wallet'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {wallet && (
                          <button
                            onClick={() => toggleFreeze(c.id, wallet.id, isFrozen)}
                            disabled={loadingId === c.id}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition ${isFrozen ? 'bg-[hsl(43,96%,56%)] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                          >
                            {isFrozen ? (isAr ? 'فك التجميد' : 'Unfreeze Wallet') : (isAr ? 'تجميد المحفظة' : 'Freeze Wallet')}
                          </button>
                        )}
                        <button
                          onClick={() => toggleSuspend(c.id, c.status)}
                          disabled={loadingId === c.id}
                          className={`px-4 py-2 rounded-lg font-bold text-xs transition ${isSuspended ? 'bg-[hsl(0,84%,60%)] text-white hover:bg-red-500' : 'bg-red-500/20 text-red-400 hover:bg-red-500/40'}`}
                        >
                          {isSuspended ? (isAr ? 'إلغاء الإيقاف' : 'Unsuspend') : (isAr ? 'إيقاف الحساب' : 'Suspend Account')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredContributors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    {isAr ? 'لا يوجد مندوبين.' : 'No contributors found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
