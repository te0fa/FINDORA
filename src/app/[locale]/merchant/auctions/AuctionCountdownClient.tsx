'use client'

import React, { useState, useEffect } from 'react'

interface AuctionCountdownClientProps {
  createdAtIso: string
  isRTL: boolean
}

export default function AuctionCountdownClient({
  createdAtIso,
  isRTL
}: AuctionCountdownClientProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState<boolean>(false)

  useEffect(() => {
    const targetTime = new Date(createdAtIso).getTime() + 48 * 3600 * 1000 // 48 Hours

    function updateTimer() {
      const now = Date.now()
      const diff = targetTime - now

      if (diff <= 0) {
        setTimeLeft(isRTL ? 'مزاد مكتمل / منتهي' : 'Auction Finished')
        setIsExpired(true)
        return
      }

      const hours = Math.floor(diff / (3600 * 1000))
      const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000))
      const seconds = Math.floor((diff % (60 * 1000)) / 1000)

      const paddedHours = String(hours).padStart(2, '0')
      const paddedMins = String(minutes).padStart(2, '0')
      const paddedSecs = String(seconds).padStart(2, '0')

      setTimeLeft(
        isRTL 
          ? `متبقي: ${paddedHours} ساعة و ${paddedMins} دقيقة و ${paddedSecs} ثانية` 
          : `Ends in: ${paddedHours}h ${paddedMins}m ${paddedSecs}s`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [createdAtIso, isRTL])

  return (
    <div className={`text-xs font-bold font-mono px-3.5 py-1.5 rounded-xl border flex items-center gap-2 select-none ${
      isExpired 
        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    }`}>
      <span className={isExpired ? '' : 'animate-pulse'}>⏱️</span>
      <span>{timeLeft}</span>
    </div>
  )
}
