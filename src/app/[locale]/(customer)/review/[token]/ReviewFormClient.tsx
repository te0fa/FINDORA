'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'

interface ReviewFormClientProps {
  locale: string
  token: string
  vendorName: string
  dict: any
}

// ─── Reusable Star Input ──────────────────────────────────────────────────────

function StarRating({ 
  value, 
  onChange, 
  hoverValue, 
  setHoverValue 
}: { 
  value: number
  onChange: (v: number) => void
  hoverValue: number
  setHoverValue: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', direction: 'ltr' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isLit = hoverValue ? star <= hoverValue : star <= value
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              transition: 'transform 0.15s ease',
              transform: hoverValue === star ? 'scale(1.2)' : 'scale(1)',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill={isLit ? '#fbbf24' : 'none'}
              stroke={isLit ? '#fbbf24' : '#4b5563'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: isLit ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.4))' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReviewFormClient({ locale, token, vendorName, dict }: ReviewFormClientProps) {
  const [platformRating, setPlatformRating] = useState(0)
  const [platformComment, setPlatformComment] = useState('')
  const [vendorRating, setVendorRating] = useState(0)
  const [vendorAvailability, setVendorAvailability] = useState(0)
  const [vendorPriceAccuracy, setVendorPriceAccuracy] = useState(0)
  const [vendorCommunication, setVendorCommunication] = useState(0)

  const [platformHover, setPlatformHover] = useState(0)
  const [vendorHover, setVendorHover] = useState(0)
  const [availHover, setAvailHover] = useState(0)
  const [priceHover, setPriceHover] = useState(0)
  const [commHover, setCommHover] = useState(0)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const isRTL = locale === 'ar'

  const t = (en: string, ar: string) => isRTL ? ar : en

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (platformRating === 0) {
      setError(t('Please rate your experience with Findora platform.', 'يرجى تقييم تجربتك مع منصة فيندورا أولاً.'))
      return
    }
    if (vendorRating === 0 || vendorAvailability === 0 || vendorPriceAccuracy === 0 || vendorCommunication === 0) {
      setError(t('Please answer all vendor evaluation questions.', 'يرجى الإجابة على جميع أسئلة تقييم المورد.'))
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/reviews/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            platform_rating: platformRating,
            platform_comment: platformComment.trim() || undefined,
            vendor_rating: vendorRating,
            vendor_availability: vendorAvailability,
            vendor_price_accuracy: vendorPriceAccuracy,
            vendor_communication: vendorCommunication,
          }),
        })

        const json = await res.json()
        if (!res.ok) {
          setError(json.error || t('An error occurred during submission.', 'حدث خطأ أثناء إرسال التقييم.'))
          return
        }

        setIsSubmitted(true)
      } catch (err: any) {
        setError(t('Network connection failed.', 'فشل الاتصال بالشبكة.'))
      }
    })
  }

  if (isSubmitted) {
    return (
      <div style={successCardS}>
        <div style={successIconContainerS}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={successTitleS}>
          {t('Thank You!', 'شكراً جزيلاً!')}
        </h1>
        <p style={successDescS}>
          {t(
            'Your review has been submitted successfully. Your feedback helps Findora maintain high quality and trusted vendor connections.',
            'تم إرسال تقييمك بنجاح. تساعدنا ملاحظاتك في الحفاظ على جودة وموثوقية الخدمات والشركاء المتاحين على المنصة.'
          )}
        </p>
        <Link href={`/${locale}`} style={doneBtnS}>
          {t('Go to Home', 'العودة للرئيسية')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={formCardS}>
      {/* Header */}
      <div style={headerContainerS}>
        <div style={logoBadgeS}>💎</div>
        <h2 style={titleS}>{t('Feedback Survey', 'تقييم جودة الخدمة')}</h2>
        <p style={subtitleS}>
          {t(
            `Help us rate the service provided by ${vendorName} to improve future bookings.`,
            `ساعدنا في تقييم الخدمة المقدمة من ${vendorName} لتحسين جودة الطلبات القادمة.`
          )}
        </p>
      </div>

      <div style={dividerS} />

      {/* Group 1: Platform */}
      <div style={sectionS}>
        <h3 style={sectionTitleS}>
          {t('1. Platform Experience', '١. تجربة منصة فيندورا')}
        </h3>
        
        <div style={questionBlockS}>
          <label style={questionLabelS}>
            {t('How would you rate your overall experience with our platform?', 'كيف تقيم تجربتك الإجمالية في استخدام منصتنا؟')}
          </label>
          <StarRating 
            value={platformRating} 
            onChange={setPlatformRating} 
            hoverValue={platformHover}
            setHoverValue={setPlatformHover}
          />
        </div>

        <div style={questionBlockS}>
          <label style={questionLabelS}>
            {t('Optional comments about Findora:', 'ملاحظات أو مقترحات لتحسين المنصة (اختياري):')}
          </label>
          <textarea
            value={platformComment}
            onChange={e => setPlatformComment(e.target.value)}
            placeholder={t('Share your thoughts...', 'شاركنا برأيك...')}
            rows={3}
            style={textareaS}
          />
        </div>
      </div>

      <div style={dividerS} />

      {/* Group 2: Vendor */}
      <div style={sectionS}>
        <h3 style={sectionTitleS}>
          {t(`2. Vendor Evaluation (${vendorName})`, `٢. تقييم أداء مقدم الخدمة (${vendorName})`)}
        </h3>

        <div style={questionBlockS}>
          <label style={questionLabelS}>
            {t('Overall Vendor Rating: How satisfied were you with their work?', 'التقييم العام للمورد: ما مدى رضاك عن مستوى تنفيذ العمل؟')}
          </label>
          <StarRating 
            value={vendorRating} 
            onChange={setVendorRating} 
            hoverValue={vendorHover}
            setHoverValue={setVendorHover}
          />
        </div>

        <div style={questionBlockS}>
          <label style={questionLabelS}>
            {t('Availability & Timeliness: Did they show up or respond on time?', 'التواجد والالتزام بالوقت: هل التزم المورد بالمواعيد المحددة؟')}
          </label>
          <StarRating 
            value={vendorAvailability} 
            onChange={setVendorAvailability} 
            hoverValue={availHover}
            setHoverValue={setAvailHover}
          />
        </div>

        <div style={questionBlockS}>
          <label style={questionLabelS}>
            {t('Price Accuracy: Were there any unexpected charges or hidden fees?', 'دقة التسعير: هل كانت التكلفة مطابقة للاتفاق دون زيادات خفية؟')}
          </label>
          <StarRating 
            value={vendorPriceAccuracy} 
            onChange={setVendorPriceAccuracy} 
            hoverValue={priceHover}
            setHoverValue={setPriceHover}
          />
        </div>

        <div style={questionBlockS}>
          <label style={questionLabelS}>
            {t('Communication: Was the team professional, clear, and easy to reach?', 'التواصل والتعامل: هل كان أسلوب التواصل واضحاً ومهنياً وسهلاً؟')}
          </label>
          <StarRating 
            value={vendorCommunication} 
            onChange={setVendorCommunication} 
            hoverValue={commHover}
            setHoverValue={setCommHover}
          />
        </div>
      </div>

      {error && (
        <div style={errorBannerS}>
          ⚠️ {error}
        </div>
      )}

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={isPending} 
        style={{
          ...submitBtnS,
          opacity: isPending ? 0.7 : 1,
          cursor: isPending ? 'not-allowed' : 'pointer'
        }}
      >
        {isPending ? t('Submitting survey...', 'جاري إرسال التقييم...') : t('Submit Evaluation', 'إرسال التقييم المعتمد')}
      </button>
    </form>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const formCardS: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  padding: '36px',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
}

const headerContainerS: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '28px',
}

const logoBadgeS: React.CSSProperties = {
  fontSize: '2rem',
  background: 'rgba(99, 102, 241, 0.1)',
  width: '60px',
  height: '60px',
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px auto',
  border: '1px solid rgba(99, 102, 241, 0.2)',
}

const titleS: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 900,
  color: '#ffffff',
  margin: '0 0 8px 0',
}

const subtitleS: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#94a3b8',
  lineHeight: 1.5,
  margin: 0,
}

const dividerS: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent)',
  margin: '24px 0',
}

const sectionS: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
}

const sectionTitleS: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 800,
  color: '#818cf8',
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const questionBlockS: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const questionLabelS: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#e2e8f0',
  fontWeight: 600,
  lineHeight: 1.5,
}

const textareaS: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'none',
  boxSizing: 'border-box',
}

const errorBannerS: React.CSSProperties = {
  marginTop: '20px',
  padding: '12px 16px',
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: '12px',
  color: '#fca5a5',
  fontSize: '0.82rem',
  fontWeight: 700,
}

const submitBtnS: React.CSSProperties = {
  marginTop: '28px',
  width: '100%',
  padding: '14px',
  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  border: 'none',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: 800,
  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
  transition: 'transform 0.15s, opacity 0.15s',
}

const successCardS: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  padding: '48px 36px',
  textAlign: 'center',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
}

const successIconContainerS: React.CSSProperties = {
  width: '80px',
  height: '80px',
  background: 'rgba(52, 211, 153, 0.1)',
  borderRadius: '999px',
  border: '2px solid rgba(52, 211, 153, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 24px auto',
}

const successTitleS: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 900,
  color: '#ffffff',
  margin: '0 0 12px 0',
}

const successDescS: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#94a3b8',
  lineHeight: 1.6,
  margin: '0 0 32px 0',
}

const doneBtnS: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 32px',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  borderRadius: '12px',
  fontSize: '0.875rem',
  fontWeight: 700,
  textDecoration: 'none',
  transition: 'background 0.2s',
}
