'use client'

import { useState } from 'react'
import { handleVerifyPhone } from './actions'

type Props = {
  customerId: string
  isPhoneVerified: boolean
  isFreeTrialUsed: boolean
  phoneNumber: string
  locale: string
}

export default function PhoneVerificationCard({
  customerId,
  isPhoneVerified,
  isFreeTrialUsed,
  phoneNumber,
  locale,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRTL = locale === 'ar'

  const handleVerify = async () => {
    setLoading(true)
    setError(null)
    const res = await handleVerifyPhone(customerId, locale)
    setLoading(false)
    if (res.success) {
      setSuccess(true)
    } else {
      setError(res.error || 'Verification failed')
    }
  }

  if (isFreeTrialUsed) {
    return null // Subtle/hidden if already enjoyed
  }

  return (
    <div 
      className="relative overflow-hidden mb-8 p-6 md:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 shadow-2xl transition-all duration-300 hover:border-amber-500/50"
      style={{
        boxShadow: '0 10px 30px -10px rgba(212, 166, 60, 0.15)',
      }}
    >
      {/* Decorative Glow elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-5 text-left w-full md:w-auto" style={{ textAlign: isRTL ? 'right' : 'left', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30 text-3xl animate-bounce">
            {isPhoneVerified || success ? '🎫' : '🎁'}
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-amber-400 mb-2 flex items-center gap-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {isPhoneVerified || success ? (
                isRTL ? 'العرض المجاني نشط الآن! 🎉' : 'Your Free Offer is Active! 🎉'
              ) : (
                isRTL ? 'هدية ترحيبية: أول طلب مجاني بالكامل! 🎁' : 'Welcome Gift: Your First Sourcing FREE! 🎁'
              )}
            </h3>
            <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-xl m-0">
              {isPhoneVerified || success ? (
                isRTL 
                  ? 'تهانينا! تم تأكيد رقم هاتفك بنجاح. طلبك القادم لخدمة المنتجات اليومية (Everyday Purchase) سيطبق عليه خصم 100% تلقائياً.'
                  : 'Congratulations! Your phone is verified. Your next sourcing request for Everyday Purchase will automatically have a 100% discount applied.'
              ) : (
                isRTL 
                  ? `قم بتأكيد رقم هاتفك (${phoneNumber || 'المسجل'}) لتفعيل عرض الفترة التجريبية المجانية. ستحصل على طلب شراء يومي (Everyday Purchase) مجاني بالكامل بدون أي رسوم خدمة!`
                  : `Confirm your phone number (${phoneNumber || 'registered'}) to unlock your welcome offer. Get 1 Everyday Purchase sourcing request 100% free of service fees!`
              )}
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0 flex flex-col items-center gap-2">
          {isPhoneVerified || success ? (
            <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-black text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              {isRTL ? 'مؤهل للخصم المجاني 100%' : 'Eligible for 100% Free Discount'}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="text-xs text-white/50 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                <span className="opacity-70">📱</span>
                <span className="font-mono text-white/80">{phoneNumber || '---'}</span>
              </div>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-2xl transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg disabled:opacity-50"
                style={{
                  boxShadow: '0 4px 20px rgba(212, 166, 60, 0.4)',
                }}
              >
                {loading ? (isRTL ? 'جاري التأكيد...' : 'Verifying...') : (isRTL ? 'تأكيد البيانات وتفعيل العرض ⚡' : 'Confirm Data & Activate ⚡')}
              </button>
              {error && <span className="text-xs text-rose-400 font-bold">{error}</span>}
              <span className="text-[10px] text-white/30 text-center max-w-[200px]">
                {isRTL ? "بمجرد التأكيد سيتم اعتمادك كعميل موثق" : "Upon confirmation, you will be a verified customer"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
