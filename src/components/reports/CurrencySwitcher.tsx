'use client'

import { useState, useEffect } from 'react'

export const EXCHANGE_RATES: Record<string, number> = {
  EGP: 1.0,
  USD: 0.021, // 1 EGP = 0.021 USD (approx 47.6 EGP per USD)
  SAR: 0.079, // 1 EGP = 0.079 SAR (approx 12.7 EGP per SAR)
  AED: 0.077, // 1 EGP = 0.077 AED (approx 13.0 EGP per AED)
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EGP: 'EGP',
  USD: '$',
  SAR: 'SAR',
  AED: 'AED',
}

export default function CurrencySwitcher({ isRTL }: { isRTL: boolean }) {
  const [currency, setCurrency] = useState('EGP')

  useEffect(() => {
    const saved = localStorage.getItem('findora_currency') || 'EGP'
    setCurrency(saved)
  }, [])

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency)
    localStorage.setItem('findora_currency', newCurrency)
    window.dispatchEvent(new CustomEvent('findora_currency_changed', { detail: newCurrency }))
  }

  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-xl">
      {Object.keys(EXCHANGE_RATES).map((cur) => (
        <button
          key={cur}
          onClick={() => handleCurrencyChange(cur)}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none ${
            currency === cur
              ? 'bg-accent text-black shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          style={{ width: 'auto', margin: 0 }}
        >
          {cur}
        </button>
      ))}
    </div>
  )
}
