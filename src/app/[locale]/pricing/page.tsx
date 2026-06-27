import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Pricing — FINDORA',
}

export default async function PricingPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const isRTL = locale === 'ar'
  const supabase = await createClient()

  // Fetch customer fee phases to show as pricing options
  const { data: phases } = await supabase
    .from('customer_fee_phases')
    .select('*')
    .order('phase_order', { ascending: true })

  const plans = (phases || []).map(phase => {
    let name_en = phase.phase_name
    let name_ar = phase.phase_name
    let description_en = ''
    let description_ar = ''
    let features: string[] = []

    if (phase.phase_name === 'free_launch') {
      name_en = 'Free Launch'
      name_ar = 'الإطلاق المجاني'
      description_en = 'Special introductory zero fee for opening requests.'
      description_ar = 'عرض تعريفي خاص بدون أي رسوم لفتح الطلبات.'
      features = [
        isRTL ? '0 جنيه رسوم خدمة' : '0 EGP service fee',
        isRTL ? 'بحث ذكي مفتوح' : 'Unlimited AI sourcing requests',
        isRTL ? 'متاح لجميع العملاء الجدد' : 'Available for all new customers'
      ]
    } else if (phase.phase_name === 'growth') {
      name_en = 'Growth Phase'
      name_ar = 'مرحلة النمو'
      description_en = 'Discounted service fee as platform expands.'
      description_ar = 'رسوم مخفضة مع توسع المنصة.'
      features = [
        isRTL ? '99 جنيه رسوم الخدمة لكل طلب' : '99 EGP service fee per request',
        isRTL ? 'الطلب الأول مجاناً للحسابات الموثقة برقم الهاتف' : 'First request free for phone-verified accounts',
        isRTL ? 'دعم وأولوية في البحث الذكي' : 'Priority AI sourcing queue'
      ]
    } else if (phase.phase_name === 'standard') {
      name_en = 'Standard Plan'
      name_ar = 'الخطة القياسية'
      description_en = 'Full features with standard platform fees.'
      description_ar = 'كامل الميزات مع رسوم الخدمة القياسية.'
      features = [
        isRTL ? '299 جنيه رسوم الخدمة لكل طلب' : '299 EGP service fee per request',
        isRTL ? 'تغطية شاملة وتنسيق كامل للعروض' : 'Full market coverage & offer aggregation',
        isRTL ? 'بحث سريع وأولوية عالية' : 'Super fast turnaround & top priority'
      ]
    }

    return {
      id: phase.id,
      name_en,
      name_ar,
      description_en,
      description_ar,
      monthly_price_egp: Number(phase.fee_amount_egp),
      features,
      is_current_phase: phase.is_current_phase
    }
  })

  return (
    <div className="mx-auto max-w-6xl p-6 py-20" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-white md:text-5xl">
          {isRTL ? 'خطط الأسعار الذكية' : 'Smart Pricing Plans'}
        </h1>
        <p className="mt-4 text-lg text-[hsl(220,10%,60%)] max-w-2xl mx-auto">
          {isRTL 
            ? 'نقدم تسعيراً مرناً يتكيف مع حجم عملك ومتطلبات السوق باستخدام الذكاء الاصطناعي.' 
            : 'Flexible pricing adapting to your business size and market demands using AI.'}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {plans?.map((plan: any) => (
          <div key={plan.id} className="relative flex flex-col rounded-3xl border border-white/10 bg-[hsl(220,20%,12%)] p-8 shadow-2xl backdrop-blur-md">
            {/* Ribbon for active phase */}
            {plan.is_current_phase && (
              <div className="absolute top-0 right-0 rounded-bl-3xl rounded-tr-3xl bg-[hsl(43,96%,56%)] px-4 py-2 text-xs font-bold text-black">
                {isRTL ? 'نشط حالياً' : 'Active Phase'}
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-white">{isRTL ? plan.name_ar : plan.name_en}</h2>
            <p className="mt-2 text-sm text-[hsl(220,10%,60%)] min-h-[40px]">
              {isRTL ? plan.description_ar : plan.description_en}
            </p>
            
            <div className="mt-6 mb-8 flex items-baseline gap-2">
              <span className="text-5xl font-black text-[hsl(258,89%,66%)]">{plan.monthly_price_egp}</span>
              <span className="text-sm font-bold text-[hsl(220,10%,60%)]">EGP / {isRTL ? 'شهر' : 'month'}</span>
            </div>

            <ul className="mb-8 flex-1 space-y-4">
              {(plan.features || []).map((feature: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-[hsl(220,10%,80%)]">
                  <svg className="h-6 w-6 shrink-0 text-[hsl(152,69%,51%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link 
              href={`/${locale}/auth/signup?plan=${plan.id}`}
              className="mt-auto block w-full rounded-xl bg-[hsl(258,89%,66%)] py-4 text-center font-bold text-white transition hover:bg-[hsl(258,89%,70%)]"
            >
              {isRTL ? 'اشترك الآن' : 'Subscribe Now'}
            </Link>
          </div>
        ))}

        {(!plans || plans.length === 0) && (
          <div className="col-span-3 py-20 text-center text-[hsl(220,10%,60%)]">
            {isRTL ? 'لا توجد خطط مفعلة حالياً.' : 'No active plans found.'}
          </div>
        )}
      </div>
    </div>
  )
}
