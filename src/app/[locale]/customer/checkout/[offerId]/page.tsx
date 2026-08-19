import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Checkout — FINDORA',
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; offerId: string }>
}) {
  const { locale, offerId } = await params
  const isAr = locale === 'ar'
  const supabase = (await createClient()) as any

  // Fetch the offer with request + supplier info
  const { data: offer } = await supabase
    .from('contributor_submissions')
    .select('id, price_reported, details, created_at, contributor_id, product_id, contributors(trust_score, full_name)')
    .eq('id', offerId)
    .single()

  if (!offer) {
    redirect(`/${locale}/customer/dashboard`)
  }

  // Fetch the linked customer request for context
  const { data: request } = await supabase
    .from('customer_requests')
    .select('product_name, category, target_location, max_price')
    .eq('id', offer.product_id)
    .maybeSingle()

  const storeName = offer.details?.store_name || (isAr ? 'مورد معتمد' : 'Verified Supplier')
  const serviceFeePct = 0.10 // 10% FINDORA service fee
  const serviceFee = Math.round(offer.price_reported * serviceFeePct)
  const totalAmount = offer.price_reported + serviceFee

  // InstaPay account (read from env or use placeholder)
  const instaPayAccount = process.env.NEXT_PUBLIC_INSTAPAY_ACCOUNT || 'findora@instapay'

  return (
    <div className="min-h-screen bg-[hsl(220,25%,8%)] text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <Link
          href={`/${locale}/customer/dashboard`}
          className="text-sm text-[hsl(220,10%,60%)] hover:text-white inline-block"
        >
          {isAr ? '← العودة' : '← Back'}
        </Link>

        <h1 className="text-3xl font-extrabold">
          {isAr ? 'إتمام الدفع' : 'Checkout'}
        </h1>

        {/* Order Summary */}
        <div className="p-6 rounded-2xl border border-white/10 bg-black/40 space-y-4">
          <h2 className="text-lg font-bold text-[hsl(258,89%,76%)]">
            {isAr ? 'ملخص الطلب' : 'Order Summary'}
          </h2>
          {request && (
            <div className="text-sm text-[hsl(220,10%,60%)]">
              <p className="text-white font-bold text-base">{request.product_name}</p>
              {request.category && <p>📂 {request.category}</p>}
              {request.target_location && <p>📍 {request.target_location}</p>}
            </div>
          )}
          <div className="text-sm text-[hsl(220,10%,60%)]">
            🏬 {storeName}
          </div>
          <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[hsl(220,10%,60%)]">{isAr ? 'سعر العرض' : 'Offer Price'}</span>
              <span className="font-bold">{offer.price_reported} EGP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(220,10%,60%)]">{isAr ? 'رسوم الخدمة (10%)' : 'Service Fee (10%)'}</span>
              <span className="font-bold">{serviceFee} EGP</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="font-bold text-white">{isAr ? 'الإجمالي' : 'Total'}</span>
              <span className="font-extrabold text-xl text-[hsl(152,69%,51%)]">{totalAmount} EGP</span>
            </div>
          </div>
        </div>

        {/* InstaPay Instructions */}
        <div className="p-6 rounded-2xl border border-[hsl(43,96%,56%,0.5)] bg-[hsl(43,96%,56%,0.05)] space-y-4">
          <h2 className="text-lg font-bold text-[hsl(43,96%,56%)]">
            💳 {isAr ? 'تعليمات الدفع عبر InstaPay' : 'InstaPay Payment Instructions'}
          </h2>
          <ol className="space-y-3 text-sm text-white/90 list-none">
            <li className="flex gap-3 items-start">
              <span className="bg-[hsl(43,96%,56%)] text-black font-extrabold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">1</span>
              <span>
                {isAr
                  ? 'افتح تطبيق البنك الخاص بك واختر "تحويل InstaPay"'
                  : 'Open your banking app and select "InstaPay Transfer"'}
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="bg-[hsl(43,96%,56%)] text-black font-extrabold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">2</span>
              <div>
                <p>{isAr ? 'حوّل المبلغ إلى الحساب التالي:' : 'Transfer the amount to:'}</p>
                <p className="font-mono font-bold text-[hsl(43,96%,56%)] mt-1 text-base">{instaPayAccount}</p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="bg-[hsl(43,96%,56%)] text-black font-extrabold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">3</span>
              <div>
                <p>{isAr ? 'المبلغ المطلوب:' : 'Amount to transfer:'}</p>
                <p className="font-extrabold text-white text-lg mt-1">{totalAmount} EGP</p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="bg-[hsl(43,96%,56%)] text-black font-extrabold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">4</span>
              <span>
                {isAr
                  ? 'بعد التحويل، ارفع صورة إيصال التحويل في الخطوة التالية'
                  : 'After transfer, upload your receipt screenshot in the next step'}
              </span>
            </li>
          </ol>
        </div>

        {/* Receipt Upload CTA */}
        <div className="p-6 rounded-2xl border border-white/10 bg-black/40 text-center space-y-4">
          <p className="text-[hsl(220,10%,60%)] text-sm">
            {isAr
              ? 'بعد إتمام التحويل، ارفع صورة الإيصال للتأكيد التلقائي'
              : 'After completing the transfer, upload your receipt for automatic verification'}
          </p>
          <Link
            href={`/${locale}/customer/checkout/simulate?sessionId=${offerId}&amount=${totalAmount}&offerId=${offerId}`}
            className="block w-full py-4 bg-[hsl(152,69%,51%)] text-black font-extrabold text-lg rounded-xl hover:bg-[hsl(152,69%,61%)] transition shadow-[0_0_20px_hsl(152,69%,51%,0.4)]"
          >
            {isAr ? 'رفع إيصال التحويل ✅' : 'Upload Payment Receipt ✅'}
          </Link>
          <p className="text-xs text-[hsl(220,10%,40%)]">
            🔒 {isAr ? 'مدفوعاتك محمية بالكامل — FINDORA تعمل كـ Escrow' : 'Your payment is fully protected — FINDORA acts as Escrow'}
          </p>
        </div>

      </div>
    </div>
  )
}
