import React from 'react'
import { getReviewByToken } from '@/lib/dal/vendors'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import ReviewFormClient from './ReviewFormClient'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

export default async function CustomerReviewPage({ params }: PageProps) {
  const { locale, token } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const review = await getReviewByToken(token)

  // Validate token
  const isValid = review && new Date(review.token_expires_at) > new Date()
  const isAlreadySubmitted = review && review.platform_rating !== null

  if (!isValid) {
    return (
      <main dir={isRTL ? 'rtl' : 'ltr'} style={errorContainerS}>
        <div style={errorCardS}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>⚠️</span>
          <h1 style={errorTitleS}>
            {isRTL ? 'رابط تقييم غير صالح أو منتهي الصلاحية' : 'Invalid or Expired Review Link'}
          </h1>
          <p style={errorDescS}>
            {isRTL 
              ? 'عذراً، هذا الرابط لم يعد صالحاً للاستخدام أو انتهت مدة صلاحيته (٧ أيام من تاريخ الدفع).' 
              : 'Sorry, this link is either invalid or has expired (7 days from payment date).'}
          </p>
          <Link href={`/${locale}`} style={homeBtnS}>
            {isRTL ? 'الرجوع للرئيسية' : 'Go to Homepage'}
          </Link>
        </div>
      </main>
    )
  }

  if (isAlreadySubmitted) {
    return (
      <main dir={isRTL ? 'rtl' : 'ltr'} style={errorContainerS}>
        <div style={errorCardS}>
          <span style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'block' }}>🎉</span>
          <h1 style={errorTitleS}>
            {isRTL ? 'تم تقديم هذا التقييم مسبقاً' : 'Review Already Submitted'}
          </h1>
          <p style={errorDescS}>
            {isRTL 
              ? 'شكراً لك! لقد قمت بتقييم هذه الخدمة بالفعل وملاحظاتك تساعدنا في تحسين المنصة.' 
              : 'Thank you! You have already submitted a review for this service, and your feedback helps us improve.'}
          </p>
          <Link href={`/${locale}`} style={homeBtnS}>
            {isRTL ? 'الرجوع للرئيسية' : 'Go to Homepage'}
          </Link>
        </div>
      </main>
    )
  }

  const vendorName = review.vendors?.display_name || (isRTL ? 'مورد منصة فيندورا' : 'Findora Partner Vendor')

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} style={containerS}>
      <div style={gradientBgS} />
      <div style={contentS}>
        <ReviewFormClient 
          locale={locale} 
          token={token} 
          vendorName={vendorName} 
          dict={dict} 
        />
      </div>
    </main>
  )
}

const containerS: React.CSSProperties = {
  minHeight: '100vh',
  background: '#030712',
  color: '#f3f4f6',
  fontFamily: "'Inter', sans-serif",
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px',
  position: 'relative',
  overflow: 'hidden',
}

const gradientBgS: React.CSSProperties = {
  position: 'absolute',
  top: '-10%',
  left: '-10%',
  width: '120%',
  height: '120%',
  backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.08) 0%, rgba(3, 7, 18, 0) 60%)',
  zIndex: 1,
  pointerEvents: 'none',
}

const contentS: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  width: '100%',
  maxWidth: '520px',
}

const errorContainerS: React.CSSProperties = {
  minHeight: '100vh',
  background: '#030712',
  color: '#f3f4f6',
  fontFamily: "'Inter', sans-serif",
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px',
}

const errorCardS: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '24px',
  padding: '40px 32px',
  textAlign: 'center',
  maxWidth: '440px',
  width: '100%',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
}

const errorTitleS: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 800,
  color: '#ffffff',
  margin: '0 0 12px 0',
}

const errorDescS: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#9ca3af',
  lineHeight: 1.6,
  margin: '0 0 28px 0',
}

const homeBtnS: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  color: '#ffffff',
  borderRadius: '12px',
  fontSize: '0.875rem',
  fontWeight: 700,
  textDecoration: 'none',
  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
  transition: 'transform 0.2s',
}
