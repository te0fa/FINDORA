'use client'

import { useState, useEffect } from 'react'
import { EXCHANGE_RATES, CURRENCY_SYMBOLS } from './CurrencySwitcher'

interface ConvertedPriceProps {
  amountInEgp: number
  className?: string
}

export default function ConvertedPrice({ amountInEgp, className = '' }: ConvertedPriceProps) {
  const [currency, setCurrency] = useState('EGP')

  useEffect(() => {
    const saved = localStorage.getItem('findora_currency') || 'EGP'
    setCurrency(saved)

    const handleChanged = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      setCurrency(customEvent.detail)
    }

    window.addEventListener('findora_currency_changed', handleChanged)
    return () => window.removeEventListener('findora_currency_changed', handleChanged)
  }, [])

  const rate = EXCHANGE_RATES[currency] || 1.0
  const converted = amountInEgp * rate
  const symbol = CURRENCY_SYMBOLS[currency] || currency

  // Format nicely (e.g. integer or 2 decimal places if USD)
  const formatted = currency === 'EGP' 
    ? converted.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <span className={className}>
      {formatted} {symbol}
    </span>
  )
}
