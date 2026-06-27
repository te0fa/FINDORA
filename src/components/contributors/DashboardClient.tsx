'use client'

import React from 'react'
import Link from 'next/link'
import LevelProgressCard from './LevelProgressCard'
import StreakTracker from './StreakTracker'
import BadgeDisplay from './BadgeDisplay'
import NetworkHealthCard from './NetworkHealthCard'
import SmartAlertsFeed from './SmartAlertsFeed'
import MissionControl from './MissionControl'
import ViralActivityFeed from './ViralActivityFeed'
import SubmitMarketInsight from './SubmitMarketInsight'

interface DashboardClientProps {
  locale: string
  contributor: {
    full_name: string
    role: string
    referral_code: string
    active_referrals: number
    total_referrals: number
    decay_multiplier: number
    network_health_score: number
    trust_score: number
  }
  levelData: any
  nextLevelData: any
  streaks: any
  badges: any[]
  wallet: { lifetime_earned_egp: number, balance_egp: number, points_balance: number }
  networkEarnings: number
  notifications: any[]
}

export default function DashboardClient({ locale, contributor, levelData, nextLevelData, streaks, badges, wallet, networkEarnings, notifications }: DashboardClientProps) {
  const isAr = locale === 'ar'
  
  const referralsNeeded = nextLevelData 
    ? Math.max(0, nextLevelData.required_active_referrals - contributor.active_referrals) 
    : 0

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/${locale}/contributors/apply?ref=${contributor.referral_code}` : ''
  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink)
    alert(isAr ? 'تم نسخ الرابط! شاركه الآن.' : 'Link copied! Share it now.')
  }

  return (
    <div className="space-y-8">
      {/* 1. Header & Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            {isAr ? 'مرحباً،' : 'Welcome,'} <span className="text-[hsl(258,89%,66%)]">{contributor.full_name}</span>
          </h1>
          <p className="mt-1 text-[hsl(220,10%,60%)]">
            {isAr ? 'لوحة التحكم الخاصة بك.' : 'Your contributor dashboard.'}
          </p>
        </div>
        <div className="flex gap-4">
          <Link 
            href={`/${locale}/contributors/wallet`}
            className="rounded-lg bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
          >
            {isAr ? 'المحفظة' : 'Wallet'}
          </Link>
          <Link 
            href={`/${locale}/contributors/submit`}
            className="rounded-lg bg-[hsl(258,89%,66%)] px-6 py-3 font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition hover:bg-[hsl(258,89%,70%)]"
          >
            {isAr ? 'رفع داتا السوق' : 'Submit Data'}
          </Link>
        </div>
      </div>

      {/* 1.5 Viral Feed (FOMO Builder) */}
      <ViralActivityFeed locale={locale} />

      {/* 2.5 Mission Control (Game Loop Engine) */}
      <MissionControl locale={locale} />

      {/* 2.7 Proactive Supply Loop */}
      <SubmitMarketInsight locale={locale} />

      {/* 2. Team Management Console */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-[hsl(258,89%,66%,0.2)] to-black border border-[hsl(258,89%,66%,0.3)] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(258,89%,66%)] opacity-20 blur-3xl"></div>
          <h2 className="mb-2 text-xl font-bold text-white">{isAr ? 'وحدة إدارة الفريق 👑' : 'Team Management Console 👑'}</h2>
          <p className="mb-6 text-sm text-[hsl(220,10%,70%)]">
            {isAr ? 'شارك رابطك لبناء فريقك. قم بإدارة شبكتك لزيادة العمولات وفتح خصائص الإدارة (Passive Income).' : 'Share your link to build your team. Manage your network to multiply commissions and unlock Passive Income.'}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input 
              type="text" 
              readOnly 
              value={referralLink} 
              className="flex-1 rounded-lg bg-black/50 px-4 py-2 text-sm text-[hsl(258,89%,66%)] font-mono border border-white/10 outline-none"
            />
            <button 
              onClick={copyReferral}
              className="rounded-lg bg-[hsl(258,89%,66%)] px-6 py-2 text-sm font-bold text-white transition hover:bg-[hsl(258,89%,70%)] whitespace-nowrap"
            >
              {isAr ? 'نسخ الرابط' : 'Copy Link'}
            </button>
          </div>
          
          <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{isAr ? 'أرباح المهام' : 'Task Earnings'}</p>
              <p className="text-lg font-bold text-white">{wallet.lifetime_earned_egp - networkEarnings} {isAr ? 'جنيه' : 'EGP'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{isAr ? 'أرباح الشبكة (L2)' : 'Network Earnings (L2)'}</p>
              <p className="text-lg font-bold text-[hsl(152,69%,51%)]">+{networkEarnings} {isAr ? 'جنيه' : 'EGP'}</p>
            </div>
          </div>
        </div>

        {/* Management Progression Ladder */}
        <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="mb-2 text-lg font-bold text-white">🎯 {isAr ? 'سلم ترقيات الإدارة' : 'Management Progression'}</h2>
            <p className="text-sm text-slate-400 mb-4">
              {isAr ? 'حقق هذه الشروط لترتقي إلى المستوى التالي وتحصل على عمولات أعلى.' : 'Meet these conditions to advance to the next level and earn higher multipliers.'}
            </p>
            
            {nextLevelData ? (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${contributor.active_referrals >= nextLevelData.required_active_referrals ? 'bg-[hsl(152,69%,51%)] text-black' : 'bg-white/10 text-white'}`}>
                    {contributor.active_referrals >= nextLevelData.required_active_referrals ? '✓' : '1'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">{isAr ? 'أعضاء الفريق النشطين' : 'Active Team Members'}</span>
                      <span className="text-slate-400">{contributor.active_referrals} / {nextLevelData.required_active_referrals}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${contributor.trust_score >= nextLevelData.required_trust_score ? 'bg-[hsl(152,69%,51%)] text-black' : 'bg-white/10 text-white'}`}>
                    {contributor.trust_score >= nextLevelData.required_trust_score ? '✓' : '2'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">{isAr ? 'نقاط الثقة (Trust Score)' : 'Trust Score'}</span>
                      <span className="text-slate-400">{contributor.trust_score} / {nextLevelData.required_trust_score}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${(wallet.points_balance || 0) >= nextLevelData.required_lifetime_points ? 'bg-[hsl(152,69%,51%)] text-black' : 'bg-white/10 text-white'}`}>
                    {(wallet.points_balance || 0) >= nextLevelData.required_lifetime_points ? '✓' : '3'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">{isAr ? 'نقاط النشاط المتراكمة' : 'Lifetime Points'}</span>
                      <span className="text-slate-400">{wallet.points_balance || 0} / {nextLevelData.required_lifetime_points}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-lg bg-[hsl(43,96%,56%,0.1)] border border-[hsl(43,96%,56%,0.3)]">
                <p className="text-[hsl(43,96%,56%)] text-center font-bold">
                  {isAr ? 'أنت في أعلى مستوى إداري! 👑' : 'You are at the maximum management level! 👑'}
                </p>
              </div>
            )}
          </div>
          
          {nextLevelData && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[hsl(220,10%,60%)]">{isAr ? 'التقدم نحو المستوى التالي' : 'Progress to next level'}</span>
                <span className="text-white font-bold">{nextLevelData ? (isAr ? nextLevelData.name_ar : nextLevelData.name_en) : ''}</span>
              </div>
              <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[hsl(258,89%,66%)] transition-all duration-1000"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, 
                      ((contributor.active_referrals / Math.max(1, nextLevelData.required_active_referrals)) * 0.33 +
                      (contributor.trust_score / Math.max(1, nextLevelData.required_trust_score)) * 0.33 +
                      ((wallet.points_balance || 0) / Math.max(1, nextLevelData.required_lifetime_points)) * 0.34) * 100
                    ))}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Network Survival Mode */}
      <div className="grid gap-6 md:grid-cols-2">
        <NetworkHealthCard 
          locale={locale}
          activeReferrals={contributor.active_referrals || 0}
          totalReferrals={contributor.total_referrals || 0}
          healthScore={contributor.network_health_score || 0}
          decayMultiplier={contributor.decay_multiplier || 1.0}
        />
        <SmartAlertsFeed 
          locale={locale}
          notifications={notifications}
        />
      </div>

      {/* 4. Gamification Top Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] shadow-xl">
          <LevelProgressCard 
            locale={locale}
            currentLevel={levelData.level_number}
            levelName={isAr ? levelData.name_ar : levelData.name_en}
            levelIcon={levelData.badge_icon}
            badgeColor={levelData.badge_color}
            referralsToNext={referralsNeeded}
            nextLevelName={nextLevelData ? (isAr ? nextLevelData.name_ar : nextLevelData.name_en) : null}
          />
        </div>
        
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] shadow-xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">{isAr ? 'التفاعل اليومي' : 'Daily Streak'}</h2>
          <StreakTracker 
            locale={locale}
            dailyStreak={streaks?.daily_streak_count || 0}
            weeklyStreak={streaks?.weekly_streak_count || 0}
            bestStreak={streaks?.best_daily_streak || 0}
            bonusActive={streaks?.streak_bonus_active || false}
          />
        </div>
      </div>

      {/* 3. Badges Row */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-white">{isAr ? 'الأوسمة والإنجازات' : 'Badges & Achievements'}</h2>
        <BadgeDisplay 
          locale={locale}
          badges={badges || []}
        />
        {badges.length === 0 && (
          <p className="mt-4 text-sm text-[hsl(220,10%,60%)]">
            {isAr ? 'لم تحصل على أي وسام بعد. ابدأ بالتفاعل مع النظام!' : 'You have not earned any badges yet. Start engaging!'}
          </p>
        )}
      </div>

    </div>
  )
}
