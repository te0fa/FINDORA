'use client';
import React, { useState } from 'react';

const CATEGORIES = [
  { value: 'electronics', label_ar: 'إلكترونيات', label_en: 'Electronics' },
  { value: 'food_groceries', label_ar: 'مواد غذائية', label_en: 'Food & Groceries' },
  { value: 'clothing_fashion', label_ar: 'ملابس وموضة', label_en: 'Clothing & Fashion' },
  { value: 'home_furniture', label_ar: 'أثاث ومنزل', label_en: 'Home & Furniture' },
  { value: 'automotive', label_ar: 'سيارات وقطع غيار', label_en: 'Automotive' },
  { value: 'beauty_health', label_ar: 'تجميل وصحة', label_en: 'Beauty & Health' },
  { value: 'sports', label_ar: 'رياضة', label_en: 'Sports' },
  { value: 'services', label_ar: 'خدمات', label_en: 'Services' },
  { value: 'other', label_ar: 'أخرى', label_en: 'Other' },
];

const GOVERNORATES = ['القاهرة','الجيزة','الإسكندرية','الشرقية','الدقهلية','البحيرة','المنوفية','الغربية','القليوبية','كفر الشيخ','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح','شمال سيناء','جنوب سيناء','الإسماعيلية','السويس','بورسعيد','دمياط'];

interface MerchantRegisterClientProps { locale: string; }

export default function MerchantRegisterClient({ locale }: MerchantRegisterClientProps) {
  const isAr = locale === 'ar';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null);

  const [form, setForm] = useState({
    business_name_ar: '', business_name_en: '', business_category: '',
    phone_number: '', governorate: '', address_details: '', national_id: '',
  });

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSendOtp = async () => {
    if (!form.phone_number) return showToast(isAr ? 'أدخل رقم الهاتف' : 'Enter phone number', 'error');
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: form.phone_number, purpose: 'merchant_registration' }),
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Error', 'error');
      setOtpSent(true);
      if (data.devCode) setDevCode(data.devCode);
      showToast(isAr ? 'تم إرسال الكود! ✅' : 'OTP sent! ✅');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) return showToast(isAr ? 'أدخل الكود المكون من 6 أرقام' : 'Enter 6-digit code', 'error');
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: form.phone_number, code: otpCode, purpose: 'merchant_registration' }),
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Error', 'error');
      setOtpVerified(true);
      showToast(isAr ? 'تم التحقق من الهاتف ✅' : 'Phone verified ✅');
      setStep(3);
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!otpVerified) return showToast(isAr ? 'يجب التحقق من الهاتف أولاً' : 'Phone must be verified first', 'error');
    setLoading(true);
    try {
      const res = await fetch('/api/merchants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone_verified: true }),
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Error', 'error');
      showToast(isAr ? 'تم التسجيل! سيتم مراجعة طلبك ✅' : 'Registered! Your request is under review ✅');
      setTimeout(() => { window.location.href = `/${locale}/merchant/dashboard`; }, 2000);
    } finally { setLoading(false); }
  };

  const steps = [
    { num: 1, label_ar: 'بيانات النشاط', label_en: 'Business Info' },
    { num: 2, label_ar: 'التحقق من الهاتف', label_en: 'Phone Verification' },
    { num: 3, label_ar: 'المعلومات الإضافية', label_en: 'Additional Info' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220,25%,8%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Outfit','Cairo',sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '14px 20px', borderRadius: 12, background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, color: 'white', fontWeight: 600, backdropFilter: 'blur(12px)' }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 8px' }}>{isAr ? 'سجّل نشاطك التجاري' : 'Register Your Business'}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>{isAr ? 'انضم كتاجر وابدأ في استقبال الطلبات' : 'Join as a merchant and start receiving orders'}</p>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {steps.map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', background: step >= s.num ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)', border: step >= s.num ? 'none' : '1px solid rgba(255,255,255,0.12)', color: 'white', transition: 'all 0.3s' }}>{s.num}</div>
              <span style={{ fontSize: '0.78rem', color: step >= s.num ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{isAr ? s.label_ar : s.label_en}</span>
              {s.num < 3 && <div style={{ width: 24, height: 2, background: step > s.num ? '#6366f1' : 'rgba(255,255,255,0.1)', borderRadius: 2, margin: '0 4px' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28 }}>
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800 }}>{isAr ? '📋 بيانات النشاط التجاري' : '📋 Business Information'}</h2>
              {[
                { key: 'business_name_ar', label_ar: 'اسم النشاط بالعربية', label_en: 'Business Name (Arabic)', placeholder: 'مثال: متجر الأمل' },
                { key: 'business_name_en', label_ar: 'اسم النشاط بالإنجليزية', label_en: 'Business Name (English)', placeholder: 'e.g. Al-Amal Store' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 600 }}>{isAr ? f.label_ar : f.label_en}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 600 }}>{isAr ? 'فئة النشاط' : 'Business Category'}</label>
                <select value={form.business_category} onChange={e => setForm(p => ({ ...p, business_category: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: 'rgba(30,30,50,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none' }}>
                  <option value="">{isAr ? 'اختر الفئة' : 'Select category'}</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{isAr ? c.label_ar : c.label_en}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 600 }}>{isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
                <input value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="01xxxxxxxxx" dir="ltr" style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={() => { if (!form.business_name_ar || !form.business_category || !form.phone_number) return showToast(isAr ? 'أكمل البيانات المطلوبة' : 'Fill required fields', 'error'); setStep(2); }} style={{ padding: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: 8 }}>
                {isAr ? 'التالي ←' : 'Next →'}
              </button>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>📱</div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{isAr ? 'تأكيد رقم الهاتف' : 'Verify Phone Number'}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>{isAr ? `سنرسل كود تأكيد إلى ${form.phone_number}` : `We'll send a code to ${form.phone_number}`}</p>
              {devCode && <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: '0.85rem', color: '#f59e0b' }}>🔧 Dev Mode — Code: <strong>{devCode}</strong></div>}
              {!otpSent ? (
                <button onClick={handleSendOtp} disabled={loading} style={{ padding: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? '...' : (isAr ? 'إرسال الكود' : 'Send Code')}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" dir="ltr" maxLength={6} style={{ textAlign: 'center', padding: '16px', fontSize: '1.5rem', letterSpacing: '0.4em', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontWeight: 800 }} />
                  <button onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 6} style={{ padding: '14px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 800, cursor: 'pointer', opacity: (loading || otpCode.length !== 6) ? 0.6 : 1 }}>
                    {loading ? '...' : (isAr ? 'تأكيد الكود' : 'Verify Code')}
                  </button>
                  <button onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.85rem' }}>{isAr ? 'إعادة الإرسال' : 'Resend'}</button>
                </div>
              )}
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.85rem' }}>{isAr ? '← رجوع' : '← Back'}</button>
            </div>
          )}

          {/* Step 3: Additional Info + Submit */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800 }}>{isAr ? '📍 معلومات إضافية' : '📍 Additional Information'}</h2>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 600 }}>{isAr ? 'المحافظة' : 'Governorate'}</label>
                <select value={form.governorate} onChange={e => setForm(p => ({ ...p, governorate: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: 'rgba(30,30,50,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none' }}>
                  <option value="">{isAr ? 'اختر المحافظة' : 'Select governorate'}</option>
                  {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 600 }}>{isAr ? 'عنوان تفصيلي (اختياري)' : 'Detailed Address (optional)'}</label>
                <textarea value={form.address_details} onChange={e => setForm(p => ({ ...p, address_details: e.target.value }))} rows={3} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 600 }}>{isAr ? 'رقم البطاقة الوطنية (اختياري)' : 'National ID (optional)'}</label>
                <input value={form.national_id} onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} placeholder="xxxxxxxxxxxxxxx" dir="ltr" style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                ✅ {isAr ? 'تم التحقق من الهاتف' : 'Phone verified'} — {form.phone_number}
              </div>
              <button onClick={handleSubmit} disabled={loading} style={{ padding: '16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                {loading ? (isAr ? 'جاري التسجيل...' : 'Registering...') : (isAr ? '🚀 إرسال طلب التسجيل' : '🚀 Submit Registration')}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: 20 }}>
          {isAr ? 'بالتسجيل توافق على شروط الاستخدام وسياسة الخصوصية' : 'By registering you agree to Terms of Use and Privacy Policy'}
        </p>
      </div>
    </div>
  );
}
