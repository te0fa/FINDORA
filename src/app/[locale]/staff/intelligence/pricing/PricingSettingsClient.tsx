'use client'

import React, { useState } from 'react'

interface PricingRule {
  id: string
  service_type: string
  base_price_egp: number
  min_price_egp: number
  max_price_egp: number
  active_offer_percentage: number
  override_by_admin: boolean
}

interface CustomerPhase {
  id: string
  phase_name: string
  phase_order: number
  is_current_phase: boolean
  fee_amount_egp: number
  first_request_free_with_verified_phone: boolean
}

interface VendorPhase {
  id: string
  phase_name: string
  phase_order: number
  is_current_phase: boolean
  commission_rate: number | null
  min_fee_egp: number | null
  subscription_monthly_egp: number | null
}

interface PricingSettingsClientProps {
  locale: string
  initialRules: PricingRule[]
  initialCustomerPhases: CustomerPhase[]
  initialVendorPhases: VendorPhase[]
}

export default function PricingSettingsClient({
  locale,
  initialRules,
  initialCustomerPhases,
  initialVendorPhases
}: PricingSettingsClientProps) {
  const isAr = locale === 'ar'
  const [rules, setRules] = useState<PricingRule[]>(initialRules)
  const [customerPhases, setCustomerPhases] = useState<CustomerPhase[]>(initialCustomerPhases)
  const [vendorPhases, setVendorPhases] = useState<VendorPhase[]>(initialVendorPhases)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  // Advance state confirmation
  const [customerPhaseConfirm, setCustomerPhaseConfirm] = useState<string | null>(null)
  const [vendorPhaseConfirm, setVendorPhaseConfirm] = useState<string | null>(null)

  const handleUpdateRule = (index: number, field: keyof PricingRule, value: any) => {
    const updated = [...rules]
    updated[index] = { ...updated[index], [field]: value }
    setRules(updated)
  }

  const handleUpdateCustomerPhase = (index: number, field: keyof CustomerPhase, value: any) => {
    const updated = [...customerPhases]
    updated[index] = { ...updated[index], [field]: value }
    setCustomerPhases(updated)
  }

  const handleUpdateVendorPhase = (index: number, field: keyof VendorPhase, value: any) => {
    const updated = [...vendorPhases]
    updated[index] = { ...updated[index], [field]: value }
    setVendorPhases(updated)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/staff/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules, customerPhases, vendorPhases })
      })
      if (!res.ok) throw new Error('Failed to save')
      setMessage(isAr ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(error)
      setMessage(isAr ? 'حدث خطأ أثناء الحفظ' : 'Error saving changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdvanceCustomerPhase = async (targetPhaseName: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/staff/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advanceCustomerTo: targetPhaseName })
      })
      if (!res.ok) throw new Error('Failed to advance phase')
      
      // Update UI state locally
      const updated = customerPhases.map(p => ({
        ...p,
        is_current_phase: p.phase_name === targetPhaseName
      }))
      setCustomerPhases(updated)
      setCustomerPhaseConfirm(null)
      
      setMessage(isAr ? 'تم الانتقال للمرحلة الجديدة' : 'Successfully transitioned to new phase')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(error)
      setMessage(isAr ? 'خطأ أثناء الترقية' : 'Error during upgrade')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdvanceVendorPhase = async (targetPhaseName: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/staff/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advanceVendorTo: targetPhaseName })
      })
      if (!res.ok) throw new Error('Failed to advance phase')
      
      // Update UI state locally
      const updated = vendorPhases.map(p => ({
        ...p,
        is_current_phase: p.phase_name === targetPhaseName
      }))
      setVendorPhases(updated)
      setVendorPhaseConfirm(null)
      
      setMessage(isAr ? 'تم الانتقال للمرحلة الجديدة' : 'Successfully transitioned to new phase')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(error)
      setMessage(isAr ? 'خطأ أثناء الترقية' : 'Error during upgrade')
    } finally {
      setIsSaving(false)
    }
  }

  // Active customer & vendor phases
  const activeCustomerPhase = customerPhases.find(p => p.is_current_phase)
  const activeVendorPhase = vendorPhases.find(p => p.is_current_phase)

  // Find next phases
  const nextCustomerPhase = activeCustomerPhase 
    ? customerPhases.find(p => p.phase_order === activeCustomerPhase.phase_order + 1)
    : null

  const nextVendorPhase = activeVendorPhase
    ? vendorPhases.find(p => p.phase_order === activeVendorPhase.phase_order + 1)
    : null

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">
          {isAr ? 'إدارة التسعير والرسوم الموحدة' : 'Unified Pricing & Fees Control'}
        </h1>
        <p className="mt-1 text-[hsl(220,10%,60%)]">
          {isAr 
            ? 'تعديل مراحل الرسوم للعملاء والتجار والتحكم الفوري في القواعد الاقتصادية.' 
            : 'Configure fee phases for customers and vendors, and manage base economic rules.'}
        </p>
      </div>

      {/* SYSTEM 1: Customer Service Fees */}
      <section className="space-y-6">
        <div className="border-b border-white/10 pb-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>{isAr ? '1. رسوم الخدمة للعميل' : '1. Customer Service Fees'}</span>
            <span className="rounded-full bg-[hsl(258,89%,66%,0.2)] px-3 py-1 text-xs font-semibold text-[hsl(258,89%,70%)]">
              {activeCustomerPhase ? `${isAr ? 'المرحلة النشطة:' : 'Active:'} ${activeCustomerPhase.phase_name}` : ''}
            </span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {customerPhases.map((phase, idx) => (
            <div 
              key={phase.id} 
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-xl transition bg-[hsl(220,20%,12%)] ${
                phase.is_current_phase 
                  ? 'border-[hsl(258,89%,66%)] ring-2 ring-[hsl(258,89%,66%,0.2)]' 
                  : 'border-white/10'
              }`}
            >
              {phase.is_current_phase && (
                <div className="absolute top-0 right-0 bg-[hsl(258,89%,66%)] text-white text-xs font-black px-3 py-1 rounded-bl-lg">
                  {isAr ? 'نشط حالياً' : 'Active Phase'}
                </div>
              )}

              <h3 className="text-lg font-bold text-white mb-2 capitalize">
                {phase.phase_name.replace('_', ' ')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">
                    {isAr ? 'قيمة الرسم (ج.م)' : 'Fee Amount (EGP)'}
                  </label>
                  <input 
                    type="number" 
                    value={phase.fee_amount_egp}
                    onChange={(e) => handleUpdateCustomerPhase(idx, 'fee_amount_egp', Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 p-2 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id={`first_free_${phase.id}`}
                    checked={phase.first_request_free_with_verified_phone}
                    onChange={(e) => handleUpdateCustomerPhase(idx, 'first_request_free_with_verified_phone', e.target.checked)}
                    className="w-4 h-4 accent-[hsl(258,89%,66%)]"
                  />
                  <label htmlFor={`first_free_${phase.id}`} className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                    {isAr ? 'أول طلب مجاني بالهاتف الموثق' : 'First free request (verified phone)'}
                  </label>
                </div>

                {/* Info Text */}
                <div className="mt-4 rounded bg-black/30 p-2 text-[11px] text-slate-400 flex items-start gap-1">
                  <span className="text-[hsl(258,89%,70%)] font-black">ⓘ</span>
                  <span>
                    {isAr 
                      ? phase.phase_name === 'free_launch' 
                        ? 'الإطلاق المجاني: رسم الخدمة صفر للجميع لتشجيع الاستخدام الأولي للمنصة.'
                        : phase.phase_name === 'growth'
                          ? 'مرحلة النمو: رسم خدمة مخفض 99 ج.م مع إمكانية إعطاء أول طلب مجاني تماماً مدى الحياة في حال توثيق رقم الموبايل.'
                          : 'المرحلة القياسية: رسم خدمة قياسي كامل 299 ج.م لجميع طلبات العملاء بدون استثناءات مجانية.'
                      : phase.phase_name === 'free_launch'
                        ? 'Free Launch: Zero service fee for everyone to stimulate platform onboarding.'
                        : phase.phase_name === 'growth'
                          ? 'Growth: Reduced service fee (99 EGP) with verified mobile users getting their very first request free.'
                          : 'Standard: Full standard fee (299 EGP) for all customers without promotions.'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Advance Customer Phase Button */}
        {nextCustomerPhase && (
          <div className="mt-4 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
            <div className="text-sm text-yellow-500/90 font-medium">
              ⚠️ {isAr 
                ? `هل ترغب في ترقية نظام رسوم العملاء إلى المرحلة التالية: ${nextCustomerPhase.phase_name.toUpperCase()}؟` 
                : `Ready to advance customer fee system to the next phase: ${nextCustomerPhase.phase_name.toUpperCase()}?`}
            </div>
            <div>
              {customerPhaseConfirm !== nextCustomerPhase.phase_name ? (
                <button
                  onClick={() => setCustomerPhaseConfirm(nextCustomerPhase.phase_name)}
                  className="rounded-lg bg-yellow-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-yellow-700"
                >
                  {isAr ? 'التقدم للمرحلة التالية' : 'Advance to Next Phase'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAdvanceCustomerPhase(nextCustomerPhase.phase_name)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    {isAr ? 'تأكيد الترقية!' : 'Confirm Upgrade!'}
                  </button>
                  <button
                    onClick={() => setCustomerPhaseConfirm(null)}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* SYSTEM 2: Vendor Transaction Fees */}
      <section className="space-y-6">
        <div className="border-b border-white/10 pb-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>{isAr ? '2. رسوم الصفقات للتاجر' : '2. Vendor Transaction Fees'}</span>
            <span className="rounded-full bg-[hsl(43,96%,56%,0.2)] px-3 py-1 text-xs font-semibold text-[hsl(43,96%,56%)]">
              {activeVendorPhase ? `${isAr ? 'المرحلة النشطة:' : 'Active:'} ${activeVendorPhase.phase_name}` : ''}
            </span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {vendorPhases.map((phase, idx) => (
            <div 
              key={phase.id} 
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-xl transition bg-[hsl(220,20%,12%)] ${
                phase.is_current_phase 
                  ? 'border-[hsl(43,96%,56%)] ring-2 ring-[hsl(43,96%,56%,0.2)]' 
                  : 'border-white/10'
              }`}
            >
              {phase.is_current_phase && (
                <div className="absolute top-0 right-0 bg-[hsl(43,96%,56%)] text-black text-xs font-black px-3 py-1 rounded-bl-lg">
                  {isAr ? 'نشط حالياً' : 'Active Phase'}
                </div>
              )}

              <h3 className="text-lg font-bold text-white mb-2 capitalize">
                {phase.phase_name.replace('_', ' ')}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400 font-mono">
                    {isAr ? 'نسبة عمولة التاجر (مثال 0.05 لـ 5%)' : 'Commission Rate (e.g. 0.05 for 5%)'}
                  </label>
                  <input 
                    type="text" 
                    placeholder="NULL"
                    value={phase.commission_rate ?? ''}
                    onChange={(e) => handleUpdateVendorPhase(idx, 'commission_rate', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 p-2 text-white border border-white/10 focus:border-[hsl(43,96%,56%)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">
                    {isAr ? 'الحد الأدنى للعمولة (ج.م)' : 'Minimum Flat Fee (EGP)'}
                  </label>
                  <input 
                    type="text" 
                    placeholder="NULL"
                    value={phase.min_fee_egp ?? ''}
                    onChange={(e) => handleUpdateVendorPhase(idx, 'min_fee_egp', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 p-2 text-white border border-white/10 focus:border-[hsl(43,96%,56%)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400 font-mono">
                    {isAr ? 'الاشتراك الشهري للتاجر (ج.م)' : 'Monthly Subscription (EGP)'}
                  </label>
                  <input 
                    type="text" 
                    placeholder="NULL"
                    value={phase.subscription_monthly_egp ?? ''}
                    onChange={(e) => handleUpdateVendorPhase(idx, 'subscription_monthly_egp', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 p-2 text-white border border-white/10 focus:border-[hsl(43,96%,56%)] focus:outline-none"
                  />
                </div>

                {/* Info Text */}
                <div className="mt-4 rounded bg-black/30 p-2 text-[11px] text-slate-400 flex items-start gap-1">
                  <span className="text-[hsl(43,96%,56%)] font-black">ⓘ</span>
                  <span>
                    {isAr 
                      ? phase.phase_name === 'free_launch' 
                        ? 'إطلاق مجاني للتجار: بدون عمولات وبدون رسوم اشتراك شهرية لتشجيعهم على عرض البضائع.'
                        : phase.phase_name === 'discounted'
                          ? 'مرحلة مخفضة للشركاء الأوائل: عمولات ورسوم مخفضة (متروكة فارغة NULL لتعريفها لاحقاً).'
                          : 'المرحلة القياسية: عمولات ورسوم كاملة للتجار (متروكة فارغة NULL لتعريفها لاحقاً وتطبق 5%/50 ج.م كـ fallback تلقائي).'
                      : phase.phase_name === 'free_launch'
                        ? 'Free Launch: 0% commissions and zero subscription fees to onboard merchants.'
                        : phase.phase_name === 'discounted'
                          ? 'Discounted: Reduced fees for early partners (left NULL by default, customizable).'
                          : 'Standard: Full transaction commission fees (left NULL, falls back to 5% with 50 EGP minimum).'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Advance Vendor Phase Button */}
        {nextVendorPhase && (
          <div className="mt-4 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
            <div className="text-sm text-yellow-500/90 font-medium">
              ⚠️ {isAr 
                ? `هل ترغب في ترقية نظام رسوم التجار إلى المرحلة التالية: ${nextVendorPhase.phase_name.toUpperCase()}؟` 
                : `Ready to advance vendor fee system to the next phase: ${nextVendorPhase.phase_name.toUpperCase()}?`}
            </div>
            <div>
              {vendorPhaseConfirm !== nextVendorPhase.phase_name ? (
                <button
                  onClick={() => setVendorPhaseConfirm(nextVendorPhase.phase_name)}
                  className="rounded-lg bg-yellow-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-yellow-700"
                >
                  {isAr ? 'التقدم للمرحلة التالية' : 'Advance to Next Phase'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAdvanceVendorPhase(nextVendorPhase.phase_name)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    {isAr ? 'تأكيد الترقية!' : 'Confirm Upgrade!'}
                  </button>
                  <button
                    onClick={() => setVendorPhaseConfirm(null)}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* SYSTEM 3: Base Service Pricing Engine & Offers (Existing) */}
      <section className="space-y-6">
        <div className="border-b border-white/10 pb-2">
          <h2 className="text-2xl font-bold text-white">
            {isAr ? '3. محرك تسعير الخدمات والعروض الأساسية' : '3. Base Services Pricing & Offers'}
          </h2>
        </div>

        <div className="grid gap-6">
          {rules.map((rule, index) => (
            <div key={rule.id} className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl relative overflow-hidden">
              {rule.active_offer_percentage > 0 && !rule.override_by_admin && (
                <div className="absolute top-0 right-0 bg-[hsl(0,84%,60%)] text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                  {isAr ? 'عرض نشط' : 'Active Offer'}
                </div>
              )}
              
              <h3 className="mb-4 text-xl font-bold text-[hsl(258,89%,66%)] border-b border-white/10 pb-4">
                {rule.service_type.replace('_', ' ').toUpperCase()}
              </h3>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
                    {isAr ? 'السعر الأساسي (ج.م)' : 'Base Price (EGP)'}
                  </label>
                  <input 
                    type="number" 
                    value={rule.base_price_egp}
                    onChange={(e) => handleUpdateRule(index, 'base_price_egp', Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
                    {isAr ? 'الحد الأدنى (ج.م)' : 'Min Bounds (EGP)'}
                  </label>
                  <input 
                    type="number" 
                    value={rule.min_price_egp}
                    onChange={(e) => handleUpdateRule(index, 'min_price_egp', Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 p-3 text-[hsl(220,10%,60%)] border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
                    {isAr ? 'نسبة الخصم المباشر (%)' : 'Active Offer (%)'}
                  </label>
                  <input 
                    type="number" 
                    value={rule.active_offer_percentage}
                    onChange={(e) => handleUpdateRule(index, 'active_offer_percentage', Number(e.target.value))}
                    className="w-full rounded-lg bg-[hsl(0,84%,60%,0.1)] p-3 text-[hsl(0,84%,60%)] font-bold border border-[hsl(0,84%,60%,0.3)] focus:border-[hsl(0,84%,60%)] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-center pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={rule.override_by_admin}
                      onChange={(e) => handleUpdateRule(index, 'override_by_admin', e.target.checked)}
                      className="w-5 h-5 accent-[hsl(43,96%,56%)]"
                    />
                    <span className="text-[hsl(43,96%,56%)] text-sm font-bold">{isAr ? 'إلغاء الخصم (تجميد)' : 'Override & Freeze Offer'}</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm text-slate-400">{isAr ? 'سعر البيع النهائي المتوقع للعميل:' : 'Final Expected Customer Price:'}</span>
                <span className="text-2xl font-black text-white">
                  {rule.override_by_admin 
                    ? rule.base_price_egp 
                    : Math.max(rule.min_price_egp, rule.base_price_egp * (1 - (rule.active_offer_percentage / 100)))} 
                  <span className="text-sm ml-1">{isAr ? 'ج.م' : 'EGP'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-4 z-40 flex items-center gap-4 bg-[hsl(220,20%,12%)] p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-[hsl(258,89%,66%)] px-8 py-3 font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] transition hover:bg-[hsl(258,89%,70%)] disabled:opacity-50"
        >
          {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتفعيل الأسعار الجديدة' : 'Deploy Pricing Config')}
        </button>
        {message && (
          <span className={`font-bold ${message.includes('خطأ') || message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
