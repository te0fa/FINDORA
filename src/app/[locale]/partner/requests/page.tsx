import { createAdminClient } from '@/lib/dal/customers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { findOrCreateVendorNormalized } from '@/lib/dal/merchant-dedup'
import Link from 'next/link'

export const metadata = {
  title: 'Partner Portal | FINDORA',
}

export default async function PartnerRequestsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'
  const client = await createAdminClient() as any

  // 1. Fetch active customer requests in progress
  const { data: requests, error } = await client
    .from('customer_requests')
    .select('id, title, product_name, category, raw_description, preferred_governorate, preferred_area, created_at')
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })

  // Submit quote handler
  async function handleSubmitQuote(formData: FormData) {
    'use server'
    const requestId = formData.get('requestId') as string
    const merchantName = formData.get('merchantName') as string
    const phone = formData.get('phone') as string
    const price = parseFloat(formData.get('price') as string)
    const warranty = formData.get('warranty') as string
    const availability = formData.get('availability') as string
    const specs = formData.get('specs') as string

    if (!requestId || !merchantName || !phone || isNaN(price)) {
      throw new Error('Missing required fields')
    }

    const admin = await createAdminClient() as any

    // Fetch request to get details
    const { data: req } = await admin
      .from('customer_requests')
      .select('title, category')
      .eq('id', requestId)
      .single()

    // 1. Normalized anti-duplication merchant lookup/registration
    const vendor = await findOrCreateVendorNormalized(merchantName, phone)

    // 2. Insert quote into merchant_quotes
    const { error: quoteErr } = await admin
      .from('merchant_quotes')
      .insert({
        request_id: requestId,
        merchant_id: vendor.id,
        source_channel: 'other', // Matches check constraint
        product_title: req?.title || 'Partner Offer Product',
        product_specs_summary: specs || 'Fitted partner item specs',
        price_amount: price,
        warranty_info: warranty || '12 Months',
        availability_status: availability || 'in_stock',
        contact_notes: `Partner registered quote. Tel: ${phone}. Specs: ${specs || 'N/A'}`
      })

    if (quoteErr) {
      console.error('Failed to save partner quote:', quoteErr.message)
      throw new Error(quoteErr.message)
    }

    revalidatePath(`/${locale}/partner/requests`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans antialiased bg-radial-gradient">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Banner */}
        <div className="flex justify-between items-center pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {isAr ? 'بوابة شركاء التوريد FINDORA' : 'FINDORA Supply Partners Portal'}
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              {isAr 
                ? 'استعرض الطلبات النشطة للعملاء وقدم أقوى عروضك للتنافس المباشر.' 
                : 'Browse active customer requests and submit your best quotes to compete.'}
            </p>
          </div>
          <Link href={`/${locale}/dashboard`}>
            <button className="bg-white/5 border border-white/10 text-white rounded-xl px-5 py-2.5 hover:bg-white/10 transition text-xs font-bold">
              {isAr ? 'الرئيسية' : 'Main Hub'}
            </button>
          </Link>
        </div>

        {/* Requests List */}
        <div className="space-y-6">
          {(!requests || requests.length === 0) ? (
            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-slate-400 font-medium">
                {isAr ? 'لا توجد طلبات توريد نشطة حالياً.' : 'No active sourcing requests at this time.'}
              </p>
            </div>
          ) : (
            requests.map((req: any) => (
              <div 
                key={req.id} 
                className="bg-[hsl(220,20%,8%)] border border-white/10 rounded-3xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 hover:border-emerald-500/20 transition-all duration-300 shadow-xl"
              >
                
                {/* Request details (Privacy Safe: no voice note audio) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-500/20">
                      {req.category || (isAr ? 'عام' : 'General')}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-black text-white capitalize">{req.product_name || req.title}</h2>
                  
                  <p className="text-sm text-slate-400 leading-relaxed font-sans select-text">
                    {req.raw_description || (isAr ? 'لا توجد مواصفات إضافية.' : 'No extra specifications provided.')}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2 text-xs">
                      <span className="text-slate-500 mr-2">{isAr ? 'المحافظة المفضلة:' : 'Gov:'}</span>
                      <span className="font-bold text-white">{req.preferred_governorate || (isAr ? 'أي محافظة' : 'Any Gov')}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2 text-xs">
                      <span className="text-slate-500 mr-2">{isAr ? 'المنطقة:' : 'Area:'}</span>
                      <span className="font-bold text-white">{req.preferred_area || (isAr ? 'أي مكان' : 'Any Area')}</span>
                    </div>
                  </div>

                  {/* Privacy Guard Notice */}
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-4">
                    <span>🔒</span>
                    <span>
                      {isAr 
                        ? 'إنفاذ الخصوصية: تم تشفير وحجب الملفات الصوتية للعميل في هذا المنظور.' 
                        : 'Privacy enforcement: Customer audio recordings are locked and hidden in this view.'}
                    </span>
                  </div>
                </div>

                {/* Sourcing Form */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⚡</span>
                    <span>{isAr ? 'تقديم عرض توريد' : 'Submit Sourcing Quote'}</span>
                  </h3>
                  
                  <form action={handleSubmitQuote} className="space-y-4">
                    <input type="hidden" name="requestId" value={req.id} />
                    
                    <div>
                      <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'اسم المحل / التاجر' : 'Merchant Name'}</label>
                      <input 
                        type="text" 
                        name="merchantName" 
                        required 
                        placeholder={isAr ? 'مثال: العربي للتقنية' : 'e.g. El-Araby Tech'} 
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'رقم الهاتف / الواتس آب' : 'WhatsApp Number'}</label>
                      <input 
                        type="tel" 
                        name="phone" 
                        required 
                        placeholder="01xxxxxxxxx" 
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'السعر المقترح (ج.م)' : 'Proposed Price'}</label>
                        <input 
                          type="number" 
                          name="price" 
                          required 
                          placeholder="EGP" 
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'مدة الضمان' : 'Warranty'}</label>
                        <input 
                          type="text" 
                          name="warranty" 
                          placeholder={isAr ? 'مثال: سنتين' : 'e.g. 24 Months'} 
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'حالة التوافر' : 'Stock Availability'}</label>
                      <select 
                        name="availability" 
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="in_stock">{isAr ? 'متوفر حالياً' : 'In Stock'}</option>
                        <option value="limited">{isAr ? 'كمية محدودة' : 'Limited Stock'}</option>
                        <option value="preorder">{isAr ? 'طلب مسبق' : 'Pre-order'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'تفاصيل ومواصفات المنتج المعروض' : 'Product Specs'}</label>
                      <textarea 
                        name="specs" 
                        rows={2}
                        placeholder={isAr ? 'اللون، الضمان، حالة الغلاف، إلخ...' : 'Color, box status, agent warranty detail...'} 
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none resize-none"
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {isAr ? 'تأكيد وإرسال العرض' : 'Submit Sourcing Offer'}
                    </button>

                  </form>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
