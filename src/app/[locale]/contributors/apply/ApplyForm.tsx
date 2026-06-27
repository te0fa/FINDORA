'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = [
  { value: 'field_scout',    icon: '🏪', en: 'Field Scout',     ar: 'مساهم ميداني',  descEn: 'Visit stores, record prices, cover local markets', descAr: 'زيارة متاجر، رصد أسعار، تغطية السوق المحلي' },
  { value: 'store_insider',  icon: '🔍', en: 'Store Insider',   ar: 'مطلع متجر',     descEn: 'Deep supplier intel, network connections',        descAr: 'معلومات عميقة عن الموردين، شبكة علاقات' },
  { value: 'casual',         icon: '🤝', en: 'Casual',          ar: 'مساهم عادي',    descEn: 'Share info and grow the network',                  descAr: 'شارك معلومات وكبّر الشبكة' },
]

const GOVERNORATES = [
  'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Red Sea', 'Beheira', 'Fayoum',
  'Gharbiya', 'Ismailia', 'Menofia', 'Minya', 'Qaliubiya', 'New Valley', 'Suez',
  'Aswan', 'Assiut', 'Beni Suef', 'Port Said', 'Damietta', 'Sharqia', 'South Sinai',
  'Kafr Al sheikh', 'Matrouh', 'Luxor', 'Qena', 'North Sinai', 'Sohag',
]

interface ApplyFormProps { locale: string }

export default function ApplyForm({ locale }: ApplyFormProps) {
  const router = useRouter()
  const isAr = locale === 'ar'
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    role: '',
    governorate: '',
    referral_code: '',
    agree_terms: false,
    agree_privacy: false,
  })

  const t = {
    title: isAr ? 'قدّم طلبك كمساهم' : 'Apply as a Contributor',
    step1_title: isAr ? 'اختار دورك' : 'Choose Your Role',
    step2_title: isAr ? 'بياناتك الشخصية' : 'Your Information',
    step3_title: isAr ? 'مراجعة وتأكيد' : 'Review & Confirm',
    name_label: isAr ? 'الاسم الكامل' : 'Full Name',
    phone_label: isAr ? 'رقم الهاتف' : 'Phone Number',
    gov_label: isAr ? 'المحافظة' : 'Governorate',
    ref_label: isAr ? 'كود الإحالة (اختياري)' : 'Referral Code (Optional)',
    ref_placeholder: isAr ? 'كود الشخص اللي وصّاك' : 'Code of who referred you',
    terms: isAr ? 'أوافق على الشروط والأحكام' : 'I agree to the Terms & Conditions',
    privacy: isAr ? 'أوافق على سياسة الخصوصية وجمع بصمة الجهاز' : 'I agree to Privacy Policy & device fingerprinting',
    next: isAr ? 'التالي' : 'Next',
    back: isAr ? 'رجوع' : 'Back',
    submit: isAr ? 'إرسال الطلب' : 'Submit Application',
    submitting: isAr ? 'جاري الإرسال...' : 'Submitting...',
    success_title: isAr ? '🎉 تم استلام طلبك!' : '🎉 Application Received!',
    success_body: isAr
      ? 'فريق HR هيراجع طلبك خلال 24-48 ساعة. هتوصلك إشعار على هاتفك.'
      : 'Our HR team will review your application within 24-48 hours. You will receive a notification.',
    role_required: isAr ? 'اختار دورك أولًا' : 'Please select a role first',
    fields_required: isAr ? 'أكمل جميع الحقول المطلوبة' : 'Please fill all required fields',
    terms_required: isAr ? 'يجب الموافقة على الشروط وسياسة الخصوصية' : 'You must agree to both Terms and Privacy Policy',
  }

  const [submitted, setSubmitted] = useState(false)

  function update(key: string, value: any) {
    setForm(f => ({ ...f, [key]: value }))
    setError('')
  }

  function validateStep(s: number): boolean {
    if (s === 1 && !form.role) { setError(t.role_required); return false }
    if (s === 2) {
      if (!form.full_name.trim() || !form.phone_number.trim()) { setError(t.fields_required); return false }
    }
    if (s === 3) {
      if (!form.agree_terms || !form.agree_privacy) { setError(t.terms_required); return false }
    }
    return true
  }

  function nextStep() {
    if (validateStep(step)) setStep(s => Math.min(3, s + 1))
  }

  async function submit() {
    if (!validateStep(3)) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contributors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Unknown error')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'hsl(220,15%,95%)', fontSize: 15, outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontSize: 13,
    color: 'hsl(220,10%,65%)', fontWeight: 500,
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>{t.success_title}</h2>
        <p style={{ color: 'hsl(220,10%,60%)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>{t.success_body}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>{t.title}</h1>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: n <= step ? 'hsl(258,89%,66%)' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Step 1: Role */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24 }}>{t.step1_title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.map(r => (
              <button key={r.value} onClick={() => update('role', r.value)} style={{
                padding: '18px 20px', borderRadius: 12, cursor: 'pointer',
                background: form.role === r.value ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${form.role === r.value ? 'hsl(258,89%,66%)' : 'rgba(255,255,255,0.08)'}`,
                color: 'hsl(220,15%,90%)', textAlign: isAr ? 'right' : 'left',
                transition: 'all 0.2s',
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  {r.icon} {isAr ? r.ar : r.en}
                </div>
                <div style={{ fontSize: 13, color: 'hsl(220,10%,60%)' }}>
                  {isAr ? r.descAr : r.descEn}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Info */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24 }}>{t.step2_title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>{t.name_label} *</label>
              <input value={form.full_name} onChange={e => update('full_name', e.target.value)}
                style={inputStyle} placeholder="Ahmed Ali" />
            </div>
            <div>
              <label style={labelStyle}>{t.phone_label} *</label>
              <input value={form.phone_number} onChange={e => update('phone_number', e.target.value)}
                style={inputStyle} placeholder="+201234567890" type="tel" />
            </div>
            <div>
              <label style={labelStyle}>{t.gov_label}</label>
              <select value={form.governorate} onChange={e => update('governorate', e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">{isAr ? 'اختار المحافظة' : 'Select governorate'}</option>
                {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t.ref_label}</label>
              <input value={form.referral_code} onChange={e => update('referral_code', e.target.value.toUpperCase())}
                style={inputStyle} placeholder={t.ref_placeholder} maxLength={12} />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24 }}>{t.step3_title}</h2>
          {/* Summary */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.09)', padding: 20, marginBottom: 24,
          }}>
            {[
              [isAr ? 'الدور' : 'Role', ROLES.find(r => r.value === form.role)?.[isAr ? 'ar' : 'en']],
              [isAr ? 'الاسم' : 'Name', form.full_name],
              [isAr ? 'الهاتف' : 'Phone', form.phone_number],
              form.governorate && [isAr ? 'المحافظة' : 'Governorate', form.governorate],
              form.referral_code && [isAr ? 'كود الإحالة' : 'Referral Code', form.referral_code],
            ].filter(Boolean).map(([k, v]: any) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'hsl(220,10%,55%)', fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{v}</span>
              </div>
            ))}
          </div>
          {/* Terms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {[
              { key: 'agree_terms', label: t.terms },
              { key: 'agree_privacy', label: t.privacy },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={(form as any)[key]}
                  onChange={e => update(key, e.target.checked)}
                  style={{ marginTop: 2, width: 18, height: 18, accentColor: 'hsl(258,89%,66%)' }} />
                <span style={{ fontSize: 14, color: 'hsl(220,10%,65%)', lineHeight: 1.5 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: 'hsl(0,84%,70%)', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12 }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'hsl(220,15%,80%)', fontWeight: 600, fontSize: 15,
          }}>{t.back}</button>
        )}
        {step < 3 ? (
          <button onClick={nextStep} style={{
            flex: 2, padding: '14px', borderRadius: 10, cursor: 'pointer',
            background: 'linear-gradient(135deg, hsl(258,89%,58%), hsl(258,89%,50%))',
            border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
          }}>{t.next}</button>
        ) : (
          <button onClick={submit} disabled={loading} style={{
            flex: 2, padding: '14px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'rgba(139,92,246,0.4)' : 'linear-gradient(135deg, hsl(258,89%,58%), hsl(258,89%,50%))',
            border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
          }}>
            {loading ? t.submitting : t.submit}
          </button>
        )}
      </div>
    </div>
  )
}
