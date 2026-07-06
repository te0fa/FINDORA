'use client'

import React, { useState } from 'react'
import ConvertedPrice from '@/components/reports/ConvertedPrice'
import MapView from '@/components/reports/MapView'
import ChatAssistantWidget from '@/components/reports/ChatAssistantWidget'
import { submitCustomerMerchantFeedback } from './payment-actions'

interface Snapshot {
  id: string
  option_label: string
  reason_summary: string
  display_price_amount: number
  currency_code: string
  final_score: number
  trust_score: number
  reveal_locked: boolean
  revealedSourceText: string
  revealedSourceUrl: string
  revealedContactInfo: string
  revealedMerchantLocation: string | null
  latitude: number | null
  longitude: number | null
  warranty_info: string
  availability_status: string
  display_specs_summary: string
  disadvantages_en: string | null
  disadvantages_ar: string | null
  customer_summary: string | null // holds why_this_option & why_not_cheapest JSON
}

interface PremiumReportClientProps {
  id: string
  locale: string
  dict: any
  isRTL: boolean
  snapshots: Snapshot[]
  needsPayment: boolean
  paymentIntent: any
  feeAmount: number
  handleConfirmRequestProposal: (formData: FormData) => void
  handleUploadPaymentReceipt: (formData: FormData) => void
}

export default function PremiumReportClient({
  id,
  locale,
  dict,
  isRTL,
  snapshots,
  needsPayment,
  paymentIntent,
  feeAmount,
  handleConfirmRequestProposal,
  handleUploadPaymentReceipt
}: PremiumReportClientProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [rating, setRating] = useState(5)
  const [platformRating, setPlatformRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [selectedSeller, setSelectedSeller] = useState('')

  const activeSnapshot = snapshots[activeTab]
  const isFreeReport = feeAmount === 0

  // 1. Calculate matching score circle parameters
  const score = activeSnapshot ? Math.round(activeSnapshot.final_score || 85) : 85
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  // 2. Parse why this option & why not cheapest
  let whyThisOption = isRTL 
    ? 'هذا الخيار يقدم أفضل توازن بين السعر والضمان وموثوقية البائع.'
    : 'This option offers the optimal balance of price, warranty, and seller trust.'
  let whyNotCheapest = isRTL
    ? 'الخيار الأقل سعراً في السوق لا يتضمن ضماناً معتمداً أو لديه تقييم بائع منخفض.'
    : 'The cheapest option on the market carries no official agent warranty or has a lower seller rating.'

  if (activeSnapshot?.customer_summary) {
    try {
      const parsed = JSON.parse(activeSnapshot.customer_summary)
      if (parsed.why_this_option) whyThisOption = parsed.why_this_option
      if (parsed.why_not_cheapest) whyNotCheapest = parsed.why_not_cheapest
    } catch (e) {
      // Use defaults
    }
  }

  // 3. Advantages (Pros) parsing (split by dots or list formatting)
  const pros = activeSnapshot
    ? activeSnapshot.reason_summary
        .replace(/^(المميزات:|Pros:)\s*/gi, '')
        .split(/[.\n]/)
        .map(p => p.trim())
        .filter(p => p.length > 2 && !p.toLowerCase().includes('العيوب') && !p.toLowerCase().includes('cons'))
    : []

  // 4. Disadvantages (Cons) parsing
  const rawCons = isRTL ? activeSnapshot?.disadvantages_ar : activeSnapshot?.disadvantages_en
  const cons = rawCons
    ? rawCons.split(/[.\n]/).map(c => c.trim()).filter(c => c.length > 2)
    : [isRTL ? 'سعر البيع قد يكون أعلى قليلاً من خيارات السوق الموازية' : 'Price is slightly higher than parallel market options']

  // Tab Title helper
  const getTabLabel = (idx: number) => {
    if (idx === 0) return isRTL ? '🏆 أفضل قيمة' : '🏆 Best Value'
    if (idx === 1) return isRTL ? '💰 خيار الميزانية' : '💰 Budget Choice'
    if (idx === 2) return isRTL ? '🛡️ الأكثر موثوقية' : '🛡️ Most Trusted'
    return isRTL ? `⚡ خيار بديل ${idx - 1}` : `⚡ Option Alternative ${idx - 1}`
  }

  const handlePrint = () => {
    window.print()
  }

  const isUnlocked = !activeSnapshot?.reveal_locked

  return (
    <div className="space-y-12 print:space-y-6">
      
      {/* 1. Print CSS Helper */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
            box-shadow: none !important;
          }
          .text-white {
            color: black !important;
          }
          .text-accent, .text-amber-400 {
            color: #d97706 !important;
          }
          .stroke-accent {
            stroke: #d97706 !important;
          }
        }
      `}</style>

      {/* 2. Free Launch Banner or Payment Widget */}
      <div className="no-print">
        {isFreeReport ? (
          <div className="card border border-emerald-500/30 p-8 bg-gradient-to-br from-black/80 to-emerald-500/5 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.05)] text-center space-y-3">
            <span className="text-4xl">🎁</span>
            <h2 className="text-2xl font-black text-white">
              {isRTL ? 'عرض الإطلاق: تقرير تسوق مجاني بالكامل!' : 'Launch Offer: Fully Free Sourcing Report!'}
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              {isRTL 
                ? 'بمناسبة إطلاق منصة FINDORA، قمنا بإلغاء رسوم الخدمة للطلبات اليومية (Everyday Purchases) لفترة محدودة. تم فك حجب جميع العروض وتفاصيل الشراء تلقائياً بالأسفل!'
                : 'To celebrate FINDORA\'s launch, we have waived service fees for Everyday Purchases for a limited time. All merchant quotes and direct purchase details below have been fully unlocked automatically!'}
            </p>
          </div>
        ) : (
          needsPayment && (!paymentIntent || paymentIntent.status !== 'confirmed') && (
            <div className="card border border-amber-500/30 p-8 bg-gradient-to-br from-black/80 to-amber-500/5 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.05)]">
              {!paymentIntent && (
                <div className="text-center max-w-2xl mx-auto space-y-6">
                  <h2 className="text-2xl md:text-3xl font-black text-white">
                    {isRTL ? 'تأكيد العرض المتاح' : 'Confirm Proposal & Unlock Sourcing Details'}
                  </h2>
                  <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                    {isRTL 
                      ? 'يرجى مراجعة ملخص العروض ودرجات المطابقة الموضحة بالأسفل. لتفعيل تفاصيل التواصل مع البائعين وعناوينهم والروابط المباشرة لشراء المنتجات، يرجى تأكيد العرض ومتابعة الدفع.'
                      : 'Review the option highlights and match scores below. To unlock full vendor details, maps, direct store links, and locations, please confirm this proposal and proceed to payment.'}
                  </p>
                  <div className="text-3xl font-black text-amber-500 py-2">
                    <span className="text-slate-500 text-sm font-medium mr-2 block uppercase tracking-wider">{isRTL ? 'رسوم الخدمة' : 'Service Fee'}</span>
                    <ConvertedPrice amountInEgp={feeAmount} />
                  </div>
                  <form action={handleConfirmRequestProposal}>
                    <input type="hidden" name="requestId" value={id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white hover:scale-[1.02] active:scale-95 py-4 px-12 rounded-xl transition-all font-black text-base shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                      {isRTL ? 'تأكيد ومتابعة الدفع' : 'Confirm Proposal & Pay'}
                    </button>
                  </form>
                </div>
              )}

              {paymentIntent && paymentIntent.status === 'pending_customer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-black text-sm">1</span>
                      {isRTL ? 'خيارات الدفع المتاحة' : 'Available Payment Methods'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-black text-white text-base">InstaPay (إنستاباي)</span>
                          <span className="bg-amber-500/20 text-amber-400 py-1 px-3.5 rounded-full border border-amber-500/30 font-black text-xs uppercase tracking-wider">{isRTL ? 'فوري' : 'Instant'}</span>
                        </div>
                        <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-4">
                          {isRTL 
                            ? 'يرجى تحويل رسوم الخدمة إلى العنوان التالي عبر تطبيق إنستاباي الخاص بك:'
                            : 'Transfer the service fee to the address below using your InstaPay mobile application:'}
                        </p>
                        <div className="flex items-center justify-between p-3.5 bg-black/50 border border-white/5 rounded-xl font-mono text-amber-500 text-sm md:text-base font-bold">
                          <span>findora@instapay</span>
                          <button 
                            type="button"
                            onClick={() => navigator.clipboard.writeText('findora@instapay')} 
                            className="text-white/40 hover:text-amber-500 text-xs font-bold font-sans transition-colors cursor-pointer border border-white/10 px-2.5 py-1 rounded-lg hover:bg-white/5 active:scale-95 ml-2"
                          >
                            {isRTL ? 'نسخ' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-black text-sm">2</span>
                      {isRTL ? 'تأكيد عملية التحويل' : 'Confirm Transfer Receipt'}
                    </h3>
                    <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                      {isRTL 
                        ? 'بعد إتمام التحويل، يرجى رفع صورة أو لقطة شاشة لإيصال المعاملة بالأسفل لتفعيل بيانات العروض فوراً.'
                        : 'Once your transfer is complete, please upload a screenshot of the transaction receipt below to instantly activate your proposal.'}
                    </p>
                    <form action={handleUploadPaymentReceipt} className="space-y-4" encType="multipart/form-data">
                      <input type="hidden" name="paymentIntentId" value={paymentIntent.id} />
                      <input type="hidden" name="requestId" value={id} />
                      <input type="hidden" name="locale" value={locale} />
                      
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-2xl p-6 bg-black/40 transition-colors group relative cursor-pointer font-sans">
                        <input 
                          type="file" 
                          name="receipt" 
                          accept="image/*" 
                          required 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="text-center space-y-2">
                          <div className="text-4xl text-white/40 group-hover:scale-110 transition-transform">📸</div>
                          <div className="text-sm font-bold text-white/80">{isRTL ? 'اضغط هنا لاختيار الصورة' : 'Click to select image file'}</div>
                          <div className="text-[10px] text-slate-500">PNG, JPG or JPEG</div>
                        </div>
                      </div>

                      <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white w-full py-4 rounded-xl transition-all font-black text-base shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        {isRTL ? 'إرسال الإيصال وتفعيل العروض' : 'Submit Receipt & Unlock Now'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {paymentIntent && paymentIntent.status === 'submitted' && (
                <div className="text-center max-w-2xl mx-auto space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-500 text-3xl animate-bounce">⏳</div>
                  <h2 className="text-2xl font-black text-white">
                    {isRTL ? 'قيد مراجعة إيصال الدفع' : 'Receipt Under Verification'}
                  </h2>
                  <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                    {isRTL 
                      ? 'تم رفع إيصال التحويل بنجاح ويجري التحقق منه من قبل الإدارة المالية. لقد قمنا بتفعيل تفاصيل العروض بالأسفل لتستعرضها فوراً!'
                      : 'Your payment screenshot has been submitted and is currently being verified by our finance team. The sourced option details below have been unlocked for you!'}
                  </p>
                  <div className="bg-amber-500/20 border border-amber-500/30 text-amber-400 py-1.5 px-4 rounded-full font-black text-xs uppercase tracking-wider inline-flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                    {isRTL ? 'معلق للتحقق المالي' : 'Pending Verification'}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* 3. Interactive Options Tab Selector */}
      <div className="no-print flex flex-wrap gap-2.5 border-b border-white/10 pb-4">
        {snapshots.map((snap, idx) => (
          <button
            key={snap.id}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-3 rounded-2xl border text-sm font-bold transition-all duration-300 ${
              activeTab === idx
                ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:scale-105'
                : 'bg-white/[0.02] border-white/10 text-white hover:bg-white/5 hover:border-white/20'
            }`}
          >
            {getTabLabel(idx)}
          </button>
        ))}
      </div>

      {/* 4. Active Tab Details: Circular Gauge & Option Grid */}
      {activeSnapshot && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print-card bg-[hsl(220,20%,8%)] border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden">
          
          {/* Circular Score Gauge Column */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-6 pb-6 lg:pb-0 lg:border-r border-white/10">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="72" 
                  cy="72" 
                  r="50" 
                  className="stroke-white/5 fill-none" 
                  strokeWidth="8" 
                />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="50" 
                  className="stroke-amber-500 fill-none transition-all duration-1000" 
                  strokeWidth="8" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white tracking-tighter">{score}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Smart Score™</span>
              </div>
            </div>

            {/* Option Attributes Grid */}
            <div className="w-full space-y-3 px-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">{isRTL ? 'السعر المعروض:' : 'Sourced Price:'}</span>
                <span className="font-black text-amber-500 text-sm">
                  <ConvertedPrice amountInEgp={activeSnapshot.display_price_amount} />
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400 font-medium">{isRTL ? 'تقييم الثقة:' : 'Confidence Level:'}</span>
                <span className="font-bold text-white">{activeSnapshot.trust_score}% ({activeSnapshot.trust_score > 90 ? (isRTL ? 'ممتاز' : 'Premium') : (isRTL ? 'متوسط' : 'High')})</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400 font-medium">{isRTL ? 'اسم البائع:' : 'Seller Name:'}</span>
                <span className="font-bold text-white">
                  {isUnlocked ? activeSnapshot.revealedSourceText : '*** Locked ***'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400 font-medium">{isRTL ? 'مدة الضمان:' : 'Official Warranty:'}</span>
                <span className="font-bold text-white">{activeSnapshot.warranty_info}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400 font-medium">{isRTL ? 'حالة التوافر:' : 'Stock Status:'}</span>
                <span className={`font-bold uppercase ${activeSnapshot.availability_status === 'in_stock' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {activeSnapshot.availability_status === 'in_stock' ? (isRTL ? 'جاهز للتسليم' : 'In Stock') : (isRTL ? 'طلب مسبق' : 'Order on request')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400 font-medium">{isRTL ? 'سرعة التوصيل:' : 'Delivery Lead:'}</span>
                <span className="font-bold text-white">{activeSnapshot.display_specs_summary}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Why this option cards & Pros/Cons list */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Why This Option / Why Not Cheapest Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                  <span>💡</span>
                  <span>{isRTL ? 'لماذا نرشح هذا الخيار؟' : 'Why This Option?'}</span>
                </div>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">{whyThisOption}</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <span>⚠️</span>
                  <span>{isRTL ? 'لماذا ليس الخيار الأرخص؟' : 'Why Not The Cheapest?'}</span>
                </div>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">{whyNotCheapest}</p>
              </div>
            </div>

            {/* Advantages and Trade-offs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pros list */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-black text-emerald-400 tracking-wider select-none">{isRTL ? 'المميزات الإيجابية' : 'Advantages / Pros'}</h4>
                <ul className="space-y-2">
                  {pros.map((pro, i) => (
                    <li key={i} className="text-xs md:text-sm text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-400 shrink-0 select-none">✔</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cons list */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-black text-amber-500 tracking-wider select-none">{isRTL ? 'العيوب أو المخاطر' : 'Trade-offs / Weaknesses'}</h4>
                <ul className="space-y-2">
                  {cons.map((con, i) => (
                    <li key={i} className="text-xs md:text-sm text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-amber-500 shrink-0 select-none">⚠</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Direct Purchase Details (Confidential Locked overlay) */}
            <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
              {!isUnlocked ? (
                <div className="absolute inset-0 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center p-6 text-center select-none z-10">
                  <span className="text-lg">🔒</span>
                  <h5 className="font-bold text-amber-500 text-xs uppercase tracking-wider mt-1">{isRTL ? 'بيانات الشراء معتمة' : 'Direct purchase details locked'}</h5>
                  <p className="text-[10px] text-slate-400 max-w-[250px] leading-relaxed mt-1">
                    {isRTL 
                      ? 'يرجى إتمام عملية الدفع/تفعيل التقرير المجاني بالأعلى لفك حجب عنوان البائع وجهة الاتصال.' 
                      : 'Please complete payment or unlock options above to view direct store contacts.'}
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                <h4 className="text-xs uppercase font-black text-amber-500 tracking-wider select-none">{isRTL ? 'تفاصيل الاتصال والشراء المباشر' : 'Direct Merchant & Contact Details'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">🏢 {isRTL ? 'اسم المتجر:' : 'Store Name:'}</span>
                    <span className="font-bold text-white">{isUnlocked ? activeSnapshot.revealedSourceText : '*** Locked ***'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">📞 {isRTL ? 'التواصل:' : 'Contact Info:'}</span>
                    <span className="font-bold text-white">{isUnlocked ? activeSnapshot.revealedContactInfo : '*** Locked ***'}</span>
                  </div>
                </div>
                {isUnlocked && activeSnapshot.revealedSourceUrl && activeSnapshot.revealedSourceUrl !== '#' && (
                  <div className="pt-2">
                    <a 
                      href={activeSnapshot.revealedSourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-amber-500 hover:bg-amber-400 text-black text-center block w-full py-2.5 rounded-xl text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                      {isRTL ? 'زيارة الرابط المباشر للمنتج 🔗' : 'Visit Direct Purchase Link 🔗'}
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 5. PDF Export & Interactive Location Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Map View */}
        <div className="lg:col-span-2">
          <MapView snapshots={snapshots} isRTL={isRTL} />
        </div>

        {/* Print & Download Panel */}
        <div className="bg-[hsl(220,20%,8%)] border border-white/10 rounded-3xl p-6 flex flex-col justify-between items-center text-center space-y-4 no-print">
          <div>
            <span className="text-4xl">📄</span>
            <h3 className="text-lg font-bold text-white mt-3">
              {isRTL ? 'تحميل التقرير كـ PDF' : 'Download Sourcing PDF Report'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              {isRTL
                ? 'احتفظ بنسخة كاملة من هذا التقرير للرجوع إليها لاحقاً أو مشاركتها.'
                : 'Export a local offline PDF copy of this search report for future reference.'}
            </p>
          </div>
          <button 
            onClick={handlePrint}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-xs font-bold text-white tracking-wide"
          >
            {isRTL ? 'تصدير وطباعة التقرير' : 'Print / Export PDF'}
          </button>
        </div>

      </div>

      {/* 6. Customer Evaluation & Rating Form (Visible after Unlocking) */}
      {isUnlocked && (
        <div className="no-print bg-[hsl(220,20%,8%)] border border-emerald-500/20 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <h3 className="text-xl font-black text-white">
                {isRTL ? 'تقييم تجربة الشراء والتجار' : 'Purchase Experience & Merchant Feedback'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isRTL
                  ? 'ساعدنا في تحسين المنصة من خلال مشاركة تجربتك الفعلية مع التاجر الذي اخترت الشراء منه.'
                  : 'Help us improve the community by reviewing your transaction and the seller you purchased from.'}
              </p>
            </div>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault()
              if (!selectedSeller) return alert(isRTL ? 'يرجى اختيار التاجر أولاً' : 'Please select the seller')
              await submitCustomerMerchantFeedback(id, selectedSeller, rating, platformRating, feedbackComment, locale)
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Select Merchant */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">{isRTL ? 'اختر التاجر الذي اشتريت منه' : 'Select Seller Purchased From'}</label>
                <select 
                  value={selectedSeller} 
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  required
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">{isRTL ? '-- اختر بائعاً --' : '-- Choose Seller --'}</option>
                  {snapshots.map(s => (
                    <option key={s.id} value={s.revealedSourceText}>{s.revealedSourceText}</option>
                  ))}
                </select>
              </div>

              {/* Merchant Rating */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">{isRTL ? 'تقييم التزام وجودة التاجر (1-5 نجوم)' : 'Rate Seller Commitment (1-5)'}</label>
                <select 
                  value={rating} 
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="5">⭐⭐⭐⭐⭐ {isRTL ? 'ممتاز' : 'Excellent'}</option>
                  <option value="4">⭐⭐⭐⭐ {isRTL ? 'جيد جداً' : 'Very Good'}</option>
                  <option value="3">⭐⭐⭐ {isRTL ? 'مقبول' : 'Fair'}</option>
                  <option value="2">⭐⭐ {isRTL ? 'ضعيف' : 'Poor'}</option>
                  <option value="1">⭐ {isRTL ? 'سيئ للغاية' : 'Terrible'}</option>
                </select>
              </div>

              {/* Platform Service Rating */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">{isRTL ? 'تقييم تجربة التنسيق في FINDORA' : 'Rate FINDORA Service Experience'}</label>
                <select 
                  value={platformRating} 
                  onChange={(e) => setPlatformRating(Number(e.target.value))}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="5">⭐⭐⭐⭐⭐ {isRTL ? 'ممتاز' : 'Excellent'}</option>
                  <option value="4">⭐⭐⭐⭐ {isRTL ? 'جيد جداً' : 'Very Good'}</option>
                  <option value="3">⭐⭐⭐ {isRTL ? 'مقبول' : 'Fair'}</option>
                  <option value="2">⭐⭐ {isRTL ? 'ضعيف' : 'Poor'}</option>
                  <option value="1">⭐ {isRTL ? 'سيئ للغاية' : 'Terrible'}</option>
                </select>
              </div>

            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-bold">{isRTL ? 'اكتب ملاحظاتك أو أي مشاكل حدثت أثناء الشراء' : 'Write comments or any transaction feedback'}</label>
              <textarea 
                value={feedbackComment} 
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder={isRTL ? 'الالتزام بالسعر المعروض، سرعة التوصيل، التعاون...' : 'Commitment to displayed price, shipping speed, cooperation...'}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            <button 
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 px-8 text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              {isRTL ? 'إرسال التقييم وتحديث رصيد التاجر' : 'Submit Review & Update Merchant trust'}
            </button>

          </form>
        </div>
      )}

      {/* 7. Negotiation Chat Widget */}
      <div className="no-print">
        <ChatAssistantWidget reportId={id} isRTL={isRTL} initialLockedState={snapshots.some(s => s.reveal_locked)} />
      </div>

    </div>
  )
}
