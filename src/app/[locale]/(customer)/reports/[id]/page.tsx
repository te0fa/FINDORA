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
import PremiumReportClient from './PremiumReportClient'


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

      <PremiumReportClient 
        id={id}
        locale={locale}
        dict={dict}
        isRTL={isRTL}
        snapshots={snapshots}
        needsPayment={needsPayment}
        paymentIntent={paymentIntent}
        feeAmount={feeAmount}
        handleConfirmRequestProposal={handleConfirmRequestProposal}
        handleUploadPaymentReceipt={handleUploadPaymentReceipt}
      />
    </div>
  )
}
