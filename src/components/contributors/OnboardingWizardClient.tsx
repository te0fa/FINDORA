'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingWizardClientProps {
  locale: string
  isActive?: boolean
}

export default function OnboardingWizardClient({ locale, isActive = true }: OnboardingWizardClientProps) {
  const isAr = locale === 'ar'
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    role: '',
    fullName: '',
    phone: '',
    city: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleNext = () => {
    setStep(prev => prev + 1)
  }

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/contributors/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          phone_number: formData.phone,
          role: formData.role,
          governorate: formData.city,
          referral_code: ''
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || (isAr ? 'فشلت عملية التقديم' : 'Failed to submit application'))
      setStep(6) // Success step
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="wizard-container" dir={isAr ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .wizard-container {
          max-width: 600px;
          margin: 40px auto;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          font-family: sans-serif;
          width: 100%;
        }
        .progress-bar-bg {
          height: 6px;
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
        }
        .progress-bar-fill {
          height: 100%;
          background: hsl(258, 89%, 66%);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .wizard-content {
          padding: 40px;
        }
        .step-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 24px;
        }
        .role-btn {
          display: flex;
          align-items: center;
          gap: 20px;
          width: 100%;
          padding: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: inherit;
          margin-bottom: 16px;
        }
        .role-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(139, 92, 246, 0.4);
          background: rgba(139, 92, 246, 0.05);
        }
        .role-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .role-desc {
          font-size: 0.82rem;
          color: hsl(220, 10%, 65%);
        }
        .input-group {
          margin-bottom: 20px;
        }
        .input-label {
          display: block;
          font-size: 0.85rem;
          color: hsl(220, 10%, 60%);
          margin-bottom: 8px;
          font-weight: 600;
        }
        .text-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          color: #fff;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .text-input:focus {
          border-color: hsl(258, 89%, 66%);
        }
        .btn-row {
          display: flex;
          gap: 16px;
          margin-top: 32px;
        }
        .btn-back {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-back:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .btn-next {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          background: hsl(258, 89%, 66%);
          border: none;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-next:hover {
          background: hsl(258, 89%, 70%);
        }
        .btn-next:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .upload-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 160px;
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-area:hover {
          border-color: hsl(258, 89%, 66%);
          background: rgba(139, 92, 246, 0.03);
        }
      `.replace(/\r\n/g, '\n') }} />
      
      {/* Progress Bar */}
      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${(isActive ? (step / 5) : (step / 2)) * 100}%` }}
        />
      </div>

      <div className="wizard-content">
        
        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <h2 className="step-title">
              {isActive 
                ? (isAr ? 'اختر دورك المطلوب للعمل' : 'Choose Your Role')
                : (isAr ? 'سجل اهتمامك: اختر الدور المفضل لديك' : 'Register Interest: Choose Preferred Role')
              }
            </h2>
            
            <div>
              <button 
                onClick={() => { setFormData({ ...formData, role: 'field_scout' }); handleNext() }}
                className="role-btn"
                style={{ borderColor: formData.role === 'field_scout' ? 'hsl(258,89%,66%)' : 'rgba(255,255,255,0.08)' }}
              >
                <span style={{ fontSize: '2.5rem' }}>👨‍🔧</span>
                <div>
                  <h3 className="role-title">{isAr ? 'مندوب ميداني (Field Scout)' : 'Field Scout'}</h3>
                  <p className="role-desc">{isAr ? 'شغل ميداني وبحث أسعار حقيقية بالأسواق (كاش + بونص)' : 'Field work & price research (Cash + Bonus)'}</p>
                </div>
              </button>

              <button 
                onClick={() => { setFormData({ ...formData, role: 'store_insider' }); handleNext() }}
                className="role-btn"
                style={{ borderColor: formData.role === 'store_insider' ? 'hsl(43,96%,56%)' : 'rgba(255,255,255,0.08)' }}
              >
                <span style={{ fontSize: '2.5rem' }}>🏪</span>
                <div>
                  <h3 className="role-title">{isAr ? 'موظف معرض (Store Insider)' : 'Store Insider'}</h3>
                  <p className="role-desc">{isAr ? 'موظف بمعرض أو محل لزيادة المبيعات (عمولة + نقاط)' : 'Store employee (Commission + Points)'}</p>
                </div>
              </button>

              <button 
                onClick={() => { setFormData({ ...formData, role: 'casual' }); handleNext() }}
                className="role-btn"
                style={{ borderColor: formData.role === 'casual' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)' }}
              >
                <span style={{ fontSize: '2.5rem' }}>👤</span>
                <div>
                  <h3 className="role-title">{isAr ? 'مساهم عادي (Casual User)' : 'Casual User'}</h3>
                  <p className="role-desc">{isAr ? 'مشارك عادي بأسعار وعروض (كاش حقيقي بعد 10 مهام)' : 'Casual participant (Cash payout after 10 tasks)'}</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div>
            <h2 className="step-title">
              {isActive 
                ? (isAr ? 'البيانات الشخصية والأساسية' : 'Basic Information')
                : (isAr ? 'بيانات تسجيل الاهتمام' : 'Registration of Interest')
              }
            </h2>
            
            <div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="text-input" 
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'رقم الهاتف (الواتساب)' : 'Phone Number'}</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="text-input" 
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">{isAr ? 'المحافظة / المدينة' : 'Governorate / City'}</label>
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="text-input" 
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: 8, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <div className="btn-row">
              <button onClick={handleBack} className="btn-back">{isAr ? 'رجوع' : 'Back'}</button>
              {isActive ? (
                <button 
                  onClick={handleNext} 
                  disabled={!formData.fullName || !formData.phone || !formData.city}
                  className="btn-next"
                >
                  {isAr ? 'التالي' : 'Next'}
                </button>
              ) : (
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !formData.fullName || !formData.phone || !formData.city}
                  className="btn-next"
                  style={{ background: 'hsl(152,69%,51%)' }}
                >
                  {isSubmitting ? '...' : (isAr ? 'سجل اهتمامي الآن 🤝' : 'Submit Interest 🤝')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Document Upload (Active Mode only) */}
        {step === 3 && isActive && (
          <div>
            <h2 className="step-title">{isAr ? 'رفع مستند تحقيق الشخصية' : 'Upload Documents'}</h2>
            <p style={{ fontSize: '0.85rem', color: 'hsl(220,10%,60%)', marginBottom: 24, lineHeight: 1.5 }}>
              {formData.role === 'store_insider' 
                ? (isAr ? 'برجاء رفع كارنيه العمل أو بطاقة ضريبية أو ما يثبت عملك بالمعرض لتوثيق الحساب.' : 'Please upload your store ID or proof of employment.')
                : (isAr ? 'برجاء رفع صورة البطاقة الشخصية (الوجه والأمام) للتحقق من هويتك وتفعيل المحفظة.' : 'Please upload a valid National ID.')}
            </p>
            
            <div className="upload-area">
              <span style={{ fontSize: '3rem' }}>📄</span>
              <span style={{ marginTop: 8, fontSize: '0.85rem', color: 'hsl(220,10%,60%)', fontWeight: 'bold' }}>{isAr ? 'اضغط لرفع صورة المستند' : 'Click to upload file'}</span>
            </div>

            <div className="btn-row">
              <button onClick={handleBack} className="btn-back">{isAr ? 'رجوع' : 'Back'}</button>
              <button onClick={handleNext} className="btn-next">
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: AI Questions (Active Mode only) */}
        {step === 4 && isActive && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', width: 36, height: 36, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', color: 'hsl(258,89%,66%)', justifyContent: 'center', alignItems: 'center', fontSize: '1.25rem' }}>🤖</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>{isAr ? 'أسئلة سريعة للذكاء الاصطناعي (AI HR)' : 'Quick Interview (AI HR)'}</h2>
            </div>
            
            <div>
              {formData.role === 'field_scout' && (
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'ما هي أكثر المناطق التجارية التي تعرفها جيداً ويمكنك جلب أسعار منها؟' : 'Which area are you most familiar with for price hunting?'}
                  </label>
                  <textarea 
                    className="text-input" 
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}
              {formData.role === 'store_insider' && (
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'ما هي الأقسام والمنتجات الأساسية التي يبيعها معرضك/محلك؟' : 'What type of products does your store sell?'}
                  </label>
                  <textarea 
                    className="text-input" 
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}
              {formData.role === 'casual' && (
                <div className="input-group">
                  <label className="input-label">
                    {isAr ? 'كيف تصل عادة لعروض الأسعار والخصومات في منطقتك؟' : 'How do you usually find good deals?'}
                  </label>
                  <textarea 
                    className="text-input" 
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: 8, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <div className="btn-row">
              <button onClick={handleBack} className="btn-back">{isAr ? 'رجوع' : 'Back'}</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-next" style={{ background: 'hsl(152,69%,51%)' }}>
                {isSubmitting ? '...' : (isAr ? 'إرسال لـ HR واعتماد حسابي' : 'Submit Application')}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 6 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#22c55e', justifyContent: 'center', alignItems: 'center', fontSize: '3rem', margin: '0 auto 24px' }}>✅</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
              {isActive 
                ? (isAr ? 'تم تقديم طلبك بنجاح!' : 'Application Submitted!')
                : (isAr ? 'تم تسجيل اهتمامك بنجاح! 🤝' : 'Interest Waitlist Registered!')
              }
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'hsl(220,10%,65%)', lineHeight: 1.6, maxWidth: 440, margin: '0 auto 32px' }}>
              {isActive 
                ? (isAr 
                    ? 'طلبك الآن قيد المراجعة الفورية من قبل فريق HR والتحقق الذكي. سيتم إرسال إشعار لك بمجرد اعتماده لتتمكن من تصفح الطلبات والبدء في الكسب.' 
                    : 'Your application is under review by our AI HR and team. You will be notified soon.')
                : (isAr 
                    ? 'لقد انضممت بنجاح لقائمة الانتظار وحملة تسجيل الاهتمام. سيقوم فريقنا بالتواصل معك وإعطاء حسابك الأولوية الكبرى بمجرد فتح باب التسجيل الفعلي للمناديب.' 
                    : 'You have joined the priority waiting list. We will notify you as soon as recruitment opens.')
              }
            </p>
            <div>
              <button 
                onClick={() => router.push(`/${locale}/contributors/dashboard`)}
                className="btn-next"
                style={{ borderRadius: '999px', padding: '12px 32px', display: 'inline-block', width: 'auto' }}
              >
                {isAr ? 'الذهاب للوحة التحكم' : 'Go to Dashboard'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
