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

  const update = (field: keyof VendorRegistrationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
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
      <div className="vendor-success">
        <div className="vendor-success__icon">✅</div>
        <h2 className="vendor-success__title">
          {isAr ? 'تم استلام طلبك!' : 'Request Received!'}
        </h2>
        <p className="vendor-success__body">
          {isAr
            ? 'شكراً لتسجيلك كمورد في Findora. سيتواصل معك فريقنا خلال 2-3 أيام عمل للتحقق من بياناتك وتفعيل حسابك.'
            : 'Thank you for registering as a vendor with Findora. Our team will contact you within 2-3 business days to verify your information and activate your account.'}
        </p>
        <button
          className="vendor-success__btn"
          onClick={() => router.push(`/${locale}`)}
        >
          {isAr ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    )
  }

  return (
    <div className="vendor-reg">
      {/* Progress Bar */}
      <div className="vendor-reg__progress" aria-label="Registration progress">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`vendor-reg__step ${step >= s ? 'vendor-reg__step--active' : ''} ${step > s ? 'vendor-reg__step--done' : ''}`}
          >
            <span className="vendor-reg__step-num">{step > s ? '✓' : s}</span>
            <span className="vendor-reg__step-label">
              {s === 1 ? (isAr ? 'بيانات المنشأة' : 'Business Info') :
               s === 2 ? (isAr ? 'العنوان والتواصل' : 'Location & Contact') :
                         (isAr ? 'المراجعة والإرسال' : 'Review & Submit')}
            </span>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="vendor-reg__error" role="alert">{error}</div>
      )}

      {/* Step 1: Business Info */}
      {step === 1 && (
        <div className="vendor-reg__form">
          <h2 className="vendor-reg__step-title">
            {isAr ? 'بيانات المنشأة التجارية' : 'Business Information'}
          </h2>

          <div className="vendor-reg__field">
            <label htmlFor="businessNameAr">{isAr ? 'اسم المنشأة (عربي) *' : 'Business Name (Arabic) *'}</label>
            <input
              id="businessNameAr"
              type="text"
              value={form.businessNameAr}
              onChange={(e) => update('businessNameAr', e.target.value)}
              placeholder={isAr ? 'مثال: مؤسسة الأمل للتجارة' : 'e.g. Al-Amal Trading'}
              dir="rtl"
            />
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="businessNameEn">{isAr ? 'اسم المنشأة (انجليزي)' : 'Business Name (English)'}</label>
            <input
              id="businessNameEn"
              type="text"
              value={form.businessNameEn}
              onChange={(e) => update('businessNameEn', e.target.value)}
              placeholder="e.g. Al-Amal Trading Co."
              dir="ltr"
            />
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="merchantType">{isAr ? 'نوع المنشأة *' : 'Business Type *'}</label>
            <select
              id="merchantType"
              value={form.merchantType}
              onChange={(e) => update('merchantType', e.target.value)}
            >
              <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
              {MERCHANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {isAr ? t.labelAr : t.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="category">{isAr ? 'الفئة الرئيسية *' : 'Main Category *'}</label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
            >
              <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button className="vendor-reg__btn vendor-reg__btn--primary" onClick={handleNext}>
            {isAr ? 'التالي →' : 'Next →'}
          </button>
        </div>
      )}

      {/* Step 2: Location & Contact */}
      {step === 2 && (
        <div className="vendor-reg__form">
          <h2 className="vendor-reg__step-title">
            {isAr ? 'العنوان وبيانات التواصل' : 'Location & Contact Details'}
          </h2>

          <div className="vendor-reg__field">
            <label htmlFor="governorate">{isAr ? 'المحافظة *' : 'Governorate *'}</label>
            <select
              id="governorate"
              value={form.governorate}
              onChange={(e) => update('governorate', e.target.value)}
            >
              <option value="">{isAr ? '-- اختر المحافظة --' : '-- Select Governorate --'}</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="vendor-reg__row">
            <div className="vendor-reg__field">
              <label htmlFor="city">{isAr ? 'المدينة / المركز' : 'City / District'}</label>
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder={isAr ? 'مثال: مدينة نصر' : 'e.g. Nasr City'}
              />
            </div>
            <div className="vendor-reg__field">
              <label htmlFor="area">{isAr ? 'الحي / المنطقة' : 'Area / Neighborhood'}</label>
              <input
                id="area"
                type="text"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                placeholder={isAr ? 'مثال: الحي الأول' : 'e.g. Zone 1'}
              />
            </div>
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="address">{isAr ? 'العنوان التفصيلي' : 'Full Address'}</label>
            <input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder={isAr ? 'رقم العقار، الشارع...' : 'Building number, street name...'}
            />
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="primaryPhone">{isAr ? 'رقم الهاتف الأساسي *' : 'Primary Phone *'}</label>
            <input
              id="primaryPhone"
              type="tel"
              value={form.primaryPhone}
              onChange={(e) => update('primaryPhone', e.target.value)}
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="secondaryPhone">{isAr ? 'رقم هاتف إضافي' : 'Secondary Phone'}</label>
            <input
              id="secondaryPhone"
              type="tel"
              value={form.secondaryPhone}
              onChange={(e) => update('secondaryPhone', e.target.value)}
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="email">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="info@business.com"
              dir="ltr"
            />
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="website">{isAr ? 'الموقع الإلكتروني' : 'Website'}</label>
            <input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder="https://www.yourbusiness.com"
              dir="ltr"
            />
          </div>

          <div className="vendor-reg__buttons">
            <button className="vendor-reg__btn vendor-reg__btn--secondary" onClick={() => setStep(1)}>
              {isAr ? '← السابق' : '← Back'}
            </button>
            <button className="vendor-reg__btn vendor-reg__btn--primary" onClick={handleNext}>
              {isAr ? 'التالي →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="vendor-reg__form">
          <h2 className="vendor-reg__step-title">
            {isAr ? 'مراجعة البيانات وإرسال الطلب' : 'Review & Submit'}
          </h2>

          <div className="vendor-reg__review">
            <div className="vendor-reg__review-group">
              <h3>{isAr ? 'بيانات المنشأة' : 'Business Info'}</h3>
              <p><strong>{isAr ? 'الاسم بالعربي:' : 'Arabic Name:'}</strong> {form.businessNameAr}</p>
              {form.businessNameEn && <p><strong>{isAr ? 'الاسم بالانجليزي:' : 'English Name:'}</strong> {form.businessNameEn}</p>}
              <p><strong>{isAr ? 'نوع المنشأة:' : 'Type:'}</strong> {MERCHANT_TYPES.find(t => t.value === form.merchantType)?.[isAr ? 'labelAr' : 'labelEn']}</p>
              <p><strong>{isAr ? 'الفئة:' : 'Category:'}</strong> {form.category}</p>
            </div>

            <div className="vendor-reg__review-group">
              <h3>{isAr ? 'العنوان والتواصل' : 'Location & Contact'}</h3>
              <p><strong>{isAr ? 'المحافظة:' : 'Governorate:'}</strong> {form.governorate}</p>
              {form.city && <p><strong>{isAr ? 'المدينة:' : 'City:'}</strong> {form.city}</p>}
              {form.area && <p><strong>{isAr ? 'المنطقة:' : 'Area:'}</strong> {form.area}</p>}
              <p><strong>{isAr ? 'الهاتف:' : 'Phone:'}</strong> {form.primaryPhone}</p>
              {form.email && <p><strong>{isAr ? 'البريد:' : 'Email:'}</strong> {form.email}</p>}
            </div>
          </div>

          <div className="vendor-reg__field">
            <label htmlFor="notes">{isAr ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (optional)'}</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={4}
              placeholder={isAr ? 'أي معلومات إضافية تود مشاركتها معنا...' : "Any additional information you'd like to share..."}
            />
          </div>

          <div className="vendor-reg__buttons">
            <button className="vendor-reg__btn vendor-reg__btn--secondary" onClick={() => setStep(2)}>
              {isAr ? '← السابق' : '← Back'}
            </button>
            <button
              className="vendor-reg__btn vendor-reg__btn--submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? (isAr ? 'جاري الإرسال...' : 'Submitting...')
                : (isAr ? '✓ إرسال الطلب' : '✓ Submit Request')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
