'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitMarketDataAction, SubmissionPayload } from '@/app/[locale]/contributors/submit/actions'

interface SupplyClientProps {
  locale: string
  role: string
}

export default function SupplySubmissionClient({ locale, role }: SupplyClientProps) {
  const isAr = locale === 'ar'
  const router = useRouter()

  const [submissionType, setSubmissionType] = useState<SubmissionPayload['submissionType']>(
    role === 'field_scout' ? 'price_report' : role === 'store_insider' ? 'vendor_offer' : 'product_link'
  )
  const [price, setPrice] = useState('')
  const [productName, setProductName] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMode, setSuccessMode] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const payload: SubmissionPayload = {
        submissionType,
        priceReported: price ? parseFloat(price) : undefined,
        details: {
          product_name: productName,
          notes,
          has_image: true, // Mocking image upload
          source: 'web_portal'
        }
      }

      const result = await submitMarketDataAction(payload)
      
      if (result.success) {
        setSuccessMode(true)
      }
    } catch (err: any) {
      alert(err.message || 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successMode) {
    return (
      <div className="mx-auto max-w-xl text-center p-8 rounded-2xl bg-black/20 border border-[hsl(152,69%,51%,0.3)]">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-white mb-2">{isAr ? 'تم الاستلام بنجاح' : 'Submission Received'}</h2>
        <p className="text-[hsl(220,10%,60%)] mb-6">
          {isAr 
            ? 'الذكاء الاصطناعي وفريق الجودة بيراجعوا طلبك. لو اتقبل، النقاط هتنزل في محفظتك تلقائي.' 
            : 'AI and Quality Review team are processing your submission. If approved, points will be credited automatically.'}
        </p>
        <button 
          onClick={() => { setSuccessMode(false); setPrice(''); setProductName(''); setNotes('') }}
          className="rounded bg-[hsl(152,69%,51%)] px-6 py-2 font-bold text-white hover:bg-[hsl(152,69%,55%)]"
        >
          {isAr ? 'إرسال المزيد' : 'Submit Another'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-8 shadow-xl">
      <h2 className="mb-6 text-2xl font-bold text-white">
        {isAr ? 'رفع مساهمة للسوق' : 'Submit Market Data'}
      </h2>

      <div className="space-y-6">
        
        {/* Type Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">{isAr ? 'نوع المساهمة' : 'Submission Type'}</label>
          <select 
            value={submissionType}
            onChange={(e) => setSubmissionType(e.target.value as any)}
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-[hsl(258,89%,66%)]"
          >
            {(role === 'field_scout' || role === 'casual') && (
              <option value="price_report">{isAr ? 'تقرير سعر لمنتج' : 'Product Price Report'}</option>
            )}
            {(role === 'store_insider' || role === 'casual') && (
              <option value="vendor_offer">{isAr ? 'عرض حصري من معرض' : 'Exclusive Store Offer'}</option>
            )}
            <option value="product_link">{isAr ? 'رابط منتج أونلاين' : 'Online Product Link'}</option>
          </select>
        </div>

        {/* Product Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">{isAr ? 'اسم المنتج أو العرض' : 'Product or Offer Name'}</label>
          <input 
            type="text" 
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-[hsl(258,89%,66%)]"
            placeholder={isAr ? 'مثال: غسالة سامسونج 8 كيلو' : 'e.g., Samsung Washing Machine 8KG'}
          />
        </div>

        {/* Price */}
        {(submissionType === 'price_report' || submissionType === 'vendor_offer') && (
          <div>
            <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">
              {submissionType === 'vendor_offer' ? (isAr ? 'السعر بعد الخصم (ج.م)' : 'Discounted Price (EGP)') : (isAr ? 'السعر الحالي في السوق (ج.م)' : 'Current Market Price (EGP)')}
            </label>
            <input 
              type="number" 
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-[hsl(258,89%,66%)]"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Photo Upload Mock */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">{isAr ? 'إرفاق صورة (مطلوب)' : 'Upload Photo (Required)'}</label>
          <div className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-black/20 hover:border-[hsl(258,89%,66%)]">
            <span className="text-[hsl(220,10%,60%)]">{isAr ? 'اضغط لرفع صورة من الكاميرا أو المعرض' : 'Tap to upload photo from camera or gallery'}</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[hsl(220,10%,60%)]">{isAr ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-[hsl(258,89%,66%)]"
            rows={3}
            placeholder={isAr ? 'حالة المنتج، اسم المعرض، أو أي تفاصيل...' : 'Condition, store name, or any details...'}
          />
        </div>

        <button 
          type="submit"
          disabled={isSubmitting || !productName}
          className="w-full rounded-lg bg-[hsl(258,89%,66%)] py-4 font-bold text-white transition hover:bg-[hsl(258,89%,70%)] disabled:opacity-50"
        >
          {isSubmitting ? '...' : (isAr ? 'إرسال للمراجعة' : 'Submit for Review')}
        </button>

      </div>
    </form>
  )
}
