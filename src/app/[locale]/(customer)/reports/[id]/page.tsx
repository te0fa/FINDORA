import { getCustomerRequestOverview, getCustomerReportSnapshots } from '@/lib/dal/reports'
import { getPaymentIntentByRequestId } from '@/lib/dal/payments'
import { handleConfirmRequestProposal, handleUploadPaymentReceipt } from './payment-actions'
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MapView from '@/components/reports/MapView'
import CurrencySwitcher from '@/components/reports/CurrencySwitcher'
import ConvertedPrice from '@/components/reports/ConvertedPrice'
import ChatAssistantWidget from '@/components/reports/ChatAssistantWidget'


export default async function CustomerReportPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string, locale: string }>,
  searchParams: Promise<{ success?: string, error?: string }>
}) {
  const { id, locale } = await params;
  const { success, error: queryError } = await searchParams;
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'
  
  // 1. Enforce Session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/reports/${id}`)}`)
  }

  // 2. Use Secure DAL (Ownership + Release Guards)
  const request = await getCustomerRequestOverview(id, user.id)

  if (!request) {
    return (
      <div className="max-w-6xl mx-auto animate-in">
        <div className="card text-center py-20">
          <p className="muted-foreground">
            {dict.common.error}: {locale === 'ar' ? 'التقرير غير متاح أو لا تملك صلاحية الوصول إليه' : 'Report is not available or you do not have permission to view it.'}
          </p>
          <Link href={`/${locale}/dashboard`} className="link mt-4 block">{dict.navigation.dashboard}</Link>
        </div>
      </div>
    )
  }

  const snapshots = await getCustomerReportSnapshots(id, user.id)

  // Find the snapshot with the highest final_score (Best Deal)
  const highestScoreSnapshot = snapshots.length > 0 
    ? snapshots.reduce((max, s) => {
        const sScore = s.final_score ?? 0
        const maxScore = max ? (max.final_score ?? 0) : -1
        return sScore > maxScore ? s : max
      }, snapshots[0])
    : null

  // 3. Fetch request pricing & payment intent details
  const { data: rawRequest } = (await supabase
    .from('requests')
    .select('service_fee_amount, payment_policy, is_business, business_metadata, rfq_document')
    .eq('id', id)
    .single()) as any


  const paymentIntent = await getPaymentIntentByRequestId(id)
  const needsPayment = rawRequest && (rawRequest.payment_policy === 'pay_after_preview' || rawRequest.payment_policy === 'upfront_deposit')
  const feeAmount = rawRequest?.service_fee_amount || 0
  const currency = 'EGP'


  return (
    <div className="max-w-6xl mx-auto animate-in px-4 pb-20" data-testid="customer-report-page">
      {/* Success/Error Banners */}
      {success === 'proposal_confirmed' && (
        <div className="alert alert-success animate-in slide-in-from-top-4 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>{isRTL ? 'تم تأكيد العرض بنجاح. يرجى إتمام عملية الدفع أدناه لتفعيل تفاصيل المصادر.' : 'Proposal confirmed successfully. Please complete the payment below to unlock source details.'}</span>
        </div>
      )}
      {success === 'receipt_uploaded' && (
        <div className="alert alert-success animate-in slide-in-from-top-4 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>{isRTL ? 'تم رفع الإيصال بنجاح. لقد تم فتح تفاصيل العروض تلقائياً!' : 'Receipt uploaded successfully. The proposal details have been auto-unlocked!'}</span>
        </div>
      )}
      {success === 'receipt_auto_confirmed' && (
        <div className="alert alert-success animate-in slide-in-from-top-4 mb-6 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>{isRTL ? 'تهانينا! تم التحقق من الدفع تلقائياً بواسطة الذكاء الاصطناعي بنجاح وتم فك حجب جميع عروض الموردين!' : 'Congratulations! Payment verified automatically by AI. Sourced seller details are fully unlocked!'}</span>
        </div>
      )}

      {queryError === 'receipt_upload_failed' && (
        <div className="alert alert-error animate-in slide-in-from-top-4 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{isRTL ? 'فشل رفع الإيصال. يرجى المحاولة مرة أخرى والتأكد من صيغة الملف.' : 'Failed to upload receipt. Please try again.'}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 pb-8 border-b border-white/10">
        <div>
          <h1 className="mb-2 text-4xl md:text-5xl font-black tracking-tight text-white">{dict.reports.title}: {request.title}</h1>
          <p className="opacity-50 text-lg font-medium">{dict.reports.generated_for} <span className="text-accent font-bold">{request.customer_name}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <CurrencySwitcher isRTL={isRTL} />
          <LanguageSwitcher currentLocale={locale as Locale} />
          <Link href={`/${locale}/dashboard`}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.75rem', margin: 0 }}>
              {dict.navigation.dashboard}
            </button>
          </Link>
        </div>
      </div>

      {/* B2B / RFQ Section */}
      {rawRequest?.is_business && (
        <div className="card glass-card border border-accent/20 p-8 mb-12 bg-white/[0.02] rounded-3xl" data-testid="b2b-rfq-card">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">💼</span>
            <div>
              <h2 className="text-2xl font-black text-white">
                {isRTL ? 'طلب شراء الشركات ومستند RFQ' : 'Corporate B2B Request & RFQ Document'}
              </h2>
              <p className="text-sm opacity-50 mt-1">
                {isRTL 
                  ? 'تم توليد هذا المستند تلقائياً بواسطة الذكاء الاصطناعي بناءً على متطلبات الشركة.'
                  : 'This document was auto-generated by AI based on company requirements.'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5">
              <span className="block text-[10px] uppercase font-black opacity-40 mb-1">{isRTL ? 'الشركة' : 'Company'}</span>
              <span className="font-bold text-white text-base">{rawRequest.business_metadata?.company_name || '-'}</span>
            </div>
            <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5">
              <span className="block text-[10px] uppercase font-black opacity-40 mb-1">{isRTL ? 'السجل التجاري / الرقم الضريبي' : 'CR / Tax ID'}</span>
              <span className="font-bold text-white text-base">
                {rawRequest.business_metadata?.cr_number || '-'} / {rawRequest.business_metadata?.tax_number || '-'}
              </span>
            </div>
            <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5">
              <span className="block text-[10px] uppercase font-black opacity-40 mb-1">{isRTL ? 'الكمية المطلوبة' : 'Required Quantity'}</span>
              <span className="font-bold text-accent text-lg">{rawRequest.business_metadata?.quantity || '1'}</span>
            </div>
          </div>

          {rawRequest.rfq_document && (
            <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
              <h4 className="text-xs font-black text-white mb-4 uppercase tracking-wider">{isRTL ? '📄 مستند طلب العروض (RFQ):' : '📄 Request for Quote (RFQ) Document:'}</h4>
              <div className="max-h-80 overflow-y-auto pr-2 text-sm text-white/70 leading-relaxed font-sans whitespace-pre-wrap select-text">
                {rawRequest.rfq_document}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Flow Widget */}
      {needsPayment && (!paymentIntent || paymentIntent.status !== 'confirmed') && (
        <div className="card glass-card border border-accent/30 p-8 mb-12 bg-gradient-to-br from-black/80 to-accent/5 rounded-3xl shadow-[0_0_50px_rgba(212,166,60,0.08)]">
          {!paymentIntent && (
            <div className="text-center max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl md:text-3xl font-black text-white">
                {isRTL ? 'تأكيد العرض المتاح' : 'Confirm Proposal & Unlock Sourcing Details'}
              </h2>
              <p className="text-white/60 leading-relaxed text-sm md:text-base">
                {isRTL 
                  ? 'يرجى مراجعة ملخص العروض ودرجات المطابقة الموضحة بالأسفل. لتفعيل تفاصيل التواصل مع البائعين وعناوينهم والروابط المباشرة لشراء المنتجات، يرجى تأكيد العرض ومتابعة الدفع.'
                  : 'Review the option highlights and match scores below. To unlock full vendor details, maps, direct store links, and locations, please confirm this proposal and proceed to payment.'}
              </p>
              <div className="text-3xl font-black text-accent py-2">
                <span className="text-white/50 text-sm font-medium mr-2 block uppercase tracking-wider">{isRTL ? 'رسوم الخدمة' : 'Service Fee'}</span>
                <ConvertedPrice amountInEgp={feeAmount} />
              </div>
              <form action={handleConfirmRequestProposal}>
                <input type="hidden" name="requestId" value={id} />
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="btn-accent hover:scale-[1.02] active:scale-95 py-4 px-12 rounded-xl transition-all font-black text-base shadow-[0_0_30px_rgba(212,166,60,0.25)]">
                  {isRTL ? 'تأكيد ومتابعة الدفع' : 'Confirm Proposal & Pay'}
                </button>
              </form>
            </div>
          )}

          {paymentIntent && paymentIntent.status === 'pending_customer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center font-black text-sm">1</span>
                  {isRTL ? 'خيارات الدفع المتاحة' : 'Available Payment Methods'}
                </h3>
                
                <div className="space-y-4">
                  {/* InstaPay Section */}
                  <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-white text-base">InstaPay (إنستاباي)</span>
                      <span className="badge badge-gold py-1 px-3.5 bg-accent/20 border-accent/30 text-accent font-black text-xs uppercase tracking-wider">{isRTL ? 'فوري' : 'Instant'}</span>
                    </div>
                    <p className="text-white/60 text-xs md:text-sm leading-relaxed mb-4">
                      {isRTL 
                        ? 'يرجى تحويل رسوم الخدمة إلى العنوان التالي عبر تطبيق إنستاباي الخاص بك:'
                        : 'Transfer the service fee to the address below using your InstaPay mobile application:'}
                    </p>
                    <div className="flex items-center justify-between p-3.5 bg-black/50 border border-white/5 rounded-xl font-mono text-accent text-sm md:text-base font-bold">
                      <span>findora@instapay</span>
                      <button 
                        type="button"
                        onClick={() => navigator.clipboard.writeText('findora@instapay')} 
                        className="text-white/40 hover:text-accent text-xs font-bold font-sans transition-colors cursor-pointer border border-white/10 px-2.5 py-1 rounded-lg hover:bg-white/5 active:scale-95 ml-2"
                      >
                        {isRTL ? 'نسخ' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* PayMob Section */}
                  <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl opacity-60">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black text-white/50 text-base">{isRTL ? 'الدفع بالبطاقة (PayMob)' : 'Card Payment (PayMob)'}</span>
                      <span className="text-[10px] text-white/30 font-black uppercase tracking-wider">{isRTL ? 'قريباً' : 'Soon'}</span>
                    </div>
                    <p className="text-white/40 text-xs">
                      {isRTL 
                        ? 'الدفع الإلكتروني المباشر عبر البطاقات الائتمانية والمحافظ الإلكترونية قيد التفعيل حالياً.'
                        : 'Direct online checkout using credit cards or digital wallets is currently being configured.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center font-black text-sm">2</span>
                  {isRTL ? 'تأكيد عملية التحويل' : 'Confirm Transfer Receipt'}
                </h3>
                <p className="text-white/60 text-xs md:text-sm leading-relaxed">
                  {isRTL 
                    ? 'بعد إتمام التحويل، يرجى رفع صورة أو لقطة شاشة لإيصال المعاملة بالأسفل لتفعيل بيانات العروض فوراً.'
                    : 'Once your transfer is complete, please upload a screenshot of the transaction receipt below to instantly activate your proposal.'}
                </p>
                <form action={handleUploadPaymentReceipt} className="space-y-4" encType="multipart/form-data">
                  <input type="hidden" name="paymentIntentId" value={paymentIntent.id} />
                  <input type="hidden" name="requestId" value={id} />
                  <input type="hidden" name="locale" value={locale} />
                  
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-accent/50 rounded-2xl p-6 bg-black/40 transition-colors group relative cursor-pointer font-sans">
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
                      <div className="text-[10px] text-white/40">PNG, JPG or JPEG</div>
                    </div>
                  </div>

                  <button type="submit" className="btn-accent w-full py-4 rounded-xl transition-all font-black text-base shadow-[0_0_30px_rgba(212,166,60,0.2)]">
                    {isRTL ? 'إرسال الإيصال وتفعيل العروض' : 'Submit Receipt & Unlock Now'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {paymentIntent && paymentIntent.status === 'submitted' && (
            <div className="text-center max-w-2xl mx-auto space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center mx-auto text-accent text-3xl animate-bounce">⏳</div>
              <h2 className="text-2xl font-black text-white">
                {isRTL ? 'قيد مراجعة إيصال الدفع' : 'Receipt Under Verification'}
              </h2>
              <p className="text-white/60 leading-relaxed text-sm md:text-base">
                {isRTL 
                  ? 'تم رفع إيصال التحويل بنجاح ويجري التحقق منه من قبل الإدارة المالية. لقد قمنا بتفعيل تفاصيل العروض بالأسفل لتستعرضها فوراً!'
                  : 'Your payment screenshot has been submitted and is currently being verified by our finance team. The sourced option details below have been unlocked for you!'}
              </p>
              <div className="badge badge-gold py-1.5 px-4 bg-accent/20 border-accent/30 text-accent font-black text-xs uppercase tracking-wider inline-flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-ping"></div>
                {isRTL ? 'معلق للتحقق المالي' : 'Pending Verification'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Location Map */}
      <div className="mb-12">
        <MapView snapshots={snapshots} isRTL={isRTL} />
      </div>

      {/* Grid of Report Option Snapshots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {snapshots.length === 0 ? (
          <div className="col-span-full card glass-card empty-state">
            <div className="empty-state-icon">🔍</div>
            <p className="empty-state-text italic">{dict.reports.no_snapshots}</p>
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <div key={snapshot.id} data-snapshot-id={snapshot.id} className={`card glass-card overflow-hidden flex flex-col transition-all duration-500 relative group ${
               snapshot.reveal_locked ? 'border-white/5 opacity-80' : 'border-white/10 hover:border-accent/40 shadow-[0_0_50px_rgba(200,151,59,0.05)]'
            }`} data-testid="report-snapshot-card">
              
              {highestScoreSnapshot && snapshot.id === highestScoreSnapshot.id && (
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-[10px] px-3 py-1 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-pulse flex flex-col items-start gap-0.5 border border-yellow-300">
                    <div className="flex items-center gap-1">
                      <span>🏆</span>
                      <span>{isRTL ? 'أفضل صفقة' : 'Best Deal'}</span>
                    </div>
                  </div>
                </div>
              )}

              {snapshot.reveal_locked ? (
                 <div className="absolute top-0 right-0 p-4 z-10">
                    <div className="bg-accent text-black p-2.5 rounded-full shadow-lg">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                 </div>
              ) : (
                <div className="absolute top-0 right-0 p-4 z-10">
                  <div className="badge badge-gold bg-accent/20 border-accent/30 py-1.5 px-3">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse mr-2 rtl:mr-0 rtl:ml-2"></div>
                    {dict.reports.revealed_badge}
                  </div>
                </div>
              )}

               <div className="relative h-48 bg-white/[0.02] overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-accent/[0.02]"></div>
                <div className="absolute inset-0 flex items-center justify-center p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                   <span className="text-9xl font-black">{snapshot.option_label?.charAt(0) || 'D'}</span>
                </div>
                {snapshot.reveal_locked && (
                  <div className="absolute inset-0 backdrop-blur-3xl bg-black/70 flex flex-col items-center justify-center p-6 text-center" data-testid="report-reveal-locked">
                    <p className="text-accent font-black mb-2 uppercase tracking-[0.2em] text-[10px]">{dict.reports.confidential_option}</p>
                    <p className="text-white/60 text-xs mb-6 max-w-[200px] leading-relaxed">
                      {dict.reports.locked_copy}
                    </p>
                    <div className="btn-accent cursor-not-allowed opacity-80 py-3 px-10 rounded-xl w-auto transition-all text-sm font-black shadow-[0_0_30px_rgba(212,166,60,0.3)]">
                      {isRTL ? 'استخدم لوحة الدفع أعلاه' : 'Use Payment Panel Above'}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 flex-grow">
                 <div className="flex justify-between items-start mb-6 gap-4">
                  <h3 className="text-2xl font-black text-white m-0 line-clamp-2 leading-tight">{snapshot.option_label}</h3>
                  <div className="text-right rtl:text-left shrink-0">
                    <div className="text-[10px] uppercase font-black text-accent tracking-[0.2em] mb-1 whitespace-nowrap">{dict.reports.match_score}</div>
                    <div className="text-3xl font-black text-white tracking-tighter">{(snapshot.final_score ?? 9.5).toFixed(1)}</div>
                  </div>
                </div>

                {/* Option Price Display */}
                {snapshot.display_price_amount !== undefined && snapshot.display_price_amount > 0 && (
                  <div className="mb-4 flex items-center justify-between bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl">
                    <span className="text-xs text-white/50 font-bold uppercase">{isRTL ? 'سعر المعاينة / العرض' : 'Option / Item Price'}</span>
                    <span className="text-sm font-black text-accent">
                      <ConvertedPrice amountInEgp={snapshot.display_price_amount} />
                    </span>
                  </div>
                )}

                 <div className="space-y-6">
                  {/* Summary Section */}
                  <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 italic text-white/60 leading-relaxed text-sm">
                    "{snapshot.reason_summary}"
                  </div>

                  {/* Revealed Data Section */}
                  {!snapshot.reveal_locked && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="p-5 bg-accent/10 rounded-2xl border border-accent/20">
                        <div className="text-[10px] uppercase font-black text-accent tracking-[0.2em] mb-3">{locale === 'ar' ? 'بيانات البائع / المصدر' : 'Seller / Source Details'}</div>
                        
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            </div>
                            <div>
                              <div className="text-[10px] text-white/40 font-bold uppercase">{locale === 'ar' ? 'اسم المتجر/البائع' : 'Store/Seller Name'}</div>
                              <div className="text-white font-bold text-sm">{snapshot.revealedSourceText}</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                            <div>
                              <div className="text-[10px] text-white/40 font-bold uppercase">{locale === 'ar' ? 'التواصل' : 'Contact'}</div>
                              <div className="text-white font-bold text-sm">{snapshot.revealedContactInfo}</div>
                            </div>
                          </div>

                          {snapshot.revealedSourceUrl && snapshot.revealedSourceUrl !== '#' && (
                            <div className="pt-2">
                              <a 
                                href={snapshot.revealedSourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-black rounded-xl text-xs font-black hover:scale-[1.02] transition-transform"
                              >
                                <span>{locale === 'ar' ? 'زيارة الرابط المباشر' : 'Visit Direct Link'}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Sourcing Negotiation Assistant Widget */}
      <ChatAssistantWidget reportId={id} isRTL={isRTL} initialLockedState={snapshots.some(s => s.reveal_locked)} />
    </div>
  )
}
