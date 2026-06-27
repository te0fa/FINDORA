'use client'

import React from 'react'

interface NetworkHealthCardProps {
  locale: string
  activeReferrals: number
  totalReferrals: number
  healthScore: number // 0.0 to 1.0
  decayMultiplier: number
}

export default function NetworkHealthCard({ locale, activeReferrals, totalReferrals, healthScore, decayMultiplier }: NetworkHealthCardProps) {
  const isAr = locale === 'ar'
  const percentage = Math.round(healthScore * 100)
  
  // Determine color based on health
  let color = 'text-[hsl(152,69%,51%)]' // Green
  let bgGlow = 'shadow-[0_0_20px_hsl(152,69%,51%,0.2)]'
  let stroke = 'hsl(152,69%,51%)'
  
  if (decayMultiplier < 0.6) {
    color = 'text-[hsl(0,84%,60%)]' // Red
    bgGlow = 'shadow-[0_0_20px_hsl(0,84%,60%,0.2)]'
    stroke = 'hsl(0,84%,60%)'
  } else if (decayMultiplier < 1.0) {
    color = 'text-[hsl(43,96%,56%)]' // Yellow
    bgGlow = 'shadow-[0_0_20px_hsl(43,96%,56%,0.2)]'
    stroke = 'hsl(43,96%,56%)'
  }

  // SVG Circle calculation
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (healthScore * circumference)

  return (
    <div className={`rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 flex items-center justify-between transition-shadow ${bgGlow}`}>
      <div>
        <h2 className="text-lg font-bold text-white mb-1">
          {isAr ? 'صحة الشبكة (Active Network)' : 'Network Health'}
        </h2>
        <p className="text-sm text-[hsl(220,10%,60%)] mb-4">
          {isAr 
            ? 'حافظ على نشاط شبكتك لتتجنب انخفاض أرباحك السلبية.' 
            : 'Keep your network active to prevent your passive income from decaying.'}
        </p>
        
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-slate-400">{isAr ? 'مندوبين نشطين' : 'Active Scouts'}</p>
            <p className="text-xl font-bold text-white">{activeReferrals} <span className="text-xs text-slate-500">/ {totalReferrals}</span></p>
          </div>
          <div className="w-px bg-white/10"></div>
          <div>
            <p className="text-xs text-slate-400">{isAr ? 'معامل الأرباح السلبية' : 'Passive Multiplier'}</p>
            <p className={`text-xl font-bold ${color}`}>{decayMultiplier}x</p>
          </div>
        </div>
      </div>

      <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/5"
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke={stroke}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`text-2xl font-black ${color}`}>{percentage}%</span>
        </div>
      </div>
    </div>
  )
}
