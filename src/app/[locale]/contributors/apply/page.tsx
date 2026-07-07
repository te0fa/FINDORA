export const dynamic = 'force-dynamic'

import React from 'react'
import Link from 'next/link'
import HeaderLogo from '@/components/HeaderLogo'
import OnboardingWizardClient from '@/components/contributors/OnboardingWizardClient'
import { createClient } from '@/lib/supabase/server'
import { getRegistrationAvailability } from '@/lib/contributors/scarcity'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Apply to Work With Us — FINDORA',
}

export default async function ContributorApplyPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'
  const otherLocale = isAr ? 'en' : 'ar'
  const otherLocaleLabel = isAr ? 'English' : 'العربية'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/contributors/apply`)
  }

  // Check if they are a staff member
  const { data: staff } = await (supabase
    .from('staff_members') as any)
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (staff) {
    redirect(`/${locale}/staff/contributors`)
  }

  // Check if they are already an active contributor
  const { data: contributor } = await (supabase
    .from('contributors') as any)
    .select('status')
    .eq('auth_user_id', user.id)
    .single()

  if (contributor && contributor.status === 'active') {
    redirect(`/${locale}/contributors/dashboard`)
  }

  // Load registration scarcity & activation
  const availability = await getRegistrationAvailability()
  const isActive = availability.is_active

  const headerStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    width: '100%',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(220,25%,8%), hsl(240,20%,10%))',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      
      {/* 1. PREMIUM HEADER WITH LOGO & LANG TOGGLE */}
      <header style={headerStyle} dir="ltr">
        <div style={{ width: 140 }}>
          <HeaderLogo locale={locale} href={`/${locale}`} />
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link
            href={`/${otherLocale}/contributors/apply`}
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
            }}
          >
            {otherLocaleLabel}
          </Link>
          <Link
            href={`/${locale}/auth/login`}
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#fff',
              textDecoration: 'none',
              background: 'hsl(258,89%,66%)',
              padding: '8px 18px',
              borderRadius: '999px',
              boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
              transition: 'all 0.2s',
            }}
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </Link>
        </div>
      </header>

      {/* 2. RECRUITMENT STATUS BANNER */}
      <div style={{
        background: isActive ? 'linear-gradient(90deg, rgba(34,197,94,0.12), rgba(168,85,247,0.12))' : 'linear-gradient(90deg, rgba(239,68,68,0.12), rgba(220,15,95,0.04))',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 24px',
        textAlign: 'center',
        fontSize: '0.85rem',
        fontWeight: 700,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <span style={{
          background: isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
          color: isActive ? '#4ade80' : '#f87171',
          padding: '2px 10px',
          borderRadius: 999,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          fontWeight: 900
        }}>
          {isActive ? (isAr ? '🟢 نشط الآن' : '🟢 Active Now') : (isAr ? '🔴 مغلق مؤقتاً' : '🔴 Paused')}
        </span>
        <span>
          {isActive 
            ? (isAr 
                ? `باب التقديم مفتوح حالياً: متبقي ${availability.open_slots} مكان شاغر ومعتمد!` 
                : `Application window is open: ${availability.open_slots} slots remaining!`)
            : (isAr 
                ? 'حملة التسجيل مغلقة حالياً. سجل اهتمامك بالأسفل لتكون على قائمة الانتظار للمراجعة الفورية.' 
                : 'Registration is paused. Submit your interest waitlist application below to secure your spot.')}
        </span>
      </div>

      {/* 3. MAIN WIZARD CONTAINER */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px'
      }}>
        <OnboardingWizardClient locale={locale} isActive={isActive} />
      </main>
      
    </div>
  )
}
