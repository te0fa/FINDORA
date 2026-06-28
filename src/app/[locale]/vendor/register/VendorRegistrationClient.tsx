'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  website: string
  notes: string
}

const MERCHANT_TYPES = [
  { value: 'retailer', labelAr: 'تاجر تجزئة', labelEn: 'Retailer' },
  { value: 'wholesaler', labelAr: 'تاجر جملة', labelEn: 'Wholesaler' },
  { value: 'manufacturer', labelAr: 'مصنّع', labelEn: 'Manufacturer' },
  { value: 'importer', labelAr: 'مستورد', labelEn: 'Importer' },
  { value: 'service_provider', labelAr: 'مزود خدمة', labelEn: 'Service Provider' },
  { value: 'contractor', labelAr: 'مقاول', labelEn: 'Contractor' },
]

const CATEGORIES = [
  'إلكترونيات', 'أجهزة منزلية', 'أثاث', 'مواد بناء', 'ملابس',
  'أغذية', 'أدوية', 'سيارات وقطع غيار', 'مستلزمات مكتبية',
  'مواد خام', 'تقنية معلومات', 'خدمات', 'أخرى'
]

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحيرة', 'الغربية',
  'المنوفية', 'القليوبية', 'الشرقية', 'المنيا', 'أسيوط', 'سوهاج',
  'قنا', 'الأقصر', 'أسوان', 'الفيوم', 'بني سويف', 'دمياط',
  'كفر الشيخ', 'الإسماعيلية', 'السويس', 'بورسعيد', 'شمال سيناء',
  'جنوب سيناء', 'البحر الأحمر', 'الوادي الجديد', 'مطروح'
]

export default function VendorRegistrationClient({
  locale,
  dictionary
}: {
  locale: string
  dictionary: Record<string, string>
}) {
  const router = useRouter()
  const isAr = locale === 'ar'

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
    website: '',
    notes: '',
  })
  
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  const update = (field: keyof VendorRegistrationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
    if (field === 'primaryPhone') {
      setOtpSent(false)
      setOtpVerified(false)
      setOtpCode('')
      setDevCode('')
    }
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
    if (!otpVerified) return isAr ? 'يجب التحقق من رقم الهاتف عن طريق كود OTP أولاً' : 'Phone number must be verified via OTP first'
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

  const handleSendOtp = async () => {
    if (!form.primaryPhone.trim()) {
      setError(isAr ? 'برجاء إدخال رقم الهاتف أولاً' : 'Please enter primary phone number first');
      return;
    }
    const phoneRegex = /^01[0-9]{9}$/;
    if (!phoneRegex.test(form.primaryPhone.replace(/\s/g, ''))) {
      setError(isAr ? 'رقم الهاتف المصري غير صحيح' : 'Invalid Egyptian phone number');
      return;
    }

    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: form.primaryPhone.trim(), purpose: 'vendor_auth' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      setOtpSent(true);
      if (data.devCode) {
        setDevCode(data.devCode);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError(isAr ? 'برجاء إدخال كود التحقق المكون من 6 أرقام' : 'Please enter the 6-digit verification code');
      return;
    }

    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: form.primaryPhone.trim(), code: otpCode, purpose: 'vendor_auth' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      setOtpVerified(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/vendor/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, otpCode }),
      })

      if (!res.ok) {
        const data = await res.json()
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
      <div className="vendor-success" style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20 }}>
        <div className="vendor-success__icon" style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 className="vendor-success__title" style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 12 }}>
          {isAr ? 'تم استلام طلبك وتفعيله!' : 'Registration Completed & Activated!'}
        </h2>
        <p className="vendor-success__body" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: '0.95rem' }}>
          {isAr
            ? 'شكراً لتسجيلك. يمكنك الآن تسجيل الدخول مباشرة إلى حسابك لمتابعة المزادات المتاحة.'
            : 'Thank you for registering. You can now log in directly to your vendor account and browse active auctions.'}
        </p>
        <button
          className="vendor-success__btn"
          onClick={() => router.push(`/${locale}/vendor/login`)}
          style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}
        >
          {isAr ? 'الانتقال لتسجيل الدخول' : 'Go to Login'}
        </button>
      </div>
    )
  }

  return (
    <div className="vendor-reg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 32 }}>
      {/* Progress Bar */}
      <div className="vendor-reg__progress" aria-label="Registration progress" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, opacity: step >= s ? 1 : 0.4 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: step > s ? '#10b981' : step === s ? '#6366f1' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>{step > s ? '✓' : s}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: step === s ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>
              {s === 1 ? (isAr ? 'بيانات المنشأة' : 'Business Info') :
               s === 2 ? (isAr ? 'التواصل والتحقق' : 'Contact & OTP') :
                         (isAr ? 'المراجعة والإرسال' : 'Review & Submit')}
            </span>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="vendor-reg__error" role="alert" style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', fontSize: '0.85rem', marginBottom: 20 }}>
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
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'اسم المنشأة (عربي) *' : 'Business Name (Arabic) *'}</label>
            <input
              type="text"
              value={form.businessNameAr}
              onChange={(e) => update('businessNameAr', e.target.value)}
              placeholder={isAr ? 'مثال: مؤسسة الأمل للتجارة' : 'e.g. Al-Amal Trading'}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              dir="rtl"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'اسم المنشأة (انجليزي)' : 'Business Name (English)'}</label>
            <input
              type="text"
              value={form.businessNameEn}
              onChange={(e) => update('businessNameEn', e.target.value)}
              placeholder="e.g. Al-Amal Trading Co."
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              dir="ltr"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'نوع المنشأة *' : 'Business Type *'}</label>
            <select
              value={form.merchantType}
              onChange={(e) => update('merchantType', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'hsl(220,25%,8%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            >
              <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
              {MERCHANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {isAr ? t.labelAr : t.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'الفئة الرئيسية *' : 'Main Category *'}</label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'hsl(220,25%,8%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
            >
              <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button onClick={handleNext} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
            {isAr ? 'التالي ←' : 'Next →'}
          </button>
        </div>
      )}

      {/* Step 2: Location, Contact & OTP */}
      {step === 2 && (
        <div className="vendor-reg__form">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>
            {isAr ? 'العنوان وتأكيد رقم الهاتف' : 'Contact & Phone Verification'}
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'المحافظة *' : 'Governorate *'}</label>
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'المدينة / المركز' : 'City / District'}</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder={isAr ? 'مثال: مدينة نصر' : 'e.g. Nasr City'}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'الحي / المنطقة' : 'Area / Neighborhood'}</label>
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
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'العنوان التفصيلي' : 'Full Address'}</label>
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
              {isAr ? 'رقم الهاتف الأساسي (لتلقي الـ OTP وتوثيق الحساب) *' : 'Primary Phone (for OTP & Authentication) *'}
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="tel"
                value={form.primaryPhone}
                onChange={(e) => update('primaryPhone', e.target.value)}
                placeholder="01xxxxxxxxx"
                disabled={otpVerified || otpLoading}
                style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none' }}
                dir="ltr"
              />
              {!otpVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || !form.primaryPhone}
                  style={{ padding: '0 20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#818cf8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {otpSent ? (isAr ? 'إعادة الإرسال' : 'Resend') : (isAr ? 'إرسال OTP' : 'Send OTP')}
                </button>
              )}
            </div>

            {otpSent && !otpVerified && (
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'أدخل رمز التحقق (OTP) *' : 'Enter verification code (OTP) *'}</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', textAlign: 'center', letterSpacing: '0.2em', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpCode.length !== 6}
                    style={{ padding: '0 20px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {isAr ? 'تأكيد الرمز' : 'Verify'}
                  </button>
                </div>
                {devCode && (
                  <div style={{ marginTop: 8, padding: 8, background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed rgba(99, 102, 241, 0.4)', borderRadius: 6, fontSize: '0.8rem', color: '#818cf8', textAlign: 'center' }}>
                    {isAr ? `رمز التجريب: ${devCode}` : `Development Code: ${devCode}`}
                  </div>
                )}
              </div>
            )}

            {otpVerified && (
              <div style={{ marginTop: 10, color: '#10b981', fontSize: '0.85rem', fontWeight: 700 }}>
                ✓ {isAr ? 'تم التحقق من الهاتف وتوثيق الحساب بنجاح' : 'Phone verified & auth credentials ready'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
              {isAr ? '← السابق' : '← Back'}
            </button>
            <button onClick={handleNext} disabled={!otpVerified} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer', opacity: otpVerified ? 1 : 0.5 }}>
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
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 8px 0', color: '#818cf8' }}>{isAr ? 'بيانات المنشأة' : 'Business Info'}</h3>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الاسم بالعربي:' : 'Arabic Name:'}</strong> {form.businessNameAr}</p>
              {form.businessNameEn && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الاسم بالانجليزي:' : 'English Name:'}</strong> {form.businessNameEn}</p>}
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'نوع المنشأة:' : 'Type:'}</strong> {MERCHANT_TYPES.find(t => t.value === form.merchantType)?.[isAr ? 'labelAr' : 'labelEn']}</p>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الفئة:' : 'Category:'}</strong> {form.category}</p>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 8px 0', color: '#818cf8' }}>{isAr ? 'العنوان والتواصل' : 'Location & Contact'}</h3>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'المحافظة:' : 'Governorate:'}</strong> {form.governorate}</p>
              {form.city && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'المدينة:' : 'City:'}</strong> {form.city}</p>}
              {form.area && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'المنطقة:' : 'Area:'}</strong> {form.area}</p>}
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{isAr ? 'الهاتف:' : 'Phone:'}</strong> {form.primaryPhone}</p>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{isAr ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (optional)'}</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              placeholder={isAr ? 'أي معلومات إضافية تود مشاركتها معنا...' : "Any additional information you'd like to share..."}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
              {isAr ? '← السابق' : '← Back'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting
                ? (isAr ? 'جاري الإرسال...' : 'Submitting...')
                : (isAr ? '✓ إتمام التسجيل' : '✓ Register Vendor')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
