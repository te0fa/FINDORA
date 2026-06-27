'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingWizardClient({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    role: '',
    fullName: '',
    phone: '',
    city: '',
    documentUrl: '',
    aiAnswers: {} as Record<string, string>
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleNext = () => setStep(s => s + 1)
  const handleBack = () => setStep(s => s - 1)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // In a real app, this would call a Server Action or API to save the application
    // and trigger the AI HR analysis.
    setTimeout(() => {
      setIsSubmitting(false)
      setStep(6) // Success step
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl bg-[hsl(220,20%,12%)] shadow-2xl ring-1 ring-white/10">
      
      {/* Progress Bar */}
      <div className="flex h-2 w-full bg-black/40">
        <div 
          className="h-full bg-[hsl(258,89%,66%)] transition-all duration-500" 
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="p-8">
        
        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-white">{isAr ? 'اختر دورك' : 'Choose Your Role'}</h2>
            
            <div className="grid gap-4">
              <button 
                onClick={() => { setFormData({ ...formData, role: 'field_scout' }); handleNext() }}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-[hsl(258,89%,66%)] hover:bg-[hsl(258,89%,66%,0.1)]"
              >
                <span className="text-3xl">👨‍🔧</span>
                <div>
                  <h3 className="font-bold text-white">{isAr ? 'Field Scout' : 'Field Scout'}</h3>
                  <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'شغل ميداني وبحث أسعار (كاش + بونص)' : 'Field work & price research (Cash + Bonus)'}</p>
                </div>
              </button>

              <button 
                onClick={() => { setFormData({ ...formData, role: 'store_insider' }); handleNext() }}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-[hsl(43,96%,56%)] hover:bg-[hsl(43,96%,56%,0.1)]"
              >
                <span className="text-3xl">🏪</span>
                <div>
                  <h3 className="font-bold text-white">{isAr ? 'Store Insider' : 'Store Insider'}</h3>
                  <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'موظف بمعرض أو محل (عمولة + نقاط)' : 'Store employee (Commission + Points)'}</p>
                </div>
              </button>

              <button 
                onClick={() => { setFormData({ ...formData, role: 'casual' }); handleNext() }}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/30 hover:bg-white/5"
              >
                <span className="text-3xl">👤</span>
                <div>
                  <h3 className="font-bold text-white">{isAr ? 'Casual User' : 'Casual User'}</h3>
                  <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'مشارك عادي بأسعار وعروض (نقاط للمنصة فقط)' : 'Casual participant (Platform points only)'}</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-white">{isAr ? 'بياناتك الأساسية' : 'Basic Information'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[hsl(258,89%,66%)] focus:outline-none" 
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">{isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[hsl(258,89%,66%)] focus:outline-none" 
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">{isAr ? 'المدينة' : 'City'}</label>
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[hsl(258,89%,66%)] focus:outline-none" 
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={handleBack} className="flex-1 rounded-lg bg-black/30 py-3 font-bold text-white hover:bg-black/50">{isAr ? 'رجوع' : 'Back'}</button>
              <button 
                onClick={handleNext} 
                disabled={!formData.fullName || !formData.phone || !formData.city}
                className="flex-1 rounded-lg bg-[hsl(258,89%,66%)] py-3 font-bold text-white hover:bg-[hsl(258,89%,70%)] disabled:opacity-50"
              >
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Document Upload */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-white">{isAr ? 'رفع المستندات' : 'Upload Documents'}</h2>
            <p className="text-sm text-[hsl(220,10%,60%)]">
              {formData.role === 'store_insider' 
                ? (isAr ? 'برجاء رفع كارنية العمل أو ما يثبت عملك بالمعرض.' : 'Please upload your store ID or proof of employment.')
                : (isAr ? 'برجاء رفع صورة البطاقة الشخصية للتحقق من الهوية.' : 'Please upload a valid National ID.')}
            </p>
            
            <div className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-black/20 transition hover:border-[hsl(258,89%,66%)]">
              <span className="text-3xl">📄</span>
              <span className="mt-2 text-sm text-[hsl(220,10%,60%)]">{isAr ? 'اضغط لرفع الملف' : 'Click to upload file'}</span>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={handleBack} className="flex-1 rounded-lg bg-black/30 py-3 font-bold text-white hover:bg-black/50">{isAr ? 'رجوع' : 'Back'}</button>
              <button onClick={handleNext} className="flex-1 rounded-lg bg-[hsl(258,89%,66%)] py-3 font-bold text-white hover:bg-[hsl(258,89%,70%)]">
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: AI Questions */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(258,89%,66%,0.2)] text-[hsl(258,89%,66%)]">🤖</div>
              <h2 className="text-2xl font-bold text-white">{isAr ? 'أسئلة سريعة (AI HR)' : 'Quick Interview (AI HR)'}</h2>
            </div>
            
            <div className="space-y-6">
              {formData.role === 'field_scout' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">
                    {isAr ? 'إيه أكتر منطقة بتعرف تلف فيها وتقدر تجيب منها أسعار كويسة؟' : 'Which area are you most familiar with for price hunting?'}
                  </label>
                  <textarea 
                    className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[hsl(258,89%,66%)] focus:outline-none" 
                    rows={3}
                  />
                </div>
              )}
              {formData.role === 'store_insider' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">
                    {isAr ? 'إيه نوع المنتجات اللي المعرض بتاعك بيبيعها؟' : 'What type of products does your store sell?'}
                  </label>
                  <textarea 
                    className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[hsl(258,89%,66%)] focus:outline-none" 
                    rows={3}
                  />
                </div>
              )}
              {formData.role === 'casual' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">
                    {isAr ? 'إزاي بتعرف توصل لعروض كويسة؟' : 'How do you usually find good deals?'}
                  </label>
                  <textarea 
                    className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white focus:border-[hsl(258,89%,66%)] focus:outline-none" 
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={handleBack} className="flex-1 rounded-lg bg-black/30 py-3 font-bold text-white hover:bg-black/50">{isAr ? 'رجوع' : 'Back'}</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 rounded-lg bg-[hsl(152,69%,51%)] py-3 font-bold text-white hover:bg-[hsl(152,69%,55%)] disabled:opacity-50">
                {isSubmitting ? '...' : (isAr ? 'تقديم الطلب' : 'Submit Application')}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 6 && (
          <div className="space-y-6 text-center animate-in zoom-in-95">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(152,69%,51%,0.2)] text-5xl">✅</div>
            <h2 className="text-3xl font-bold text-white">{isAr ? 'تم تقديم الطلب بنجاح' : 'Application Submitted'}</h2>
            <p className="mx-auto max-w-sm text-[hsl(220,10%,60%)]">
              {isAr 
                ? 'Your application is under review. بيتم مراجعة طلبك حالياً من قِبل نظام الذكاء الاصطناعي وفريق الموارد البشرية.' 
                : 'Your application is under review by our AI HR and team. You will be notified soon.'}
            </p>
            <div className="pt-8">
              <button 
                onClick={() => router.push(`/${locale}/contributors/dashboard`)}
                className="rounded-full bg-white/10 px-8 py-3 font-bold text-white hover:bg-white/20"
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
