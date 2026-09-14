'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Copy,
  Sparkles,
  Search,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  Bell,
  Layers,
  MapPin,
  Tag,
  BadgePercent,
  Calendar,
  Share2
} from 'lucide-react'
import styles from './RequestSuccessCelebration.module.css'

export interface RequestSuccessCelebrationProps {
  locale: string
  requestCode: string
  requestId?: string
  isReturning?: boolean
  request?: {
    id: string
    product_name: string
    category?: string | null
    target_location?: string | null
    max_price?: number | null
    additional_notes?: string | null
    status?: string | null
    created_at?: string | null
    metadata?: any
  } | null
}

export default function RequestSuccessCelebration({
  locale,
  requestCode,
  requestId,
  isReturning = false,
  request = null
}: RequestSuccessCelebrationProps) {
  const isAr = locale === 'ar'
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(requestCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2500)
    } catch {
      // Ignore if clipboard blocked
    }
  }

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : ''
      if (url) {
        await navigator.clipboard.writeText(url)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2500)
      }
    } catch {
      // Ignore if clipboard blocked
    }
  }

  // Parse custom specifications if available
  const parsedSpecs: Array<{ label: string; value: string }> = []
  if (request?.metadata?.customSpecs && typeof request.metadata.customSpecs === 'object') {
    Object.entries(request.metadata.customSpecs).forEach(([k, v]) => {
      if (v && typeof v === 'string') {
        parsedSpecs.push({ label: k, value: v })
      }
    })
  } else if (request?.additional_notes) {
    const lines = request.additional_notes.split('\n')
    lines.forEach(line => {
      const match = line.match(/^-\s*\*\*([^*]+)\*\*:\s*(.+)$/)
      if (match) {
        parsedSpecs.push({ label: match[1], value: match[2] })
      }
    })
  }

  const loginUrl = '/' + locale + '/auth/login?next=' + encodeURIComponent('/' + locale + '/customer/dashboard')
  const offerRoomUrl = requestId ? ('/' + locale + '/customer/request/' + requestId + (requestCode ? '?code=' + requestCode : '')) : ''

  return (
    <section data-testid="request-success-banner" className={styles.celebrationCard}>
      {/* Ambient background glow orbs */}
      <div className={styles.glowGreen} />
      <div className={styles.glowPurple} />

      {/* Header Badge & Title */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.badgeActive}>
            <span className={styles.pulseDot} />
            <span>{isAr ? 'تم استلام وتفعيل الطلب بنجاح' : 'Request Received & Activated'}</span>
          </div>

          <h2 className={styles.title}>
            {isAr ? 'تم استلام طلبك وجاري إطلاقه لشبكة الموردين! 🎉' : 'Your Request is Live & Sourcing Has Begun! 🎉'}
          </h2>

          <p className={styles.subtitle}>
            {isAr
              ? 'فريق فيندورا ومحرك الذكاء الاصطناعي بدأوا مسح شبكة الموردين المعتمدين والمتاجر المتخصصة للوصول لأفضل صفقة مطابقة لمواصفاتك بأفضل سعر.'
              : 'Findora’s concierge team and AI engine are actively querying vetted suppliers and specialized merchants to secure the best verified deals matching your specs.'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={styles.shareBtn}
          >
            {copiedLink ? <Check size={14} color="#4ade80" /> : <Share2 size={14} color="#94a3b8" />}
            <span>{copiedLink ? (isAr ? 'تم نسخ الرابط! ✓' : 'Link Copied! ✓') : (isAr ? 'نسخ رابط التتبع' : 'Copy Direct Link')}</span>
          </button>
        </div>
      </div>

      {/* Hero Tracking Code Card */}
      <div className={styles.trackingCodeBox}>
        <div className={styles.trackingCodeInner}>
          <div>
            <span className={styles.codeLabel}>
              {isAr ? 'كود التتبع المعتمد لطلبك' : 'Your Official Tracking Code'}
            </span>
            <div data-testid="request-success-code" className={styles.codeValue}>
              {requestCode}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className={styles.copyBtn}
          >
            {copiedCode ? (
              <>
                <Check size={16} />
                <span>{isAr ? 'تم نسخ الكود! ✓' : 'Code Copied! ✓'}</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>{isAr ? 'نسخ كود التتبع' : 'Copy Tracking Code'}</span>
              </>
            )}
          </button>
        </div>

        <div className={styles.codeFooterNote}>
          <ShieldCheck size={16} color="#4ade80" style={{ flexShrink: 0 }} />
          <span>
            {isAr
              ? 'احفظ هذا الكود لتتبع حالة طلبك في أي وقت، أو استعرض عروض الموردين فور توفرها دون الحاجة لكلمة مرور.'
              : 'Keep this code handy to track your request status and review incoming vendor deals anytime without needing a password.'}
          </span>
        </div>
      </div>

      {/* Returning Customer Account Notification */}
      {isReturning && (
        <div className={styles.returningBanner}>
          <div>
            <p style={{ fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
              <Sparkles size={16} color="#c4b5fd" />
              <span>{isAr ? 'تم ربط الطلب تلقائياً بحسابك المسجل لدينا!' : 'Request linked to your registered account!'}</span>
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
              {isAr
                ? 'وجدنا أن رقم الهاتف هذا مسجل مسبقاً في شبكتنا. تم حفظ الطلب وربطه مباشرة بملفك الشخصي.'
                : 'This phone number is recognized in our database. Your new request was safely attached to your existing customer profile.'}
            </p>
          </div>
          <Link href={loginUrl} className={styles.loginBtn}>
            <span>{isAr ? 'تسجيل الدخول للمتابعة' : 'Log In to Follow Up'}</span>
            {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>
        </div>
      )}

      {/* Active Request Overview (if request data is loaded) */}
      {request && (
        <div className={styles.snapshotCard}>
          <div className={styles.snapshotHeader}>
            <span className={styles.snapshotTitleLabel}>
              <Layers size={15} color="#c4b5fd" />
              <span>{isAr ? 'ملخص طلبك المُقدَّم' : 'Submitted Request Details'}</span>
            </span>
            {offerRoomUrl ? (
              <Link href={offerRoomUrl} className={styles.offerRoomLink}>
                <span>{isAr ? 'غرفة العروض المباشرة' : 'Live Offer Room'}</span>
                <ExternalLink size={13} />
              </Link>
            ) : null}
          </div>

          <div>
            <h3 className={styles.productName}>
              {request.product_name}
            </h3>
            <div className={styles.tagGrid}>
              {request.category && (
                <span className={styles.tagPill}>
                  <Tag size={13} color="#94a3b8" />
                  <span>{request.category}</span>
                </span>
              )}
              {request.target_location && (
                <span className={styles.tagPill}>
                  <MapPin size={13} color="#94a3b8" />
                  <span>{request.target_location}</span>
                </span>
              )}
              <span className={styles.tagPill}>
                <BadgePercent size={13} color="#4ade80" />
                <span>
                  {request.max_price
                    ? (isAr ? 'الحد الأقصى للميزانية: ' : 'Max Budget: ') + Number(request.max_price).toLocaleString() + ' EGP'
                    : (isAr ? 'أفضل سعر متاح بالسوق' : 'Best Market Price')}
                </span>
              </span>
              {request.created_at && (
                <span className={styles.tagPill} style={{ fontFamily: 'monospace' }}>
                  <Calendar size={13} color="#94a3b8" />
                  <span>{new Date(request.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Formatted specifications chips if present */}
          {parsedSpecs.length > 0 && (
            <div className={styles.specsSection}>
              <span className={styles.specsTitle}>
                {isAr ? 'المواصفات المطلوبة:' : 'Requested Specifications:'}
              </span>
              <div className={styles.specsGrid}>
                {parsedSpecs.map((spec, idx) => (
                  <div key={idx} className={styles.specChip}>
                    <span className={styles.specKey}>{spec.label}:</span>
                    <span className={styles.specVal}>{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4-Step Sourcing Pipeline Journey */}
      <div className={styles.pipelineSection}>
        <div className={styles.pipelineTitle}>
          <Sparkles size={15} color="#f59e0b" />
          <span>{isAr ? 'خط سير ومعالجة طلبك (Sourcing Pipeline)' : 'Real-Time Sourcing Pipeline'}</span>
        </div>

        <div className={styles.pipelineGrid}>
          {/* Step 1: Intake */}
          <div className={`${styles.stepCard} ${styles.stepDone}`}>
            <div className={styles.stepTop}>
              <span className={styles.stepIconDone}>✓</span>
              <span className={styles.stepBadgeDone}>{isAr ? 'مكتمل' : 'Done'}</span>
            </div>
            <div>
              <p className={styles.stepName}>{isAr ? 'استلام وتدقيق الطلب' : 'Intake & Validation'}</p>
              <p className={styles.stepDesc}>
                {isAr ? 'تم تسجيل مواصفات الطلب وفحص جاهزيته' : 'Request logged and specs verified'}
              </p>
            </div>
          </div>

          {/* Step 2: Sourcing / Matching (Active) */}
          <div className={`${styles.stepCard} ${styles.stepActive}`}>
            <div className={styles.stepTop}>
              <span className={styles.stepIconActive}>
                <Search size={14} />
              </span>
              <span className={styles.stepBadgeActive}>
                <span className={styles.pulseDot} style={{ width: '6px', height: '6px', background: '#c4b5fd', boxShadow: '0 0 8px #c4b5fd' }} />
                <span>{isAr ? 'نشط حالياً' : 'In Progress'}</span>
              </span>
            </div>
            <div>
              <p className={styles.stepName}>{isAr ? 'مسح ومطابقة الموردين' : 'Supplier Matching'}</p>
              <p className={styles.stepDesc}>
                {isAr ? 'جاري البحث لدى الموردين والمتاجر المعتمدة' : 'Querying vetted merchants & distributors'}
              </p>
            </div>
          </div>

          {/* Step 3: Quality & Pricing Review */}
          <div className={`${styles.stepCard} ${styles.stepUpcoming}`}>
            <div className={styles.stepTop}>
              <span className={styles.stepIconUpcoming}>
                <Clock size={14} />
              </span>
              <span className={styles.stepBadgeUpcoming}>{isAr ? 'الخطوة القادمة' : 'Upcoming'}</span>
            </div>
            <div>
              <p className={styles.stepName} style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {isAr ? 'تدقيق العروض والأسعار' : 'Deal & Price Review'}
              </p>
              <p className={styles.stepDesc}>
                {isAr ? 'مقارنة الأسعار واختيار أفضل العروض الموثوقة' : 'Comparing prices and selecting top value deals'}
              </p>
            </div>
          </div>

          {/* Step 4: Notification & Delivery */}
          <div className={`${styles.stepCard} ${styles.stepUpcoming}`}>
            <div className={styles.stepTop}>
              <span className={styles.stepIconUpcoming}>
                <Bell size={14} />
              </span>
              <span className={styles.stepBadgeUpcoming}>{isAr ? 'الخطوة الأخيرة' : 'Final Step'}</span>
            </div>
            <div>
              <p className={styles.stepName} style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {isAr ? 'إشعارك بالعروض المتاحة' : 'Direct Offer Notification'}
              </p>
              <p className={styles.stepDesc}>
                {isAr ? 'إرسال تنبيه فوري عبر هاتفك ورابط العرض' : 'Direct notification sent with ready quotes'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Guidance Banner */}
      <div className={styles.guestAdvice}>
        <div className={styles.guestAdviceContent}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div>
            <p style={{ fontWeight: 800, color: '#ffffff', fontSize: '14px', margin: 0 }}>
              {isAr ? 'أنت تتصفح كزائر — طلبك محفوظ ومؤمّن بالكامل' : 'Browsing as a Guest — Your request is safely stored'}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
              {isAr
                ? 'احفظ هذه الصفحة في المفضلة للعودة إليها لاحقاً، أو أنشئ حساباً مجانياً لحفظ جميع طلباتك في مكان واحد.'
                : 'Bookmark this page to check updates, or create a free account to keep all your requests in one place.'}
            </p>
          </div>
        </div>

        <Link href={'/' + locale + '/auth/signup'} className={styles.signupBtn}>
          <span>{isAr ? 'إنشاء حساب مجاني' : 'Create Free Account'}</span>
          {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
        </Link>
      </div>
    </section>
  )
}
