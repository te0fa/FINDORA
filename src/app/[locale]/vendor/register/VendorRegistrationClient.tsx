'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface VendorRegistrationClientProps {
  locale: string
  dictionary?: any
}

interface VendorRegistrationForm {
  businessNameAr: string
  businessNameEn: string
  merchantType: string
  category: string
  governorate: string
  city: string
  area: string
  address: string
  primaryPhone: string
  secondaryPhone: string
  email: string
  password: string
  website: string
  notes: string
}

const MERCHANT_TYPES = [
  { value: 'retailer', labelAr: 'تاجر تجزئة', labelEn: 'Retailer' },
  { value: 'wholesaler', labelAr: 'تاجر جملة', labelEn: 'Wholesaler' },
  { value: 'distributor', labelAr: 'موزع معتمد', labelEn: 'Distributor' },
  { value: 'importer', labelAr: 'مستورد', labelEn: 'Importer' },
  { value: 'factory', labelAr: 'مصنع / منتج', labelEn: 'Manufacturer' },
]

const CATEGORIES = [
  'الإلكترونيات والموبايلات',
  'الأجهزة المنزلية والكهربائية',
  'قطع غيار السيارات',
  'مواد البناء والتشطيبات',
  'الملابس والأزياء',
  'الأثاث والديكور',
  'المستلزمات الطبية والأدوية',
  'أخرى',
]

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم',
  'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس',
  'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء',
  'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج',
]

export default function VendorRegistrationClient({
  locale,
}: VendorRegistrationClientProps) {
  const isAr = locale === 'ar'
  const router = useRouter()

  const [form, setForm] = useState<VendorRegistrationForm>({
    businessNameAr: '',
    businessNameEn: '',
    merchantType: '',
    category: '',
    governorate: '',
    city: '',
    area: '',
    address: '',
    primaryPhone: '',
    secondaryPhone: '',
    email: '',
    password: '',
    website: '',
    notes: '',
  })

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof VendorRegistrationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateStep1 = () => {
    if (!form.businessNameAr.trim()) return isAr ? 'اسم المنشأة بالعربي مطلوب' : 'Arabic business name is required'
    if (!form.merchantType) return isAr ? 'نوع التاجر مطلوب' : 'Merchant type is required'
    if (!form.category) return isAr ? 'الفئة مطلوبة' : 'Category is required'
    return null
  }

  const validateStep2 = () => {
    if (!form.governorate) return isAr ? 'المحافظة مطلوبة' : 'Governorate is required'
    if (!form.primaryPhone.trim()) return isAr ? 'رقم الهاتف الأساسي مطلوب' : 'Primary phone is required'
    const phoneRegex = /^01[0-9]{9}$/
    if (!phoneRegex.test(form.primaryPhone.replace(/\s/g, ''))) {
      return isAr ? 'رقم الهاتف المصري غير صحيح (مثال: 01012345678)' : 'Invalid Egyptian phone number (e.g. 01012345678)'
    }
    if (!form.email.trim()) return isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      return isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format'
    }
    if (!form.password || form.password.length < 6) {
      return isAr ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف' : 'Password must be at least 6 characters'
    }
    return null
  }

  const handleNext = () => {
    if (step === 1) {
      const err = validateStep1()
      if (err) { setError(err); return }
      setStep(2)
    } else if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
      setStep(3)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/vendor/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? (isAr ? 'حدث خطأ. حاول مجدداً' : 'An error occurred. Please try again.'))
      }

      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isAr ? 'حدث خطأ غير متوقع' : 'Unexpected error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div
        className="vendor-success"
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20,
        }}
      >
        <div className="vendor-success__icon" style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 className="vendor-success__title" style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 12 }}>
          {isAr ? 'تم استلام طلبك وتفعيله بنجاح!' : 'Registration Completed & Activated!'}
        </h2>
        <p className="vendor-success__body" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: '0.95rem' }}>
          {isAr
            ? 'شكراً لتسجيلك. يمكنك الآن تسجيل الدخول مباشرة باستخدام بريدك الإلكتروني وكلمة المرور لمتابعة المزادات المتاحة.'
            : 'Thank you for registering. You can now log in directly using your email and password to browse active auctions.'}
        </p>
        <button
          className="vendor-success__btn"
          onClick={() => router.push(`/${locale}/vendor/login`)}
          style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            borderRadius: 10,
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isAr ? 'الانتقال لتسجيل الدخول' : 'Go to Login'}
        </button>
      </div>
    )
  }

  return (
    <div
      className="vendor-reg"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        padding: 32,
      }}
    >
      {/* Progress Bar */}
      <div
        className="vendor-reg__progress"
        aria-label="Registration progress"
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}
      >
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, opacity: step >= s ? 1 : 0.4 }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: step > s ? '#10b981' : step === s ? '#6366f1' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: 8,
              }}
            >
              {step > s ? '✓' : s}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: step === s ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>
              {s === 1
                ? isAr
                  ? 'بيانات المنشأة'
                  : 'Business Info'
                : s === 2
                ? isAr
                  ? 'العنوان وبيانات الدخول'
                  : 'Contact & Account'
                : isAr
                ? 'المراجعة والإرسال'
                : 'Review & Submit'}
            </span>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div
          className="vendor-reg__error"
          role="alert"
          style={{
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10,
            color: '#ef4444',
            fontSize: '0.85rem',
            marginBottom: 20,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Step 1: Business Info */}
      {step === 1 && (
        <div className="vendor-reg__form">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>
            {isAr ? 'بيانات المنشأة التجارية' : 'Business Information'}
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {isAr ? 'اسم المنشأة / المحل (بالعربي) *' : 'Business Name (Arabic) *'}
            </label>
            <input
              type="text"
              value={form.businessNameAr}
              onChange={(e) => update('businessNameAr', e.target.value)}
              placeholder={isAr ? 'مثال: شركة النور للتوريدات' : 'e.g. Al Noor Supplies'}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {isAr ? 'اسم المنشأة (بالإنجليزي - اختياري)' : 'Business Name (English - Optional)'}
            </label>
            <input
              type="text"
              value={form.businessNameEn}
              onChange={(e) => update('businessNameEn', e.target.value)}
              placeholder="e.g. Al Noor Co."
              dir="ltr"
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {isAr ? 'نوع التاجر / المنشأة *' : 'Merchant Type *'}
            </label>
            <select
              value={form.merchantType}
              onChange={(e) => update('merchantType', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'hsl(220,25%,8%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            >
              <option value="">{isAr ? '-- اختر النوع --' : '-- Select Type --'}</option>
              {MERCHANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{isAr ? t.labelAr : t.labelEn}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {isAr ? 'الفئة الأساسية للمنتجات *' : 'Primary Product Category *'}
            </label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'hsl(220,25%,8%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            >
              <option value="">{isAr ? '-- اختر الفئة --' : '-- Select Category --'}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNext}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}
          >
            {isAr ? 'التالي ←' : 'Next →'}
          </button>
        </div>
      )}

      {/* Step 2: Location, Contact & Account Credentials */}
      {step === 2 && (
        <div className="vendor-reg__form">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>
            {isAr ? 'العنوان وبيانات حساب الدخول' : 'Location & Account Credentials'}
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {isAr ? 'المحافظة *' : 'Governorate *'}
            </label>
            <select
              value={form.governorate}
              onChange={(e) => update('governorate', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'hsl(220,25%,8%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            >
              <option value="">{isAr ? '-- اختر المحافظة --' : '-- Select Governorate --'}</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                {isAr ? 'المدينة / المركز' : 'City / District'}
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder={isAr ? 'مثال: مدينة نصر' : 'e.g. Nasr City'}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                {isAr ? 'الحي / المنطقة' : 'Area / Neighborhood'}
              </label>
              <input
                type="text"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                placeholder={isAr ? 'مثال: الحي الأول' : 'e.g. Zone 1'}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {isAr ? 'العنوان التفصيلي' : 'Full Address'}
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder={isAr ? 'رقم العقار، الشارع...' : 'Building number, street name...'}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 16, border: '1px solid rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.01)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: 700 }}>
              {isAr ? 'رقم الهاتف الأساسي (واتساب للتواصل والطلبات) *' : 'Primary Phone (WhatsApp for RFQs & Contact) *'}
            </label>
            <input
              type="tel"
              value={form.primaryPhone}
              onChange={(e) => update('primaryPhone', e.target.value)}
              placeholder="01012345678"
              dir="ltr"
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: 700 }}>
                {isAr ? 'البريد الإلكتروني (لتسجيل الدخول) *' : 'Email Address (for Login) *'}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="vendor@example.com"
                dir="ltr"
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: 700 }}>
                {isAr ? 'كلمة المرور (6 أحرف فأكثر) *' : 'Password (6+ chars) *'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                {isAr ? 'هاتف إضافي (اختياري)' : 'Secondary Phone (Optional)'}
              </label>
              <input
                type="tel"
                value={form.secondaryPhone}
                onChange={(e) => update('secondaryPhone', e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                {isAr ? 'الموقع الإلكتروني (اختياري)' : 'Website (Optional)'}
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://..."
                dir="ltr"
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => setStep(1)}
              style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}
            >
              {isAr ? '← السابق' : '← Back'}
            </button>
            <button
              onClick={handleNext}
              style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}
            >
              {isAr ? 'التالي →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="vendor-reg__form">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>
            {isAr ? 'مراجعة البيانات وإرسال الطلب' : 'Review & Submit'}
          </h2>

          <div style={{ padding: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 8px 0', color: '#818cf8' }}>
                {isAr ? 'بيانات المنشأة' : 'Business Info'}
              </h3>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الاسم بالعربي:' : 'Arabic Name:'}</strong> {form.businessNameAr}</p>
              {form.businessNameEn && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الاسم بالانجليزي:' : 'English Name:'}</strong> {form.businessNameEn}</p>}
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'نوع المنشأة:' : 'Type:'}</strong> {MERCHANT_TYPES.find(t => t.value === form.merchantType)?.[isAr ? 'labelAr' : 'labelEn']}</p>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الفئة:' : 'Category:'}</strong> {form.category}</p>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 8px 0', color: '#818cf8' }}>
                {isAr ? 'العنوان وبيانات الحساب' : 'Location & Account'}
              </h3>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'المحافظة:' : 'Governorate:'}</strong> {form.governorate}</p>
              {form.city && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'المدينة:' : 'City:'}</strong> {form.city}</p>}
              {form.area && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'المنطقة:' : 'Area:'}</strong> {form.area}</p>}
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الهاتف (واتساب):' : 'Phone (WhatsApp):'}</strong> {form.primaryPhone}</p>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'البريد الإلكتروني:' : 'Email:'}</strong> {form.email}</p>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              {isAr ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (optional)'}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              placeholder={isAr ? 'أي معلومات إضافية تود مشاركتها معنا...' : "Any additional information you'd like to share..."}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => setStep(2)}
              style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}
            >
              {isAr ? '← السابق' : '← Back'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال الطلب والتسجيل' : 'Submit & Register')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
