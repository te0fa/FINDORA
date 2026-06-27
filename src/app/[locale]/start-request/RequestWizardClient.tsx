'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RequestWizardClient({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    productName: '',
    targetLocation: '',
    maxPrice: '',
    notes: '',
    customerName: '',
    customerPhone: '',
    isBusiness: false,
    companyName: '',
    crNumber: '',
    taxNumber: '',
    quantity: '1'
  })
  const [conciergeText, setConciergeText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [aiError, setAiError] = useState('')

  const handleConciergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conciergeText.trim()) return

    setIsParsing(true)
    setAiError('')

    try {
      const count = Number(localStorage.getItem('findora_ai_concierge_count') || '0')
      if (count >= 3) {
        setAiError(isAr 
          ? 'لقد استنفدت الحد المجاني لطلب المساعد الذكي (3 طلبات). يرجى الترقية إلى الباقة المدفوعة للحصول على بحث غير محدود!' 
          : 'You have reached the free AI Concierge limit (3 requests). Please upgrade to Premium AI Sourcing for unlimited searches!')
        setIsParsing(false)
        return
      }

      const res = await fetch('/api/ai/parse-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: conciergeText })
      })

      const data = await res.json()
      if (res.ok && data.success && data.parsed) {
        const parsed = data.parsed
        setFormData({
          category: parsed.category || '',
          productName: parsed.productName || '',
          targetLocation: parsed.targetLocation || '',
          maxPrice: parsed.maxPrice ? String(parsed.maxPrice) : '',
          notes: parsed.notes || '',
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          isBusiness: false,
          companyName: '',
          crNumber: '',
          taxNumber: '',
          quantity: '1'
        })
        
        localStorage.setItem('findora_ai_concierge_count', String(count + 1))
        setStep(4)
      } else {
        setAiError(data.error || (isAr ? 'عذراً، فشل المساعد الذكي في تحليل طلبك. يرجى ملء النموذج يدوياً.' : 'AI failed to parse request. Please fill the form manually.'))
      }
    } catch (err) {
      setAiError(isAr ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.')
    } finally {
      setIsParsing(false)
    }
  }

  const categories = [
    { id: 'electronics', label: isAr ? 'إلكترونيات وموبايلات' : 'Electronics & Mobiles', icon: '📱' },
    { id: 'appliances', label: isAr ? 'أجهزة منزلية' : 'Home Appliances', icon: '🏠' },
    { id: 'automotive', label: isAr ? 'سيارات وقطع غيار' : 'Automotive', icon: '🚗' },
    { id: 'furniture', label: isAr ? 'أثاث وديكور' : 'Furniture & Decor', icon: '🪑' },
    { id: 'services', label: isAr ? 'خدمات وتشطيب' : 'Services & Finishing', icon: '🔧' }
  ]

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => Math.max(1, s - 1))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Calls the Customer Request API we built earlier
      const res = await fetch('/api/customers/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      
      if (res.ok) {
        // Route to the dashboard with the new request ID (Guest mode)
        router.push(`/${locale}/customer/dashboard?requestId=${data.requestId}`)
      } else {
        alert(data.error || 'Failed to submit request')
        setIsSubmitting(false)
      }
    } catch (err) {
      alert('Network error')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="wizard-container" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Decorative Glow */}
      <div className="wizard-glow-top"></div>
      <div className="wizard-glow-bottom"></div>

      {/* Header */}
      <div className="wizard-header relative z-10">
        <Link href={`/${locale}`} className="wizard-back-link">
          {isAr ? '← العودة للرئيسية' : '← Back to Home'}
        </Link>
        <h1 className="wizard-title">
          {isAr ? 'ابحث عن ما تريد 🎯' : 'Find What You Need 🎯'}
        </h1>
        <div className="wizard-progress-bar">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`wizard-progress-step ${s <= step ? 'is-active' : ''}`}></div>
          ))}
        </div>
      </div>

      {/* Form Steps */}
      <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="relative z-10">
        
        {/* STEP 1: Category */}
        {step === 1 && (
          <div className="wizard-step-panel">
            {/* AI Concierge Assistant Card */}
            <div className="wizard-ai-card">
              <div className="wizard-ai-header">
                <span className="wizard-ai-emoji">🔮</span>
                <div className="wizard-ai-titles">
                  <h3 className="wizard-ai-title">
                    {isAr ? 'المساعد الذكي للطلبات (AI Concierge)' : 'AI Concierge Sourcing Assistant'}
                  </h3>
                  <p className="wizard-ai-subtitle">
                    {isAr 
                      ? 'اكتب ما تبحث عنه باللغة الطبيعية وسنقوم بملء النموذج والبحث بدلاً عنك فوراً.'
                      : 'Type what you want in natural language and we will auto-fill and search for you instantly.'}
                  </p>
                </div>
              </div>
              
              <div className="wizard-ai-body">
                <textarea
                  value={conciergeText}
                  onChange={e => setConciergeText(e.target.value)}
                  disabled={isParsing}
                  rows={2}
                  className="wizard-textarea"
                  placeholder={isAr 
                    ? "عايز تكييف 1.5 حصان في حدود 20 ألف جنيه في القاهرة..."
                    : "I want a 1.5 HP air conditioner around 20k EGP in Cairo..."}
                />
                
                {aiError && (
                  <div className="wizard-error-banner">
                    ⚠️ {aiError}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleConciergeSubmit}
                  disabled={isParsing || !conciergeText.trim()}
                  className="wizard-btn-concierge"
                >
                  {isParsing ? (
                    <>
                      <span className="wizard-spinner"></span>
                      {isAr ? 'جاري فك وتحليل الطلب...' : 'Parsing Sourcing Request...'}
                    </>
                  ) : (
                    <>
                      {isAr ? 'خلوا Findora تدورلي 🔮' : 'Let Findora Search For Me 🔮'}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="wizard-divider">
              <div className="wizard-divider-line"></div>
              <span className="wizard-divider-text">
                {isAr ? 'أو حدد الفئة يدوياً' : 'Or select category manually'}
              </span>
              <div className="wizard-divider-line"></div>
            </div>

            <h2 className="wizard-step-title">{isAr ? 'ماذا تبحث عنه؟' : 'What are you looking for?'}</h2>
            <div className="wizard-categories-grid">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setFormData({ ...formData, category: cat.id }); setStep(2); }}
                  className="wizard-category-btn"
                >
                  <div className="wizard-category-icon">{cat.icon}</div>
                  <div className="wizard-category-label">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: The Item */}
        {step === 2 && (
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'تفاصيل الطلب' : 'Request Details'}</h2>
            
            <div className="wizard-form-group">
              <label className="wizard-label">
                {isAr ? 'اسم المنتج أو الخدمة بدقة' : 'Exact Product or Service Name'}
              </label>
              <input 
                required 
                autoFocus
                value={formData.productName} 
                onChange={e => setFormData({...formData, productName: e.target.value})} 
                className="wizard-input" 
                placeholder={isAr ? "مثال: آيفون 15 برو ماكس 256 جيجا" : "e.g. iPhone 15 Pro Max 256GB"} 
              />
            </div>

            {/* B2B Toggle */}
            <div className="wizard-toggle-container">
              <input
                type="checkbox"
                id="isBusiness"
                checked={formData.isBusiness}
                onChange={e => setFormData({ ...formData, isBusiness: e.target.checked })}
                className="wizard-checkbox-input"
              />
              <label htmlFor="isBusiness" className="wizard-checkbox-label">
                {isAr ? '🏢 طلب شراء لشركة / مؤسسة (B2B Request)' : '🏢 Corporate / B2B Sourcing Request'}
              </label>
            </div>

            {/* B2B Inputs */}
            {formData.isBusiness && (
              <div className="wizard-b2b-panel">
                <h3 className="wizard-b2b-title">
                  {isAr ? 'تفاصيل الشركة والمشتريات' : 'Company & Procurement Details'}
                </h3>
                
                <div className="wizard-grid-2">
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">
                      {isAr ? 'اسم الشركة *' : 'Company Name *'}
                    </label>
                    <input
                      required
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      className="wizard-input-sm"
                      placeholder={isAr ? "مثال: شركة فايندورا للتجارة" : "e.g. Findora Trading Co."}
                    />
                  </div>

                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">
                      {isAr ? 'الكمية المطلوبة *' : 'Required Quantity *'}
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                      className="wizard-input-sm"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="wizard-grid-2">
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">
                      {isAr ? 'رقم السجل التجاري *' : 'Commercial Register (CR) Number *'}
                    </label>
                    <input
                      required
                      value={formData.crNumber}
                      onChange={e => setFormData({ ...formData, crNumber: e.target.value })}
                      className="wizard-input-sm"
                      placeholder={isAr ? "السجل التجاري المكون من 6-7 أرقام" : "6-7 digit CR Number"}
                    />
                  </div>

                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">
                      {isAr ? 'الرقم الضريبي *' : 'Tax Registration Number *'}
                    </label>
                    <input
                      required
                      value={formData.taxNumber}
                      onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                      className="wizard-input-sm"
                      placeholder={isAr ? "الرقم الضريبي المكون من 9 أرقام" : "9 digit Tax ID"}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="wizard-form-group">
              <label className="wizard-label">
                {isAr ? 'أي ملاحظات إضافية؟ (اختياري)' : 'Any additional notes? (Optional)'}
              </label>
              <textarea 
                rows={3}
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                className="wizard-textarea" 
                placeholder={isAr ? "مثال: يفضل اللون الأسود، أو أريد جهاز جديد بضمان محلي" : "e.g. Prefer black color, must have local warranty"} 
              />
            </div>

            <div className="wizard-actions">
              <button type="button" onClick={prevStep} className="wizard-btn-secondary">
                {isAr ? 'رجوع' : 'Back'}
              </button>
              <button 
                type="submit" 
                disabled={!formData.productName || (formData.isBusiness && (!formData.companyName || !formData.crNumber || !formData.taxNumber || !formData.quantity))} 
                className="wizard-btn-primary"
              >
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Location & Budget */}
        {step === 3 && (
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'المكان والميزانية' : 'Location & Budget'}</h2>
            
            <div className="wizard-form-group">
              <label className="wizard-label">
                {isAr ? 'في أي منطقة تبحث؟' : 'Which area are you searching in?'}
              </label>
              <input 
                required 
                autoFocus
                value={formData.targetLocation} 
                onChange={e => setFormData({...formData, targetLocation: e.target.value})} 
                className="wizard-input" 
                placeholder={isAr ? "مثال: المعادي، القاهرة" : "e.g. Maadi, Cairo"} 
              />
            </div>

            <div className="wizard-form-group">
              <label className="wizard-label">
                {isAr ? 'أقصى ميزانية (EGP) - اختياري' : 'Maximum Budget (EGP) - Optional'}
              </label>
              <input 
                type="number"
                value={formData.maxPrice} 
                onChange={e => setFormData({...formData, maxPrice: e.target.value})} 
                className="wizard-input" 
                placeholder="0.00" 
              />
              <p className="wizard-input-hint">
                {isAr ? 'إذا تركتها فارغة، سنحضر لك أرخص الأسعار في السوق.' : 'If left blank, we will find the absolute lowest prices available.'}
              </p>
            </div>

            <div className="wizard-actions">
              <button type="button" onClick={prevStep} className="wizard-btn-secondary">
                {isAr ? 'رجوع' : 'Back'}
              </button>
              <button type="submit" disabled={!formData.targetLocation} className="wizard-btn-primary">
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Contact & Upsell */}
        {step === 4 && (
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'الخطوة الأخيرة 🚀' : 'Final Step 🚀'}</h2>
            
            {/* The Upsell Banner */}
            <div className="wizard-upsell-banner">
              <div className="wizard-upsell-emoji">🎁</div>
              <div className="wizard-upsell-content">
                <h4 className="wizard-upsell-title">{isAr ? 'احصل على خدمة "المشتريات العادية" مجاناً!' : 'Get "Everyday Purchase" service for FREE!'}</h4>
                <p className="wizard-upsell-text">
                  {isAr ? 'إذا أنشأت حساباً مجانياً الآن، ستحصل على بحث مجاني تماماً. أو يمكنك الاستمرار كزائر برقم الهاتف فقط.' : 'If you create a free account now, this search is on us. Or you can continue as a guest with just your phone number.'}
                </p>
                <Link href={`/${locale}/auth/signup`} className="wizard-upsell-link">
                  {isAr ? 'إنشاء حساب والحصول على العرض' : 'Create Account & Claim Offer'}
                </Link>
              </div>
            </div>

            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label className="wizard-label">
                  {isAr ? 'الاسم' : 'Your Name'}
                </label>
                <input 
                  required 
                  autoFocus
                  value={formData.customerName} 
                  onChange={e => setFormData({...formData, customerName: e.target.value})} 
                  className="wizard-input" 
                />
              </div>
              <div className="wizard-form-group">
                <label className="wizard-label">
                  {isAr ? 'رقم الهاتف (لإرسال العروض)' : 'Phone Number (to send offers)'}
                </label>
                <input 
                  required 
                  type="tel"
                  value={formData.customerPhone} 
                  onChange={e => setFormData({...formData, customerPhone: e.target.value})} 
                  className="wizard-input" 
                />
              </div>
            </div>

            <div className="wizard-actions wizard-footer-actions">
              <button type="button" onClick={prevStep} disabled={isSubmitting} className="wizard-btn-secondary">
                {isAr ? 'رجوع' : 'Back'}
              </button>
              <button type="submit" disabled={isSubmitting || !formData.customerName || !formData.customerPhone} className="wizard-btn-submit">
                {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'أرسل الطلب الآن' : 'Submit Request')}
              </button>
            </div>
          </div>
        )}

      </form>

      {/* Styled block containing beautiful custom styles resolving global overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wizard-container {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.7);
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }

        .wizard-glow-top {
          position: absolute;
          top: 0;
          right: 0;
          width: 256px;
          height: 256px;
          background: hsl(258, 89%, 66%);
          opacity: 0.2;
          filter: blur(100px);
          border-radius: 50%;
          pointer-events: none;
        }

        .wizard-glow-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 256px;
          height: 256px;
          background: hsl(152, 69%, 51%);
          opacity: 0.1;
          filter: blur(100px);
          border-radius: 50%;
          pointer-events: none;
        }

        .wizard-header {
          margin-bottom: 32px;
        }

        .wizard-back-link {
          font-size: 14px;
          color: #94a3b8;
          text-decoration: none;
          margin-bottom: 16px;
          display: inline-block;
          transition: color 0.2s ease;
        }

        .wizard-back-link:hover {
          color: white;
        }

        .wizard-title {
          font-size: 28px;
          font-weight: 800;
          color: white;
          margin-bottom: 16px;
        }

        .wizard-progress-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
        }

        .wizard-progress-step {
          height: 8px;
          border-radius: 9999px;
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
          transition: background-color 0.5s ease;
        }

        .wizard-progress-step.is-active {
          background: hsl(258, 89%, 66%);
        }

        .wizard-step-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 16px;
          color: white;
          text-align: start;
        }

        /* AI Concierge Sourcing Assistant */
        .wizard-ai-card {
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          background: linear-gradient(to right, rgba(139, 92, 246, 0.05), transparent);
          margin-bottom: 32px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
        }

        .wizard-ai-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .wizard-ai-emoji {
          font-size: 24px;
        }

        .wizard-ai-titles {
          text-align: start;
        }

        .wizard-ai-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin: 0 0 4px 0;
        }

        .wizard-ai-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        .wizard-ai-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .wizard-textarea {
          width: 100%;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.4);
          padding: 16px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 14px;
          transition: border-color 0.2s ease;
          outline: none;
          box-sizing: border-box;
          resize: vertical;
        }

        .wizard-textarea:focus {
          border-color: hsl(258, 89%, 66%);
        }

        .wizard-error-banner {
          font-size: 12px;
          color: #f87171;
          font-weight: 500;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 12px;
          border-radius: 8px;
          text-align: start;
        }

        button.wizard-btn-concierge {
          width: 100% !important;
          padding: 12px 16px !important;
          background: hsl(258, 89%, 66%) !important;
          color: white !important;
          font-weight: 800 !important;
          border-radius: 12px !important;
          border: none !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3) !important;
          font-size: 14px !important;
        }

        button.wizard-btn-concierge:hover:not(:disabled) {
          background: hsl(258, 89%, 76%) !important;
          transform: translateY(-1px) !important;
        }

        button.wizard-btn-concierge:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

        /* Divider */
        .wizard-divider {
          display: flex;
          padding: 16px 0;
          align-items: center;
        }

        .wizard-divider-line {
          flex-grow: 1;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .wizard-divider-text {
          flex-shrink: 0;
          margin: 0 16px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Category Cards grid */
        .wizard-categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 16px;
        }

        button.wizard-category-btn {
          background: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 24px !important;
          border-radius: 12px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          width: 100% !important;
          height: auto !important;
        }

        button.wizard-category-btn:hover {
          background: rgba(139, 92, 246, 0.2) !important;
          border-color: rgba(139, 92, 246, 0.5) !important;
          transform: translateY(-2px) !important;
        }

        .wizard-category-icon {
          font-size: 36px;
          margin-bottom: 12px;
          transition: transform 0.2s ease;
        }

        button.wizard-category-btn:hover .wizard-category-icon {
          transform: scale(1.1);
        }

        .wizard-category-label {
          font-weight: 700;
          font-size: 14px;
          color: #ffffff !important;
        }

        /* Inputs & Labels */
        .wizard-form-group {
          margin-bottom: 24px;
          text-align: start;
        }

        .wizard-label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .wizard-label-sm {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .wizard-input {
          width: 100%;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.5);
          padding: 16px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          outline: none;
          font-size: 16px;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .wizard-input:focus {
          border-color: hsl(258, 89%, 66%);
        }

        .wizard-input-hint {
          font-size: 12px;
          color: #64748b;
          margin-top: 8px;
        }

        /* B2B styles */
        .wizard-toggle-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          margin-bottom: 24px;
        }

        .wizard-checkbox-input {
          width: 20px;
          height: 20px;
          accent-color: hsl(258, 89%, 66%);
          cursor: pointer;
        }

        .wizard-checkbox-label {
          font-size: 14px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          user-select: none;
        }

        .wizard-b2b-panel {
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.4);
          margin-bottom: 24px;
        }

        .wizard-b2b-title {
          font-size: 14px;
          font-weight: 700;
          color: hsl(258, 89%, 66%);
          margin-top: 0;
          margin-bottom: 16px;
          text-align: start;
        }

        .wizard-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .wizard-grid-2 {
            grid-template-columns: 1fr;
          }
          .wizard-categories-grid {
            grid-template-columns: 1fr;
          }
        }

        .wizard-input-sm {
          width: 100%;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.5);
          padding: 12px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .wizard-input-sm:focus {
          border-color: hsl(258, 89%, 66%);
        }

        /* Upsell card */
        .wizard-upsell-banner {
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(217, 119, 6, 0.5);
          background: rgba(217, 119, 6, 0.1);
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          text-align: start;
        }

        .wizard-upsell-emoji {
          font-size: 24px;
        }

        .wizard-upsell-title {
          font-weight: 700;
          color: #d97706;
          margin: 0 0 4px 0;
        }

        .wizard-upsell-text {
          font-size: 14px;
          color: white;
          margin: 0 0 8px 0;
        }

        .wizard-upsell-link {
          font-size: 12px;
          font-weight: 700;
          background: #d97706;
          color: black;
          padding: 4px 12px;
          border-radius: 6px;
          text-decoration: none;
          transition: background-color 0.2s ease;
          display: inline-block;
        }

        .wizard-upsell-link:hover {
          background-color: white;
        }

        /* Footer buttons navigation */
        .wizard-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          gap: 16px;
        }

        .wizard-footer-actions {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 24px;
        }

        button.wizard-btn-primary {
          width: auto !important;
          padding: 12px 24px !important;
          background: hsl(258, 89%, 66%) !important;
          color: white !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          border: none !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4) !important;
        }

        button.wizard-btn-primary:hover:not(:disabled) {
          background: hsl(258, 89%, 76%) !important;
          transform: translateY(-1px) !important;
        }

        button.wizard-btn-primary:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

        button.wizard-btn-secondary {
          width: auto !important;
          padding: 12px 24px !important;
          background: transparent !important;
          color: white !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        button.wizard-btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1) !important;
          transform: translateY(-1px) !important;
        }

        button.wizard-btn-secondary:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        button.wizard-btn-submit {
          width: auto !important;
          padding: 12px 24px !important;
          background: hsl(152, 69%, 51%) !important;
          color: black !important;
          font-weight: 800 !important;
          border-radius: 12px !important;
          border: none !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4) !important;
        }

        button.wizard-btn-submit:hover:not(:disabled) {
          background: hsl(152, 69%, 61%) !important;
          transform: translateY(-1px) !important;
        }

        button.wizard-btn-submit:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

        .wizard-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  )
}
